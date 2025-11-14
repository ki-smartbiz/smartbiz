// src/lib/ai.js
export async function askAI({ system, user, json = true }) {
  const url = import.meta.env.VITE_PROXY_URL; // z.B. https://ai.ki-smartbiz.de/proxy.php

  if (!url) {
    throw new Error("VITE_PROXY_URL ist nicht gesetzt");
  }

  const body = JSON.stringify({ system, user, json });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
  });

  const text = await res.text();

  // ❌ Wenn der Server 404 / 500 o.Ä. zurückgibt -> Fehler werfen, NICHT als Frage benutzen
  if (!res.ok) {
    console.error("Proxy-Error:", res.status, text);
    throw new Error(`Proxy antwortet mit ${res.status} – siehe Console/Server.`);
  }

  // Wenn wir explizit JSON erwarten, versuchen wir es zu parsen.
  if (json) {
    try {
      const data = JSON.parse(text);
      return data;
    } catch (e) {
      console.error("Antwort ist kein JSON:", text);
      throw new Error("KI-Antwort ist kein gültiges JSON.");
    }
  }

  // Sonst einfach Text zurückgeben
  return text;
}
