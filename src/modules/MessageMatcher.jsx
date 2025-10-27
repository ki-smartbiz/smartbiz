import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function MessageMatcher({ onBack }) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  async function onAnalyze(e) {
    e.preventDefault()
    setError(''); setLoading(true)

    try {
      // 1) Session/User
      const { data: u } = await supabase.auth.getUser()
      const uid = u?.user?.id
      if (!uid) throw new Error('Keine Session – bitte neu einloggen.')

      // 2) Proxy call
      const out = await callMessageMatcherViaProxy({ text: input })

      // 3) Analyse speichern
      const payload = { user_id: uid, type: 'messagematcher', input: { text: input }, output: out }
      const { error: dbErr } = await supabase.from('analyses').insert(payload)
      if (dbErr) throw dbErr

      // 4) Voice Memory persistieren (upsert-ähnlich)
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

          {error && <div style={{ color: '#b91c1c' }}>{error}</div>}

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

// --- DB helper: upsert voice_profiles (ohne unique(user_id) – daher select->insert/update) ---
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

// --- Proxy call (mit lokalem Fallback wie bei PriceFinder) ---
async function callMessageMatcherViaProxy(payload) {
  const proxy = import.meta.env.VITE_PROXY_URL
  const body = {
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: JSON.stringify(payload) }
    ]
  }

  if (!proxy) {
    // Fallback: simple Heuristik, damit du lokal weiterbauen kannst
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

  const res = await fetch(proxy, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error('Proxy-Fehler: ' + t)
  }
  return await res.json()
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
    "emotional": number,  // 0..1
    "rational": number,   // 0..1
    "prestige": number    // 0..1
  },
  "hooks": string[]       // 3-5 kurze, präzise Hooks
}
Analyse den gelieferten Text (Bio/Salespage/Website-Auszug) im DACH-Coaching/Consulting-Kontext.
Kein Fluff. Klar, verkaufspsychologisch, präzise. Summiere buyer_scores auf ~1. Kein Text außerhalb des JSON.
`
