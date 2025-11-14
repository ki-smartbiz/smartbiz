// src/lib/ai.js
const RAW_URL = import.meta.env.VITE_PROXY_URL?.trim();

// Standard: relativ, damit es unter /app → /app/proxy.php wird
const PROXY_URL = RAW_URL || "proxy.php";

export async function askAI({ system, user, json = false }) {
  const body = {
    model: "gpt-4.1-mini",
    messages: [
      system ? { role: "system", content: system } : null,
      user ? { role: "user", content: user } : null,
    ].filter(Boolean),
    response_format: json ? { type: "json_object" } : undefined,
  };

  const res = await fetch(PROXY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Proxy-Error ${res.status}: ${text}`);
  }

  const data = await res.json();

  if (json) {
    const content = data.choices?.[0]?.message?.content;
    if (typeof content === "string") return JSON.parse(content);
    if (Array.isArray(content)) {
      const joined = content.map((c) => c.text || c).join("");
      return JSON.parse(joined);
    }
    return content;
  }

  return data;
}
