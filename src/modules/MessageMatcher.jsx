import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const PROXY_URL = 'https://ai.ki-smartbiz.de/app/proxy.php'

export default function MessageMatcher({ onBack }) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  async function onAnalyze(e) {
    e.preventDefault()
    setError(''); setLoading(true)

    try {
      const { data: u } = await supabase.auth.getUser()
      const uid = u?.user?.id
      if (!uid) throw new Error('Keine Session – bitte neu einloggen.')

      const out = await callMessageMatcherViaProxy({ text: input })

      const payload = { user_id: uid, type: 'messagematcher', input: { text: input }, output: out }
      const { error: dbErr } = await supabase.from('analyses').insert(payload)
      if (dbErr) throw dbErr

      await upsertVoiceProfile(uid, out)
      setResult(out)
    } catch (err) {
      console.error(err)
      setError(err.message || 'Analyse fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 860, margin: '24px auto', padding: 16 }}>
      <button onClick={onBack} style={{ marginBottom: 12 }}>← Zurück</button>
      <h1 style={{ fontWeight: 700, fontSize: 24, marginBottom: 8 }}>MessageMatcher AI</h1>
      <p style={{ color: '#6b7280', marginBottom: 16 }}>
        Füge hier deine Website-/Insta-Bio-/Salespage-Texte ein. Wir extrahieren Archetyp, Tonalität,
        Differenzierung und Buyer-Scores – plus 3 konkrete Hooks.
      </p>

      {!result && (
        <form onSubmit={onAnalyze} style={{ display: 'grid', gap: 12 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Dein Text (roh einfügen)</span>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={10}
              placeholder="Bio/Salespage/Website-Auszug hier einfügen…"
              style={{ padding: 10, borderRadius: 8, border: '1px solid #e5e7eb' }}
            />
          </label>

          {error && <div style={{ color: '#b91c1c', whiteSpace:'pre-wrap' }}>{error}</div>}

          <button disabled={loading || !input.trim()} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #111' }}>
            {loading ? 'Analysiere…' : 'Analysieren'}
          </button>
        </form>
      )}

      {result && <Output result={result} onBackToForm={() => setResult(null)} />}
    </div>
  )
}

function Output({ result, onBackToForm }) {
  const tone = result?.tone || {}
  const buyer = result?.buyer_scores || {}

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        <Card title="Core Message" body={result.core_message || '–'} />
        <Card title="Archetyp" body={result.archetype || '–'} />
        <Card title="Differenzierung" body={result.differentiation || '–'} />
      </div>

      <Card
        title="Tone (Voice)"
        body={
          <>
            <div><b>Keywords:</b> {(tone.voice_keywords || []).join(', ') || '–'}</div>
            <div style={{ marginTop: 6, color: '#374151' }}><b>Style Notes:</b> {tone.style_notes || '–'}</div>
          </>
        }
      />

      <Card
        title="Buyer Scores"
        body={
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li>Emotional: {fmtPct(buyer.emotional)}</li>
            <li>Rational: {fmtPct(buyer.rational)}</li>
            <li>Prestige: {fmtPct(buyer.prestige)}</li>
          </ul>
        }
      />

      <Card
        title="Hooks (3x)"
        body={
          <ol style={{ margin: 0, paddingLeft: 18 }}>
            {(result.hooks || []).slice(0, 3).map((h, i) => <li key={i}>{h}</li>)}
          </ol>
        }
      />

      <button onClick={onBackToForm} style={{ width: 200, padding: '8px 12px', borderRadius: 8, border: '1px solid #111' }}>
        Neue Analyse
      </button>
    </div>
  )
}

function Card({ title, body }) {
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{title}</div>
      <div>{body}</div>
    </div>
  )
}

function fmtPct(v) {
  const n = typeof v === 'number' ? v : Number(v)
  if (isNaN(n)) return '–'
  return `${Math.round(n * 100)}%`
}

// --- DB helper: upsert voice_profiles ---
async function upsertVoiceProfile(userId, out) {
  const { data: existing, error: selErr } = await supabase
    .from('voice_profiles')
    .select('id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()

  if (selErr) throw selErr

  const row = {
    user_id: userId,
    archetype: out.archetype || null,
    tone: out.tone || null,
    buyer_scores: out.buyer_scores || null,
    updated_at: new Date().toISOString()
  }

  if (!existing) {
    const { error: insErr } = await supabase.from('voice_profiles').insert(row)
    if (insErr) throw insErr
  } else {
    const { error: updErr } = await supabase.from('voice_profiles').update(row).eq('id', existing.id)
    if (updErr) throw updErr
  }
}

// --- Proxy call (robust, ohne .env) ---
async function callMessageMatcherViaProxy(payload) {
  const proxy = (PROXY_URL || '').trim()

  // Fallback für Offline/ohne Proxy
  if (!proxy) {
    const text = (payload.text || '').toLowerCase()
    const emo = text.includes('feel') || text.includes('emotion') ? 0.6 : 0.4
    return {
      core_message: 'Klarer Nutzen in einem Satz (Mock).',
      archetype: 'Mentorin (Mock)',
      tone: { voice_keywords: ['klar', 'direkt', 'energetisch'], style_notes: 'Fokus, Momentum, kein Bullshit.' },
      differentiation: 'Psychologie + Strategie kombiniert (Mock).',
      buyer_scores: { emotional: emo, rational: 0.3, prestige: 0.1 },
      hooks: [
        'Stop guessing. Start growing.',
        'Dein Angebot verkauft sich nicht – deine Message tut es.',
        'Hol dir Klarheit, die konvertiert.'
      ]
    }
  }

  const body = {
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: JSON.stringify(payload) }
    ]
  }

  const res = await fetch(proxy, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  const text = await res.text()
  if (!res.ok) throw new Error(`Proxy HTTP ${res.status}: ${text.slice(0, 300)}`)

  let parsed
  try { parsed = JSON.parse(text) }
  catch { throw new Error(`Proxy lieferte kein JSON: ${text.slice(0, 300)}`) }

  // OpenAI-Response?
  const content = parsed?.choices?.[0]?.message?.content
  if (typeof content === 'string') {
    try { return JSON.parse(content) }
    catch { throw new Error(`Content nicht JSON: ${content.slice(0, 300)}`) }
  }

  // Direktes JSON?
  if (parsed && (parsed.core_message || parsed.tone || parsed.buyer_scores || parsed.hooks)) return parsed

  throw new Error('Unerwartetes Proxy-Format')
}

const SYSTEM_PROMPT = `
Du bist MessageMatcher AI. Antworte ausschließlich als JSON in dieser Form:
{
  "core_message": string,
  "archetype": string,
  "tone": {
    "voice_keywords": string[],
    "style_notes": string
  },
  "differentiation": string,
  "buyer_scores": {
    "emotional": number,
    "rational": number,
    "prestige": number
  },
  "hooks": string[]
}
Analyse den gelieferten Text (Bio/Salespage/Website-Auszug) im DACH-Coaching/Consulting-Kontext.
Kein Fluff. Klar, verkaufspsychologisch, präzise. Summiere buyer_scores auf ~1. Kein Text außerhalb des JSON.
`
