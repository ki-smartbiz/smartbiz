// src/pages/Interview.jsx
import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { askAI } from "../lib/ai";
import { buildSystemPrompt } from "../lib/personaPrompts";

// Erwartung:
// - App.jsx legt das Interview an und übergibt interviewId
// - interviews: id, user_id, persona, jd_upload, cv_upload, completed
export default function Interview({ interviewId, onBack, onDone }) {
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [step, setStep] = useState(0);
  const [answer, setAnswer] = useState("");
  const [log, setLog] = useState([]); // {role: 'interviewer' | 'candidate', text}
  const [error, setError] = useState("");

  const [persona, setPersona] = useState("friendly");

  // Speech-to-Text
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  // Text-to-Speech
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);

  const interviewIdRef = useRef(interviewId);

  /* ====== TTS Support check ====== */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const supported =
      "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
    setVoiceSupported(supported);
  }, []);

  /* ====== Interview + Uploads laden & Fragen generieren ====== */
  useEffect(() => {
    if (!interviewId) {
      setError("Kein Interview gefunden.");
      setLoading(false);
      return;
    }

    interviewIdRef.current = interviewId;

    (async () => {
      setError("");
      setLoading(true);
      try {
        // 1) Interview holen
        const { data: interview, error: ie } = await supabase
          .from("interviews")
          .select("id, persona, jd_upload, cv_upload")
          .eq("id", interviewId)
          .single();
        if (ie) throw ie;
        if (!interview) throw new Error("Interview nicht gefunden.");

        const personaKey = interview.persona || "friendly";
        setPersona(personaKey);

        // 2) Upload-Texte holen
        const fetchTxt = async (id) => {
          if (!id) return "";
          const { data, error } = await supabase
            .from("uploads")
            .select("text_extracted")
            .eq("id", id)
            .single();
          if (error) throw error;
          return data?.text_extracted || "";
        };

        const jdText = await fetchTxt(interview.jd_upload);
        const cvText = await fetchTxt(interview.cv_upload);

        // 3) Fragen via KI generieren – JSON erzwingen
        const sys = buildSystemPrompt(personaKey);
        const userPayload = {
          instruction:
            'Erzeuge genau 3 präzise, jobrelevante Interviewfragen. Antworte NUR mit JSON im Format {"questions":["Frage 1","Frage 2","Frage 3"]}. Keine Erklärungen, kein Text außerhalb dieses JSON.',
          jd: jdText.slice(0, 4000),
          cv: cvText.slice(0, 4000),
        };

        const out = await askAI({
          system: sys,
          user: JSON.stringify(userPayload),
          json: true,
        });

        let rawList = [];
        if (Array.isArray(out)) rawList = out;
        else if (Array.isArray(out?.questions)) rawList = out.questions;
        else if (typeof out?.questions === "string")
          rawList = [out.questions];

        const qs = rawList
          .map((q) => (q != null ? String(q).trim() : ""))
          .filter(Boolean);

        if (!qs.length) {
          console.warn("KI-Antwort für Fragen:", out);
          throw new Error("Konnte keine Fragen generieren (leere Antwort).");
        }

        setQuestions(qs);
        setLog([{ role: "interviewer", text: qs[0] }]);
        await saveTurn({
          interviewId: interview.id,
          role: "interviewer",
          text: qs[0],
        });
      } catch (e) {
        console.error(e);
        setError(e.message || "Interview-Start fehlgeschlagen.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interviewId]);

  /* ====== Turn speichern ====== */
  async function saveTurn({ interviewId, role, text }) {
    const iid = interviewId ?? interviewIdRef.current;
    if (!iid) return;
    try {
      await supabase.from("interview_turns").insert({
        interview_id: iid,
        role,
        content: text,
      });
    } catch (e) {
      console.warn("Turn speichern fehlgeschlagen:", e.message);
    }
  }

  /* ====== TTS ====== */
  function speak(text) {
    if (!voiceSupported || !text || typeof window === "undefined") return;
    try {
      const synth = window.speechSynthesis;
      if (!synth) return;
      synth.cancel();

      const u = new window.SpeechSynthesisUtterance(text);
      u.lang = "de-DE";
      u.rate = 1.0;
      u.pitch = 1.0;

      if (persona === "beast") {
        u.rate = 1.1;
        u.pitch = 0.9;
      } else if (persona === "friendly") {
        u.rate = 0.95;
        u.pitch = 1.05;
      }

      synth.speak(u);
    } catch (e) {
      console.warn("TTS Fehler:", e);
    }
  }

  useEffect(() => {
    if (!autoSpeak || !voiceSupported || !log.length) return;
    const last = log[log.length - 1];
    if (last.role === "interviewer") speak(last.text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [log, autoSpeak, voiceSupported]);

  const currentQuestion =
    log.length && log[log.length - 1].role === "interviewer"
      ? log[log.length - 1].text
      : questions[step] || "";

  /* ====== Antwort abschicken ====== */
  async function submitAnswer() {
    if (!answer.trim()) return;
    const a = answer.trim();
    setAnswer("");

    setLog((prev) => [...prev, { role: "candidate", text: a }]);
    await saveTurn({
      role: "candidate",
      text: a,
    });

    const currQ = questions[step];
    const sys = buildSystemPrompt(persona);
    const user = JSON.stringify({
      instruction:
        'Analysiere Frage & Antwort. Wenn die Antwort vage ist, stelle genau EINE Follow-Up-Frage. Wenn sie präzise ist, antworte mit JSON {"ok": true}.',
      question: currQ,
      answer: a,
    });

    try {
      const out = await askAI({ system: sys, user, json: true });

      if (out && out.ok) {
        // nächste Frage
        if (step + 1 < questions.length) {
          const nextStep = step + 1;
          setStep(nextStep);
          const nextQ = questions[nextStep];
          setLog((prev) => [...prev, { role: "interviewer", text: nextQ }]);
          await saveTurn({ role: "interviewer", text: nextQ });
        } else {
          await finishInterview();
        }
      } else if (out && out.followup) {
        setLog((prev) => [
          ...prev,
          { role: "interviewer", text: out.followup },
        ]);
        await saveTurn({ role: "interviewer", text: out.followup });
      } else {
        // Fallback: nächste Frage
        if (step + 1 < questions.length) {
          const nextStep = step + 1;
          setStep(nextStep);
          const nextQ = questions[nextStep];
          setLog((prev) => [...prev, { role: "interviewer", text: nextQ }]);
          await saveTurn({ role: "interviewer", text: nextQ });
        } else {
          await finishInterview();
        }
      }
    } catch (e) {
      console.error(e);
      setError(e.message || "Follow-Up fehlgeschlagen");
    }
  }

  /* ====== Interview beenden ====== */
  async function finishInterview() {
    try {
      const sys = buildSystemPrompt(persona);
      const user = JSON.stringify({
        instruction:
          'Erzeuge eine kurze, prägnante Zusammenfassung des Interviews (Stärken, Risiken, nächster Schritt). Antworte als JSON {"summary": "..."}',
        transcript: log,
      });
      const out = await askAI({ system: sys, user, json: true });

      const iid = interviewIdRef.current;
      if (iid) {
        await supabase
          .from("interviews")
          .update({ completed: true })
          .eq("id", iid);
      }

      onDone?.({ summary: out?.summary || "Interview abgeschlossen." });
    } catch (e) {
      console.error(e);
      onDone?.({ summary: "Interview abgeschlossen (ohne KI-Summary)." });
    }
  }

  /* ====== Speech-to-Text ====== */
  function ensureRecognition() {
    if (recognitionRef.current) return recognitionRef.current;
    if (typeof window === "undefined") return null;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;

    const rec = new SR();
    rec.lang = "de-DE";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const txt = e.results?.[0]?.[0]?.transcript || "";
      if (txt) setAnswer((prev) => (prev ? prev + " " + txt : txt));
    };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    return rec;
  }

  function startListening() {
    const rec = ensureRecognition();
    if (!rec) {
      alert("Speech-to-Text wird von deinem Browser nicht unterstützt.");
      return;
    }
    setListening(true);
    rec.start();
  }

  function stopListening() {
    const rec = recognitionRef.current;
    if (rec) rec.stop();
  }

  if (loading) {
    return <div className="max-w-3xl mx-auto p-6">Lade Interview…</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">
          Interview ({persona || "—"})
        </h1>
        <button className="px-3 py-1.5 rounded border text-sm" onClick={onBack}>
          ← Zurück
        </button>
      </div>

      {error && <div className="text-rose-400 text-sm">{error}</div>}

      {/* Verlauf */}
      <div className="rounded border p-4 bg-[#0f0f0f] border-[#2a2a2a] space-y-2">
        <div className="flex items-center justify-between text-sm text-neutral-400">
          <span>Verlauf</span>
          {voiceSupported ? (
            <label className="inline-flex items-center gap-1 cursor-pointer text-xs">
              <input
                type="checkbox"
                className="accent-amber-400"
                checked={autoSpeak}
                onChange={(e) => setAutoSpeak(e.target.checked)}
              />
              <span>Fragen automatisch vorlesen</span>
            </label>
          ) : (
            <span className="text-xs text-neutral-500">
              Sprachausgabe wird von deinem Browser nicht unterstützt.
            </span>
          )}
        </div>

        <div className="space-y-2 max-h-80 overflow-auto pr-2">
          {log.map((t, i) => (
            <div
              key={i}
              className={
                t.role === "interviewer" ? "text-amber-300" : "text-neutral-100"
              }
            >
              <strong>{t.role === "interviewer" ? "Interviewer:" : "Du:"}</strong>{" "}
              {t.text}
            </div>
          ))}
        </div>
      </div>

      {/* Aktuelle Frage */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-neutral-400">Aktuelle Frage:</span>
        <span className="text-neutral-100 line-clamp-2">
          {currentQuestion || "—"}
        </span>
        {voiceSupported && currentQuestion && (
          <button
            type="button"
            className="ml-auto px-3 py-1.5 rounded border text-xs"
            onClick={() => speak(currentQuestion)}
          >
            🔊 Frage vorlesen
          </button>
        )}
      </div>

      {/* Antwortfeld */}
      <div className="space-y-2">
        <textarea
          className="w-full h-28 border rounded p-2 bg-[#0f0f0f] border-[#2a2a2a] text-neutral-100"
          placeholder="Deine Antwort… (oder Mikrofonsymbol nutzen)"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          {!listening ? (
            <button
              className="px-3 py-2 rounded border"
              type="button"
              onClick={startListening}
            >
              🎤 Start
            </button>
          ) : (
            <button
              className="px-3 py-2 rounded border"
              type="button"
              onClick={stopListening}
            >
              ⏹ Stop
            </button>
          )}
          <button
            className="px-4 py-2 rounded border"
            type="button"
            onClick={submitAnswer}
          >
            Antwort senden
          </button>
        </div>
      </div>
    </div>
  );
}
