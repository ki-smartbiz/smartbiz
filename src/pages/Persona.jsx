// src/pages/Persona.jsx
import { useState } from "react";

export default function Persona({ onNext, onBack }) {
  const [persona, setPersona] = useState("friendly"); // friendly | neutral | beast

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Bewerbungstrainer – Persona wählen</h1>

      <div className="space-y-2">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="persona"
            value="friendly"
            checked={persona === "friendly"}
            onChange={() => setPersona("friendly")}
          />
          <span>Der Humane (freundlich, unterstützend)</span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="persona"
            value="neutral"
            checked={persona === "neutral"}
            onChange={() => setPersona("neutral")}
          />
          <span>Der Sachliche (präzise, fachlich)</span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="persona"
            value="beast"
            checked={persona === "beast"}
            onChange={() => setPersona("beast")}
          />
          <span>Beast Mode (direkt, konfrontativ)</span>
        </label>
      </div>

      <div className="flex gap-2">
        <button className="px-4 py-2 rounded border" onClick={onBack}>← Zurück</button>
        <button
          className="px-4 py-2 rounded border"
          onClick={() => onNext?.({ persona })}
        >
          Weiter
        </button>
      </div>
    </div>
  );
}

