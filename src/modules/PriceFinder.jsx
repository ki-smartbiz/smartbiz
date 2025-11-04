import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

/** >>> HIER EINMAL DEINE ÖFFENTLICHE PROXY-URL SETZEN <<< 
 *  Beispiel: https://deine-domain.tld/proxy.php
 *  Kein .env, kein lokaler Build nötig.
 */
const PROXY_URL = 'https://ai.ki-smartbiz.de/app/proxy.php'

export default function PriceFinder({ onBack }) {
  const [form, setForm] = useState({
    erfahrung: '', angebot: '', zielkunde: '', nutzen: '',
    reichweite: '', proof: '', monatsziel: '', mindblock: '',
    verkaufskanal: '', preisgefühlt: ''
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  function setField(k, v) { setForm(prev => ({ ...prev, [k]: v })) }

  async function onSubmit(e) {
    e.preventDefault()
    setLoading(true); setError('')

    const { data: u } = await supabase.auth.getUser()
    const uid = u?.user?.id
    if (!uid) { setError('Keine Session. Bitte neu einloggen.'); setLoading(false); return }

    try {
      // 1) GPT/Proxy call (fällt auf Mock zurück, wenn PROXY_URL leer)
      const out = await callPriceFinderViaProxy(form)

      // 2) Ergebnis speichern
      const payload = { user_id: uid, type: 'pricefinder', input: form, output: out }
      const { error: dbErr } = await supabase.from('analyses').insert(payload)
      if (dbErr) throw dbErr

      setResult(out)
    } catch (err) {
      console.error(err)
      setError(err.message || 'Fehler bei der Preisberechnung')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 760, margin: '24px auto', padding: 16 }}>
      <button onClick={onBack} style={{ marginBottom: 12 }}>← Zurück</button>
      <h1 style={{ fontWeight: 700, fontSize: 24, marginBottom: 12 }}>PriceFinder AI</h1>
      <p style={{ color: '#6b7280', marginBottom: 16 }}>
        Beantworte die 10 Fragen. Danach erhältst du drei Preisstufen + Begründung.
      </p>

      {!result && (
        <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
          <Input label="1) Erfahrung (Jahre / Ergebnisse)" value={form.erfahrung} onChange={v=>setField('erfahrung', v)} />
          <Input label="2) Kurzbeschreibung deines Angebots (Outcome!)" value={form.angebot} onChange={v=>setField('angebot', v)} />
          <Input label="3) Wer ist deine Zielkundin / dein Zielkunde?" value={form.zielkunde} onChange={v=>setField('zielkunde', v)} />
          <Input label="4) Greifbarer Nutzen (Zeit, Geld, Gesundheit, Status)" value={form.nutzen} onChange={v=>setField('nutzen', v)} />
          <Input label="5) Aktuelle Reichweite (IG/Newsletter/YouTube geschätzt)" value={form.reichweite} onChange={v=>setField('reichweite', v)} />
          <Input label="6) Proof/Referenzen (Cases, Testimonials, Zertifikate)" value={form.proof} onChange={v=>setField('proof', v)} />
          <Input label="7) Ziel-Umsatz/Monat (EUR)" value={form.monatsziel} onChange={v=>setField('monatsziel', v)} />
          <Input label="8) Größte innere Blockade beim Preis" value={form.mindblock} onChange={v=>setField('mindblock', v)} />
          <Input label="9) Haupt-Verkaufskanal (DM, Calls, Salespage, Live-Launch)" value={form.verkaufskanal} onChange={v=>setField('verkaufskanal', v)} />
          <Input label="10) Gefühlter Preis heute (EUR)" value={form.preisgefühlt} onChange={v=>setField('preisgefühlt', v)} />

          {error && <div style={{ color: '#b91c1c' }}>{error}</div>}
          <button disabled={loading} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #111' }}>
            {loading ? 'Berechne…' : 'Preis berechnen'}
          </button>
        </form>
      )}

      {result && (
        <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
          <PriceCard title="Wohlfühlpreis" v={result.comfort_price} why={result.reasoning?.comfort}/>
          <PriceCard title="Wachstumspreis" v={result.growth_price} why={result.reasoning?.growth}/>
          <PriceCard title="Authority-Preis" v={result.authority_price} why={result.reasoning?.authority}/>
          <div style={{ marginTop: 6, color:'#6b7280', fontSize: 12 }}>
            Umsatz-Simulation: {result.revenue_simulation?.note}
          </div>
          <button onClick={()=>setResult(null)} style={{ width: 180, padding: '8px 12px', borderRadius: 8, border:'1px solid #111' }}>
            Neue Analyse
          </button>
        </div>
      )}
    </div>
  )
}

function Input({ label, value, onChange }) {
  return (
    <label style={{ display: 'grid', gap: 6 }}>
      <span style={{ fontSize: 14, fontWeight: 600 }}>{label}</span>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={2}
        style={{ padding: 10, borderRadius: 8, border: '1px solid #e5e7eb' }}
      />
    </label>
  )
}

function PriceCard({ title, v, why }) {
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
      <div style={{ fontWeight: 700 }}>{title}</div>
      <div style={{ fontSize: 28, margin: '6px 0' }}>{v ? `${v} €` : '–'}</div>
      <div style={{ color: '#6b7280' }}>{why || '–'}</div>
    </div>
  )
}

async function callPriceFinderViaProxy(input) {
  // Fester Endpoint statt .env (du willst nicht lokal builden)
  const proxy = (PROXY_URL || '').trim()

  // Lokaler/Offline-Fallback (wenn PROXY_URL leer ist)
  if (!proxy) {
    const base = Number(String(input.preisgefühlt).replace(/[^\d]/g, '')) || 200
    return mockFromBase(base)
  }

  // Request vorbereiten
  const body = {
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: JSON.stringify(input) }
    ],
    response_format: { type: 'json_object' }
  }

  // Robust: erst Text lesen (falls HTML/Fehlerseite), dann sicher parsen
  const res = await fetch(proxy, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  const text = await res.text()
  if (!res.ok) {
    throw new Error(`Proxy HTTP ${res.status}: ${text.slice(0, 200)}`)
  }

  // Zwei mögliche Serverantworten:
  // A) Dein Proxy gibt direkt das JSON zurück, das wir brauchen
  // B) Der Proxy gibt die rohe OpenAI-Antwort zurück (choices[0].message.content] als String)
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error(`Proxy lieferte kein JSON: ${text.slice(0, 200)}`)
  }

  // B) OpenAI-Format → Inhalt extrahieren und erneut parsen
  const maybeContent = parsed?.choices?.[0]?.message?.content
  if (typeof maybeContent === 'string') {
    try {
      return JSON.parse(maybeContent)
    } catch {
      throw new Error(
        `Content nicht JSON. Server-Antwort: ${maybeContent.slice(0, 200)}`
      )
    }
  }

  // A) Direktes JSON mit den Feldern
  if (
    typeof parsed?.comfort_price !== 'undefined' &&
    typeof parsed?.growth_price !== 'undefined' &&
    typeof parsed?.authority_price !== 'undefined'
  ) {
    return parsed
  }

  // Falls das Format gar nicht passt → harter, klarer Fehler
  throw new Error(
    'Unerwartetes Proxy-Format. Erwarte direktes JSON oder OpenAI choices[].message.content.'
  )
}

function mockFromBase(base) {
  return {
    comfort_price: Math.round(base),
    growth_price: Math.round(base * 1.4),
    authority_price: Math.round(base * 2),
    reasoning: {
      comfort: 'Bauchgefühl + aktuelle Prooflage.',
      growth: 'Stretch-Level für Wachstum & Positionierung.',
      authority: 'Top-Tier für hohe Proof- & Nachfrage-Signale.'
    },
    revenue_simulation: { note: 'Mock: Grundlage ist der gefühlte Preis.' }
  }
}

const SYSTEM_PROMPT = `
Du bist PriceFinder AI. Antworte ausschließlich als JSON mit dieser Form:
{
  "comfort_price": number,
  "growth_price": number,
  "authority_price": number,
  "reasoning": { "comfort": string, "growth": string, "authority": string },
  "revenue_simulation": { "note": string }
}
Bewerte die Eingaben (Erfahrung, Angebot, Zielkunde, Nutzen, Reichweite, Proof, Monatsziel, Blockaden, Vertriebskanal, gefühlter Preis).
Kalkuliere realistische Preise für 1:1/kleine Programme im DACH-Coachingmarkt.
Kein Text außerhalb des JSON.
`
