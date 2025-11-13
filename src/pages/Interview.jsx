// src/pages/Interview.jsx
import { useEffect, useState } from "react";
import { useSTT } from "../hooks/useSTT";
import { supabase } from "../lib/supabaseClient";

export default function Interview({ interviewId }) {
  const { supported, listening, transcript, start, stop } = useSTT();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(()=>{ if (transcript) setText(transcript); }, [transcript]);

  // Beim Laden initiale Frage abholen (falls noch keine)
  useEffect(() => {
    (async () => {
      setBusy(true);
      const res = await fetch("/functions/v1/interview-answer", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interviewId }) // keine answer → kickoff
      });
      const data = await res.json();
      setMessages(m=>[...m, { role:"interviewer", text: data.interviewer ?? "Los geht's: Erzählen Sie kurz über ein relevantes Projekt." }]);
      setBusy(false);
    })();
  }, [interviewId]);

  async function send() {
    if (!text.trim()) return;
    setMessages(m=>[...m, { role:"candidate", text }]);
    setText(""); setBusy(true);

    const res = await fetch("/functions/v1/interview-answer", {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ interviewId, answer: text })
    });
    const data = await res.json();
    setMessages(m=>[...m, { role:"interviewer", text: data.interviewer ?? "Danke. Nächste Frage…" }]);
    setBusy(false);
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Interview</h2>
        {supported && (
          <button onClick={listening ? stop : start} className={`px-3 py-1.5 rounded ${listening ? 'bg-red-600 text-white':'bg-black text-white'}`}>
            {listening ? "Stop" : "🎙️ Speak"}
          </button>
        )}
      </div>

      <div className="space-y-3">
        {messages.map((m,i)=>(
          <div key={i} className={m.role==='interviewer'?'text-left':'text-right'}>
            <div className={`inline-block px-3 py-2 rounded-xl ${m.role==='interviewer'?'bg-zinc-800':'bg-amber-500 text-black'}`}>
              {m.text}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input className="flex-1 border rounded px-3 py-2" value={text} onChange={e=>setText(e.target.value)} placeholder="Antwort eintippen…" disabled={busy}/>
        <button className="px-3 py-2 rounded bg-black text-white disabled:opacity-50" disabled={busy} onClick={send}>Senden</button>
      </div>
    </div>
  );
}
