import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function ContentFlow({ onBack }) {
  const [topic, setTopic] = useState('')
  const [goal, setGoal] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  async function onGenerate(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const { data: u } = await supabase.auth.getUser()
      const uid = u?.user?.id
      if (!uid) throw new Error('Keine Session')

      const out = await callContentFlowViaProxy({ topic, goal })

      const payload = {
        user_id: uid,
        type: 'contentflow',
        topic,
        goal,
        input: { topic, goal },
        output: out
      }

      const { error: dbErr } = await supabase.from('analyses').insert(payload)
      if (dbErr) throw dbErr

      setResult(out)
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 880, margin: '24px auto', padding: 16 }}>
      <button onClick={onBack} style={{ marginBottom: 12 }}>← Zurück</button>
      <h1 style={{ fontWeight: 700, fontSize: 24, marginBottom: 8 }}>ContentFlow AI</h1>
      <p style={{ color: '#6b7280', marginBottom: 16 }}>
        Generiere psychologisch abgestimmte Content-Serien aus Thema + Ziel.
      </p>

      {!result && (
        <form onSubmit={onGenerate} style={{ display: 'grid', gap: 12 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Thema</span>
            <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="z. B. Verkaufen ohne Druck" />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Ziel</span>
            <input value={goal} onChange={e => setGoal(e.target.value)} placeholder="z. B. mehr Sichtbarkeit" />
          </label>
          {error && <div style={{ color: '#b91c1c' }}>{error}</div>}
          <button disabled={loading || !topic.trim()} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #111' }}>
            {loading ? 'Generiere…' : 'Content erstellen'}
          </button>
        </form>
      )}

      {result && <Output result={result} onBackToForm={() => setResult(null)} />}
    </div>
  )
}

function Output({ result, onBackToForm }) {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <Card title="Hooks" body={
        <ol>{result.hooks?.map((h,i)=><li key={i}>{h}</li>)}</ol>
      }/>
      <Card title="Story-Outline" body={result.story_outline || '–'}/>
      <Card title="Caption" body={result.caption || '–'}/>
      <Card title="CTA" body={result.cta || '–'}/>
      <Card title="Hashtags" body={(result.hashtags||[]).join(' ')}/>
      <button onClick={onBackToForm} style={{ width:200, padding:'8px 12px', borderRadius:8, border:'1px solid #111' }}>Neue Serie</button>
    </div>
  )
}

function Card({ title, body }) {
  return (
    <div style={{ border:'1px solid #e5e7eb', borderRadius:12, padding:16 }}>
      <div style={{ fontWeight:700, marginBottom:6 }}>{title}</div>
      <div>{body}</div>
    </div>
  )
}

async function callContentFlowViaProxy(payload) {
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
    return {
      hooks: ['Mock Hook 1','Mock Hook 2','Mock Hook 3'],
      story_outline: 'Mock Story Outline',
      caption: 'Mock Caption',
      cta: 'Jetzt handeln!',
      hashtags: ['#mock','#contentflow']
    }
  }

  const res = await fetch(proxy, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!res.ok) throw new Error(await res.text())
  return await res.json()
}

const SYSTEM_PROMPT = `
Du bist ContentFlow AI. Antworte **ausschließlich** als JSON in dieser Form:
{
  "hooks": string[],
  "story_outline": string,
  "caption": string,
  "cta": string,
  "hashtags": string[]
}
Generiere 3-5 emotionale, psychologisch fundierte Hooks,
eine kurze Story-Outline, eine Caption, eine CTA und passende Hashtags
für das Thema und Ziel der Nutzerin im Online-Business-Kontext (Coaching/Consulting).
Kein Fluff, kein Marketing-Bullshit – klar, verkaufsstark, relevant.
`
