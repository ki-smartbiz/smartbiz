// src/pages/Persona.jsx
import { useState, useEffect } from "react";

const PERSONAS = [
  {
    id: "humane",
    label: "Der Humane (freundlich, unterstützend)",
    description: "Stellt sanfte, motivierende Fragen und gibt dir Raum, dich zu sortieren.",
  },
  {
    id: "sachlich",
    label: "Der Sachliche (präzise, fachlich)",
    description: "Konzentriert sich auf Klarheit, Fakten und Struktur in deinen Antworten.",
  },
  {
    id: "beast",
    label: "Beast Mode (direkt, konfrontativ)",
    description: "Sehr direkt, bohrt nach, stellt unangenehme Fragen – wie im echten Stress-Interview.",
  },
];

export default function Persona({ onBack, onNext, initialPersona }) {
  const [selected, setSelected] = useState(initialPersona || "sachlich");

  useEffect(() => {
    if (initialPersona) setSelected(initialPersona);
  }, [initialPersona]);

  const handleContinue = () => {
    if (!selected) return;
    // ganz wichtig: hier wird an App.jsx zurückgemeldet
    onNext?.(selected);
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl md:text-4xl font-bold">
        Bewerbungstrainer – Persona wählen
      </h1>

      <div className="space-y-4">
        {PERSONAS.map((p) => (
          <label
            key={p.id}
            className="flex items-start gap-3 cursor-pointer rounded-xl border border-[#333] px-4 py-3 hover:border-[#555]"
          >
            <input
              type="radio"
              name="persona"
              className="mt-1"
              checked={selected === p.id}
              onChange={() => setSelected(p.id)}
            />
            <div>
              <div className="font-medium text-lg">{p.label}</div>
              <div className="text-sm text-neutral-400 mt-1">{p.description}</div>
            </div>
          </label>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 rounded-2xl border border-gray-500 text-sm"
        >
          ← Zurück
        </button>
        <button
          type="button"
          disabled={!selected}
          onClick={handleContinue}
          className="px-4 py-2 rounded-2xl text-sm font-semibold bg-[#d1a45f] text-black disabled:opacity-60"
        >
          Weiter
        </button>
      </div>
    </div>
  );
}
