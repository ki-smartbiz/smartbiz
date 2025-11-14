// src/lib/ai.js
const PROXY_URL = import.meta.env.VITE_PROXY_URL;

if (!PROXY_URL) {
  console.warn("VITE_PROXY_URL ist nicht gesetzt – askAI wird Fehler werfen.");
}

/**
 * options:
 * - system: string (Systemprompt)
 * - user: string (User-Message, gern JSON-String)
 * - json: boolean (true = wir erwarten JSON-Struktur von der KI)
 */
export async function askAI({ system, user, json = false }) {
  if (!PROXY_URL) {
    throw new Error("Kein PROXY_URL konfiguriert (VITE_PROXY_URL).");
  }

  const res = await fetch(PROXY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ system, user, json }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Proxy-Error ${res.status}: ${text.slice(0, 200)}`);
  }

  // Proxy antwortet idealerweise mit JSON
  let data;
  try {
    data = await res.json();
  } catch {
    // Fallback – reine Textantwort
    const text = await res.text();
    if (json) {
      // Wenn wir JSON wollten, ist das hier ein Problem
      throw new Error("Antwort war kein JSON: " + text.slice(0, 200));
    }
    return text;
  }

  // Wenn dein proxy.php { ok, content } zurückgibt:
  const payload = data.content ?? data;

  if (!json) {
    // Plain Text Modus
    if (typeof payload === "string") return payload;
    return JSON.stringify(payload);
  }

  // JSON-Modus: payload ist entweder schon Objekt oder ein JSON-String der KI
  if (typeof payload === "object" && payload !== null) {
    return payload;
  }

  if (typeof payload === "string") {
    try {
      return JSON.parse(payload);
    } catch (e) {
      throw new Error("Konnte KI-JSON nicht parsen: " + e.message);
    }
  }

  throw new Error("Unerwartetes KI-Response-Format.");
}
