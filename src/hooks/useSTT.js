// src/hooks/useSTT.js
import { useEffect, useRef, useState } from "react";

export function useSTT(lang = "de-DE") {
  const ref = useRef(null);
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");

  useEffect(() => {
    const SR = window.webkitSpeechRecognition || window.SpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = lang; rec.interimResults = true; rec.continuous = false;
    rec.onresult = (e) => {
      let t = "";
      for (let i = e.resultIndex; i < e.results.length; i++) t += e.results[i][0].transcript;
      setTranscript(t.trim());
    };
    rec.onend = () => setListening(false);
    ref.current = rec; setSupported(true);
  }, [lang]);

  const start = () => { if (ref.current && !listening) { setTranscript(""); ref.current.start(); setListening(true); } };
  const stop  = () => ref.current?.stop();

  return { supported, listening, transcript, start, stop };
}
