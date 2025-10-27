// src/App.jsx
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'

// Module Imports
import PriceFinder from './modules/PriceFinder'
import MessageMatcher from './modules/MessageMatcher'
import ContentFlow from './modules/ContentFlow'

export default function App() {
  const [session, setSession] = useState(null)
  const [route, setRoute] = useState('dashboard') // 'dashboard' | 'pricefinder' | 'messagematcher' | 'contentflow'

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session || null))
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => setSession(sess))
    return () => sub.subscription.unsubscribe()
  }, [])

  // --- Login ---
  if (!session) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16 }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <h1 style={{ fontWeight: 700, marginBottom: 12 }}>Login zur KI-SmartBiz Suite</h1>
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: ThemeSupa }}
            providers={[]}
            view="magic_link"
            localization={{
              variables: {
                magic_link: { email_input_label: 'E-Mail', button_label: 'Magic Link senden' },
              },
            }}
          />
          <p style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>
            Du bekommst einen Magic Link per E-Mail. (Spam prüfen)
          </p>
        </div>
      </div>
    )
  }

  // --- Module Routes ---
  if (route === 'pricefinder') return <PriceFinder onBack={() => setRoute('dashboard')} />
  if (route === 'messagematcher') return <MessageMatcher onBack={() => setRoute('dashboard')} />
  if (route === 'contentflow') return <ContentFlow onBack={() => setRoute('dashboard')} />

  // --- Dashboard ---
  return (
    <Dashboard
      user={session.user}
      onOpenPriceFinder={() => setRoute('pricefinder')}
      onOpenMessageMatcher={() => setRoute('messagematcher')}
      onOpenContentFlow={() => setRoute('contentflow')}
    />
  )
}

/* ---------------- Dashboard ---------------- */

function Dashboard({ user, onOpenPriceFinder, onOpenMessageMatcher, onOpenContentFlow }) {
  return (
    <div style={{ maxWidth: 980, margin: '40px auto', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ fontWeight: 700 }}>KI-SmartBiz Suite</h1>
        <button
          onClick={() => supabase.auth.signOut()}
          style={{
            border: '1px solid #111',
            borderRadius: 6,
            padding: '6px 12px',
            cursor: 'pointer',
          }}
        >
          Logout
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gap: 12,
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        }}
      >
        <Card
          title="PriceFinder AI"
          desc="Wohlfühl-, Wachstums- & Authority-Preis"
          onOpen={onOpenPriceFinder}
        />
        <Card
          title="MessageMatcher AI"
          desc="Archetyp, Tone, Differenzierung, Hooks"
          onOpen={onOpenMessageMatcher}
        />
        <Card
          title="ContentFlow AI"
          desc="Hooks, Captions, Story-Outline & CTA"
          onOpen={onOpenContentFlow}
        />
      </div>

      <p style={{ fontSize: 12, color: '#6b7280', marginTop: 24 }}>
        Eingeloggt als: {user.email}
      </p>
    </div>
  )
}

/* ---------------- UI Components ---------------- */

function Card({ title, desc, onOpen }) {
  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <div>
        <div style={{ fontWeight: 600 }}>{title}</div>
        <div style={{ fontSize: 14, color: '#6b7280', marginTop: 6 }}>{desc}</div>
      </div>
      <button
        style={{
          marginTop: 12,
          padding: '8px 12px',
          borderRadius: 8,
          border: '1px solid #111',
          cursor: 'pointer',
          background: '#fff',
        }}
        onClick={onOpen}
      >
        Öffnen
      </button>
    </div>
  )
}
