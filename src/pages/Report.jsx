// src/pages/Report.jsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { askAI } from "../lib/ai";
import { buildSystemPrompt } from "../lib/personaPrompts";

export default function Report({ interviewId }) {
  const [loading, setLoading] = useState(true);
  const [persona, setPersona] = useState(null);
  const [summary, setSummary] = useState("");
  const [strengths, setStrengths] = useState([]);
  const [risks, setRisks] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!interviewId) {
      setError("Kein Interview gefunden.");
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      setError("");

      try {
        // 1) Interview holen (Persona etc.)
        const { data: interview, error: ie } = await supabase
          .from("interviews")
          .select("id, persona")
          .eq("id", interviewId)
          .single();

        if (ie) throw ie;
        if (!interview) throw new Error("Interview nicht gefunden.");

        const personaKey = interview.persona || "friendly";
        setPersona(personaKey);

        // 2) Alle Turns holen
        const { data: turns, error: te } = await supabase
          .from("interview_turns")
          .select("role, content, created_at")
          .eq("interview_id", interviewId)
          .order("created_at", { ascending: true });

        if (te) throw te;
        if (!turns || !turns.length) {
          throw new Error("Für dieses Interview wurden keine Antworten gefunden.");
        }

        // Transcript für die KI bauen
        const transcript = turns.map((t) => ({
          role: t.role,
          text: t.content,
        }));

        // 3) Analyse via KI
        const sys = buildSystemPrompt(personaKey);
        const userPayload = {
          instruction:
            "Du bist ein erfahrener Interview-Coach. " +
            "Analysiere das folgende Transkript eines Bewerbungsgesprächs. " +
            "Gib NUR folgendes JSON zurück:\n" +
            '{ "summary": string, "strengths": string[], "risks": string[], "recommendations": string[] }.\n' +
            "Keine Erklärungen außerhalb dieses JSON.",
          transcript,
        };

        const out = await askAI({
          system: sys,
          user: JSON.stringify(userPayload),
          json: true,
        });

        setSummary(
          (typeof out?.summary === "string" && out.summary.trim()) ||
            "Keine Zusammenfassung generiert."
        );
        setStrengths(Array.isArray(out?.strengths) ? out.strengths : []);
        setRisks(Array.isArray(out?.risks) ? out.risks : []);
        setRecommendations(
          Array.isArray(out?.recommendations) ? out.recommendations : []
        );
      } catch (e) {
        console.error(e);
        setError(e.message || "Analyse für den Report fehlgeschlagen.");
      } finally {
        setLoading(false);
      }
    })();
  }, [interviewId]);

  if (loading) {
    return <div className="max-w-3xl mx-auto p-6">Report wird erstellt…</div>;
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-3">
        <h1 className="text-2xl font-bold">Interview-Report</h1>
        <p className="text-rose-400 text-sm">{error}</p>
        <p className="text-neutral-400 text-sm">
          Tipp: Prüfe, ob Interview-Turns gespeichert wurden und der Proxy noch
          funktioniert.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Interview-Report</h1>
        {persona && (
          <p className="text-sm text-neutral-400 mt-1">
            Persona: <span className="font-medium">{persona}</span>
          </p>
        )}
      </div>

      {/* Zusammenfassung */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Kurz-Zusammenfassung</h2>
        <p className="text-sm text-neutral-200 leading-relaxed">
          {summary}
        </p>
      </section>

      {/* Stärken */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Stärken im Gespräch</h2>
        {strengths.length ? (
          <ul className="list-disc list-inside text-sm text-emerald-200 space-y-1">
            {strengths.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-neutral-400">Keine besonderen Stärken erkannt.</p>
        )}
      </section>

      {/* Risiken / Blind Spots */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Risiken & Fragezeichen</h2>
        {risks.length ? (
          <ul className="list-disc list-inside text-sm text-amber-200 space-y-1">
            {risks.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-neutral-400">
            Keine größeren Risiken identifiziert – oder das Interview war zu kurz.
          </p>
        )}
      </section>

      {/* Konkrete Empfehlungen */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Konkrete Verbesserungs-Impulse</h2>
        {recommendations.length ? (
          <ol className="list-decimal list-inside text-sm text-neutral-200 space-y-1">
            {recommendations.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-neutral-400">
            Keine spezifischen Empfehlungen generiert.
          </p>
        )}
      </section>
    </div>
  );
}
