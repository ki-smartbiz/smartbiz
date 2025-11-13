// supabase/functions/interview-answer/index.ts
import { serve } from "https://deno.land/std/http/server.ts";
import OpenAI from "https://esm.sh/openai@4.56.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SYSTEM = (persona: string, jd: string, cv: string) => `
You are an AI Interviewer for job applications.
Persona: ${persona}
- human: warm, encouraging, constructive.
- neutral: concise, factual, competency-focused.
- beast: direct, pressure-testing, challenging (still professional).

Rules:
- Ask ONE question at a time.
- If an answer is vague or lacks evidence, ask a targeted follow-up.
- 80–120 words per message.
- Keep strictly JSON.

Return JSON:
{
  "interviewer": "string",
  "follow_up_needed": true|false,
  "coach_hint": "string",
  "tags": ["..."]
}

JD (shortened):
${jd?.slice(0, 6000) ?? ""}

CV (shortened):
${cv?.slice(0, 6000) ?? ""}
`;

serve(async (req: Request) => {
  try {
    const { interviewId, answer } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY")! });

    // Interview + Uploads laden
    const { data: iv } = await supabase.from("interviews").select("*").eq("id", interviewId).single();
    if (!iv) return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });

    const { data: jd } = await supabase.from("uploads").select("text_extracted").eq("id", iv.jd_upload).single();
    const { data: cv } = await supabase.from("uploads").select("text_extracted").eq("id", iv.cv_upload).single();

    // Kandidatenantwort speichern
    if (answer) {
      await supabase.from("turns").insert({
        interview_id: interviewId,
        role: "candidate",
        content: { text: answer }
      });
    }

    // letzte 10 Turns als Kontext
    const { data: history } = await supabase
      .from("turns")
      .select("role,content,created_at")
      .eq("interview_id", interviewId)
      .order("created_at", { ascending: true })
      .limit(12);

    const messages: any[] = [
      { role: "system", content: SYSTEM(iv.persona, jd?.text_extracted ?? "", cv?.text_extracted ?? "") }
    ];

    for (const t of (history ?? [])) {
      if (t.role === "interviewer") messages.push({ role: "assistant", content: t.content.text });
      if (t.role === "candidate")   messages.push({ role: "user", content: t.content.text });
    }

    // Wenn Session frisch ist und noch keine Frage existiert → initiale Frage anstoßen
    const needKickoff = !(history ?? []).some(h => h.role === "interviewer");
    if (needKickoff && !answer) {
      messages.push({ role: "user", content: "Please ask the first question focusing on the highest-impact competency." });
    } else if (answer) {
      messages.push({ role: "user", content: `Candidate answer:\n${answer}\nReturn JSON as specified.` });
    }

    const chat = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages
    });

    const payload = JSON.parse(chat.choices[0].message.content || "{}");
    const nextQ = payload?.interviewer || "Danke, nächste Frage: Können Sie ein konkretes Beispiel nennen?";

    // Interviewerturn speichern
    await supabase.from("turns").insert({
      interview_id: interviewId,
      role: "interviewer",
      content: { text: nextQ, meta: payload ?? {} }
    });

    return new Response(JSON.stringify(payload ?? { interviewer: nextQ }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
});
