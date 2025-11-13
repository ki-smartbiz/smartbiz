// src/lib/ai.js
// Kleiner Helper für deinen Proxy. Fällt auf Mock zurück, wenn kein Proxy gesetzt ist.

export async function askAI({ system, user, json = true }) {
  const proxy = import.meta.env.VITE_PROXY_URL; // z.B. https://deine-domain.de/proxy.php
  const body = {
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    ...(json ? { response_format: { type: "json_object" } } : {}),
  };

  if (!proxy) {
    // ---------- MOCK ----------
    return {
      questions: [
        "Was macht dich für diese Rolle besonders qualifiziert?",
        "Nenne zwei Erfolge, die direkt zur JD passen.",
        "Wo siehst du das größte Risiko in der Stelle – und wie gehst du es an?",
      ],
      followup: "Erzähle mir mehr zu deinem Impact im letzten Projekt.",
      summary: "Mock-Summary – Interview abgeschlossen.",
    };
  }

  const res = await fetch(proxy, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}
