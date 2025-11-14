// src/pages/Upload.jsx
import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Upload({ onDone }) {
  const [jdText, setJdText] = useState("");
  const [cvText, setCvText] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(type, text) {
    const { data: u } = await supabase.auth.getUser();
    const userId = u?.user?.id;
    if (!userId) throw new Error("No session");

    // KEIN Storage, wir speichern nur in der uploads-Tabelle
    const { data, error } = await supabase
      .from("uploads")
      .insert({
        user_id: userId,
        type,
        storage_path: null,        // optional, falls Spalte existiert
        text_extracted: text,
      })
      .select("*")
      .single();

    if (error) throw error;
    return data.id;
  }

  async function handleSubmit() {
    try {
      setBusy(true);
      const jdId = await save("jd", jdText);
      const cvId = await save("cv", cvText);
      onDone({ jdId, cvId });
    } catch (e) {
      console.error(e);
      alert(e.message || "Upload fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Bewerbungstrainer – Upload</h1>

      <div>
        <label className="block text-sm font-medium mb-1">
          Stellenbeschreibung (Text einfügen)
        </label>
        <textarea
          className="w-full h-40 border rounded p-2"
          value={jdText}
          onChange={(e) => setJdText(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Lebenslauf (Text einfügen)
        </label>
        <textarea
          className="w-full h-40 border rounded p-2"
          value={cvText}
          onChange={(e) => setCvText(e.target.value)}
        />
      </div>

      <button
        disabled={busy || !jdText || !cvText}
        onClick={handleSubmit}
        className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
      >
        {busy ? "Speichere…" : "Weiter"}
      </button>
    </div>
  );
}
