// src/pages/Interview.jsx
import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { askAI } from "../lib/ai";
import { buildSystemPrompt } from "../lib/personaPrompts";

export default function Interview({ persona = "friendly", jdId, cvId, onBack, onDone }) {
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [step, setStep] = useState(0);
  const [answer, setAnswer] = useState("");
  const [log, setLog] = useState([]); // {role:'interviewer'|'candidate', text}
  const [error, setError] = useState("");

  // Speech-to-Text (Browser Web Speech API)
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  // supabase Interview-ID
  const interviewIdRef = useRef(null);

  // ---- Interview initialisieren: JD/CV laden -> initiale Fragen generieren ----
  useEffect(() => {
    (async () => {
      setError("");
      try {
        const { data: session } = await supabase.auth.getUser();
        const uid = session?.user?.id;
        if (!uid) throw new Error("Keine Session");

        // JD/CV Text aus uploads holen
        const fetchTxt = async (id) => {
          const { data, error } = await supabase.from("uploads").select("*").eq("id", id).single();
          if (error) throw error;
          return data?.text_extracted || "";
        };
        const jdText = jdId ? await fetchTxt(jdId) : "";
        const cvText = cvId ? await fetchTxt(cvId) : "";

        // Interview-Row anlegen (für Logging)
        {
          const { data, error } = await supabase
            .from("interviews")
            .insert({ user_id: uid, jd_id: jdId || null, cv_id: cvId || null, persona })
            .select("id")
            .single();
          if (error) throw error;
          interviewIdRef.current = data.id;
        }

        // Initiale Fragen generieren
        const sys = buildSystemPrompt(persona);
        const user = JSON.stringify({
          instruction:
            "Erzeuge 3 präzise, jobrelevante Interviewfragen als JSON. Nur Nummernfragen, keine Floskeln.",
          jd: jdText.slice(0, 4000),
          cv: cvText.slice(0, 4000),
        });
        const out = await askAI({ system: sys, user });

        const qs = Array.isArray(out.questions) ? out.questions.filter(Boolean) : [];
        if (!qs.length) throw new Error("Konnte keine Fragen generieren.");
        setQuestions(qs);
        setLog((prev) => [...prev, { role: "interviewer", text: qs[0] }]);

        // ersten Turn speichern
        await saveTurn({ role: "interviewer", text: qs[0] });
      } catch (e) {
        console.error(e);
        setError(e.message || "Interview-Start fehlgeschlagen.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Turn speichern ----
  async function saveTurn({ role, text }) {
    const iid = interviewIdRef.current;
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

  // ---- Antwort abschicken -> Follow-Up Frage erzeugen oder weiter zur nächsten Frage ----
  async function submitAnswer() {
    if (!answer.trim()) return;
    const a = answer.trim();
    setAnswer("");

    // Antwort loggen
    setLog((prev) => [...prev, { role: "candidate", text: a }]);
    await saveTurn({ role: "candidate", text: a });

    // Follow-Up / nächste Frage
    const currQ = questions[step];
    const sys = buildSystemPrompt(persona);
    const user = JSON.stringify({
      instruction:
        "Analysiere die Frage & Antwort. Wenn die Antwort vage ist, stelle genau EINE Follow-Up-Frage. " +
        "Wenn sie präzise ist, gib 'ok' (string) zurück.",
      question: currQ,
      answer: a,
    });

    try {
      const out = await askAI({ system: sys, user, json: true });

      if (typeof out === "string" && out.toLowerCase() === "ok") {
        // nächste initiale Frage
        if (step + 1 < questions.length) {
          const nextStep = step + 1;
          setStep(nextStep);
          setLog((prev) => [...prev, { role: "interviewer", text: questions[nextStep] }]);
          await saveTurn({ role: "interviewer", text: questions[nextStep] });
        } else {
          // Interview beenden: Summary erzeugen
          await finishInterview();
        }
      } else if (out && out.followup) {
        // Follow-Up stellen
        setLog((prev) => [...prev, { role: "interviewer", text: out.followup }]);
        await saveTurn({ role: "interviewer", text: out.followup });
      } else {
        // Fallback: weiter
        if (step + 1 < questions.length) {
          const nextStep = step + 1;
          setStep(nextStep);
          setLog((prev) => [...prev, { role: "interviewer", text: questions[nextStep] }]);
          await saveTurn({ role: "interviewer", text: questions[nextStep] });
        } else {
          await finishInterview();
        }
      }
    } catch (e) {
      console.error(e);
      setError(e.message || "Follow-Up fehlgeschlagen");
    }
  }

  async function finishInterview() {
    try {
      const sys = buildSystemPrompt(persona);
      const user = JSON.stringify({
        instruction:
          "Erzeuge eine kurze, prägnante Zusammenfassung des Interviews (Stärken, Risiken, nächster Schritt). " +
          "JSON: { summary: string }",
        transcript: log,
      });
      const out = await askAI({ system: sys, user, json: true });

      // Interview abschließen
      const iid = interviewIdRef.current;
      if (iid) await supabase.from("interviews").update({ completed: true }).eq("id", iid);

      onDone?.({ summary: out?.summary || "Interview abgeschlossen." });
    } catch (e) {
      console.error(e);
      onDone?.({ summary: "Interview abgeschlossen (ohne KI-Summary)." });
    }
  }

  // ---- Speech-to-Text Setup ----
  function ensureRecognition() {
    if (recognitionRef.current) return recognitionRef.current;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;
    const rec = new SR();
    rec.lang = "de-DE";         // anpassen
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
    if (!rec) { alert("Speech-to-Text wird von deinem Browser nicht unterstützt."); return; }
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
      <h1 className="text-2xl font-bold">Interview ({persona})</h1>

      {error && <div className="text-rose-400 text-sm">{error}</div>}

      <div className="rounded border p-4 bg-[#0f0f0f] border-[#2a2a2a] space-y-2">
        <div className="text-sm text-neutral-400">Verlauf</div>
        <div className="space-y-2 max-h-80 overflow-auto pr-2">
          {log.map((t, i) => (
            <div key={i} className={t.role === "interviewer" ? "text-amber-300" : "text-neutral-100"}>
              <strong>{t.role === "interviewer" ? "Interviewer:" : "Du:"}</strong> {t.text}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <textarea
          className="w-full h-28 border rounded p-2 bg-[#0f0f0f] border-[#2a2a2a] text-neutral-100"
          placeholder="Deine Antwort… (oder Mikrofonsymbol nutzen)"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
        />
        <div className="flex gap-2">
          {!listening ? (
            <button className="px-3 py-2 rounded border" onClick={startListening}>🎤 Start</button>
          ) : (
            <button className="px-3 py-2 rounded border" onClick={stopListening}>⏹ Stop</button>
          )}
          <button className="px-4 py-2 rounded border" onClick={submitAnswer}>Antwort senden</button>
          <button className="px-4 py-2 rounded border" onClick={onBack}>← Zurück</button>
        </div>
      </div>
    </div>
  );
}
