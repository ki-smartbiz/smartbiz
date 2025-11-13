// src/pages/Upload.jsx
import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Upload({ onDone }) {
  const [jdText, setJdText] = useState("");
  const [cvText, setCvText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Ein Bucket "uploads" reicht; wir legen Unterordner jd/ und cv/ an.
  const BUCKET = "uploads";

  async function save(kind, text) {
    // kind: "jd" | "cv"
    const trimmed = (text || "").trim();
    if (!trimmed) throw new Error("Text fehlt.");

    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) throw new Error("Keine Session. Bitte einloggen.");

    const storagePath = `${kind}/${userId}-${Date.now()}.txt`;

    // Text als Blob in Storage laden
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, new Blob([trimmed], { type: "text/plain" }), {
        cacheControl: "3600",
        upsert: true,
        contentType: "text/plain",
      });

    if (upErr) throw upErr;

    // Metadaten + Klartext in die Tabelle "uploads"
    // Spalten: id (uuid), user_id (uuid), type (text), storage_path (text), text_extracted (text), created_at (timestamptz)
    const { data, error } = await supabase
      .from("uploads")
      .insert({
        user_id: userId,
        type: kind,
        storage_path: storagePath,
        text_extracted: trimmed,
      })
      .select("id")
      .single();

    if (error) throw error;
    return data.id;
  }

  async function handleSubmit() {
    setErr("");
    if (!jdText.trim() || !cvText.trim()) {
      setErr("Bitte beide Felder ausfüllen.");
      return;
    }
    setBusy(true);
    try {
      const [jdId, cvId] = await Promise.all([save("jd", jdText), save("cv", cvText)]);
      if (jdId && cvId) onDone?.({ jdId, cvId });
    } catch (e) {
      setErr(e?.message || "Upload fehlgeschlagen.");
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
          className="w-full h-40 border rounded p-2 bg-[#0f0f0f] border-[#2a2a2a] text-neutral-100"
          value={jdText}
          onChange={(e) => setJdText(e.target.value)}
          placeholder="Füge hier die JD (Stellenbeschreibung) ein …"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Lebenslauf (Text einfügen)
        </label>
        <textarea
          className="w-full h-40 border rounded p-2 bg-[#0f0f0f] border-[#2a2a2a] text-neutral-100"
          value={cvText}
          onChange={(e) => setCvText(e.target.value)}
          placeholder="Füge hier deinen CV (Lebenslauf) ein …"
        />
      </div>

      {err && <div className="text-sm text-rose-400">{err}</div>}

      <button
        disabled={busy || !jdText.trim() || !cvText.trim()}
        onClick={handleSubmit}
        className="px-4 py-2 rounded-2xl text-sm font-semibold border border-[#d1a45f] text-[#d1a45f] hover:bg-[#d1a45f] hover:text-black disabled:opacity-50"
      >
        {busy ? "Speichere …" : "Weiter"}
      </button>

      <p className="text-xs text-neutral-500">
        Hinweis: Der Text wird im Bucket <code>{BUCKET}</code> gespeichert
        (Unterordner <code>jd/</code> und <code>cv/</code>) und in der Tabelle <code>uploads</code> verknüpft.
      </p>
    </div>
  );
}
