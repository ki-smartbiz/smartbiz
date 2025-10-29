// src/App.jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabaseClient";
import Admin from "./pages/admin";

// --- kleine UI-Helfer (pures Tailwind, kein shadcn) ---
function Button({ children, variant = "primary", className = "", ...props }) {
  const base =
    "px-3 py-1.5 rounded-lg text-sm border transition disabled:opacity-60 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-black text-white border-black hover:bg-gray-900",
    outline: "bg-white text-gray-900 border-gray-300 hover:bg-gray-50",
    ghost: "bg-transparent text-gray-800 border-transparent hover:bg-gray-100",
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

function Card({ title, description, children, footer, onClick, disabled }) {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={`rounded-2xl border bg-white p-4 hover:shadow-sm transition cursor-${
        disabled ? "default" : "pointer"
      } ${disabled ? "opacity-60" : ""}`}
    >
      {title && <div className="font-semibold text-lg">{title}</div>}
      {description && <p className="text-sm text-gray-600 mt-1">{description}</p>}
      <div className="mt-3">{children}</div>
      {footer && <div className="mt-3 pt-3 border-t text-sm">{footer}</div>}
    </div>
  );
}
// ------------------------------------------------------

// Placeholder-Module – fülle die Logik später
function PriceFinder() {
  return (
    <div className="max-w-3xl mx-auto p-6">
      <h2 className="text-xl font-semibold">PriceFinder</h2>
      <p className="text-sm text-gray-600 mt-2">
        MVP-Placeholder. Hier kommt dein Fragenflow + Auswertung rein.
      </p>
    </div>
  );
}
function MessageMatcher() {
  return (
    <div className="max-w-3xl mx-auto p-6">
      <h2 className="text-xl font-semibold">MessageMatcher</h2>
      <p className="text-sm text-gray-600 mt-2">
        MVP-Placeholder. Analysiere Bio / Salespage und gib eine Messaging Map aus.
      </p>
    </div>
  );
}
function ContentFlow() {
  return (
    <div className="max-w-3xl mx-auto p-6">
      <h2 className="text-xl font-semibold">ContentFlow</h2>
      <p className="text-sm text-gray-600 mt-2">
        MVP-Placeholder. Themen → Hooks, Story, Caption, CTA, Hashtags.
      </p>
    </div>
  );
}

// Header mit Admin-Button (nur wenn Admin)
function Header({ userEmail, isAdmin, onNav, onLogout }) {
  return (
    <header className="w-full border-b bg-white/70 backdrop-blur sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <button className="font-semibold" onClick={() => onNav("dashboard")}>
          SmartBiz Suite
        </button>
        <div className="flex items-center gap-3 text-sm">
          {isAdmin && (
            <Button variant="outline" onClick={() => onNav("admin")}>
              Admin
            </Button>
          )}
          <span className="hidden sm:inline text-gray-600">{userEmail}</span>
          <Button variant="outline" onClick={onLogout}>
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}

// Simple Login (Email/Passwort) – nutzt supabase.auth.signInWithPassword
function Login({ onSuccess }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pw,
      });
      if (error) throw error;
      onSuccess?.(data?.user || null);
    } catch (e) {
      setErr(e.message || "Login fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gray-50">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm bg-white p-6 rounded-2xl border"
      >
        <h1 className="text-lg font-semibold">Login</h1>
        <p className="text-sm text-gray-600 mt-1">
          Melde dich mit deinem Account an.
        </p>
        <div className="mt-4 space-y-3">
          <div>
            <label className="text-sm">E-Mail</label>
            <input
              type="email"
              className="w-full mt-1 border rounded-lg px-3 py-2 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-sm">Passwort</label>
            <input
              type="password"
              className="w-full mt-1 border rounded-lg px-3 py-2 text-sm"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              required
            />
          </div>
        </div>
        {err && <p className="text-red-600 text-sm mt-3">{err}</p>}
        <Button className="mt-4 w-full" disabled={loading}>
          {loading ? "Login…" : "Einloggen"}
        </Button>
      </form>
    </div>
  );
}

// Dashboard mit Feature-Gating
function Dashboard({ features, onOpen }) {
  const items = useMemo(
    () => [
      {
        key: "pricefinder",
        title: "PriceFinder",
        desc:
          "3-stufige Preisempfehlung (Wohlfühl, Wachstum, Authority) – psychologisch + marktbasiert.",
      },
      {
        key: "messagematcher",
        title: "MessageMatcher",
        desc:
          "Magnetische Messaging Map: Core-Message, Archetyp, Differenzierung, Hooks.",
      },
      {
        key: "contentflow",
        title: "ContentFlow",
        desc:
          "Content Engine: Hooks, Story, Captions, CTA, Hashtag-Cluster – passend zur Zielgruppe.",
      },
    ],
    []
  );

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-xl font-semibold">SmartBiz Suite</h1>
      <p className="text-sm text-gray-600 mt-1">
        Wähle dein Modul. Gesperrte Karten → zuerst in der Admin-Konsole
        freischalten.
      </p>

      <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((it) => {
          const enabled = features.has(it.key);
          return (
            <Card
              key={it.key}
              title={it.title}
              description={it.desc}
              onClick={() => enabled && onOpen(it.key)}
              disabled={!enabled}
              footer={
                enabled ? (
                  <span className="text-green-700">Freigeschaltet</span>
                ) : (
                  <span className="text-gray-500">Gesperrt</span>
                )
              }
            />
          );
        })}
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null); // {id,email,role}
  const [features, setFeatures] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState("dashboard"); // dashboard | admin | pricefinder | messagematcher | contentflow

  const isAdmin = profile?.role === "admin";

  // Auth-Session laden + Listener
  useEffect(() => {
    let sub = null;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setUser(data.session?.user || null);
        sub = supabase.auth.onAuthStateChange((_event, session) => {
          setUser(session?.user || null);
        }).data.subscription;
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      sub?.unsubscribe?.();
    };
  }, []);

  // Profil & Features nach Login laden
  useEffect(() => {
    if (!user) {
      setProfile(null);
      setFeatures(new Set());
      return;
    }
    (async () => {
      try {
        const { data: prof, error: pe } = await supabase
          .from("profiles")
          .select("id,email,role")
          .eq("id", user.id)
          .single();
        if (pe) throw pe;
        setProfile(prof);

        const { data: feats, error: fe } = await supabase
          .from("user_features")
          .select("feature_key")
          .eq("user_id", user.id);
        if (fe) throw fe;
        setFeatures(new Set((feats || []).map((f) => f.feature_key)));
      } catch (e) {
        console.error(e);
      }
    })();
  }, [user]);

  async function handleLogout() {
    await supabase.auth.signOut();
    setPage("dashboard");
  }

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center text-sm text-gray-500">
        Lade…
      </div>
    );
  }

  if (!user) {
    return <Login onSuccess={() => window.location.reload()} />;
  }

  // Routen
  if (page === "admin") {
    return (
      <>
        <Header
          userEmail={profile?.email}
          isAdmin={isAdmin}
          onNav={setPage}
          onLogout={handleLogout}
        />
        <Admin onBack={() => setPage("dashboard")} />
      </>
    );
  }

  if (page === "pricefinder") {
    return (
      <>
        <Header
          userEmail={profile?.email}
          isAdmin={isAdmin}
          onNav={setPage}
          onLogout={handleLogout}
        />
        <PriceFinder />
      </>
    );
  }

  if (page === "messagematcher") {
    return (
      <>
        <Header
          userEmail={profile?.email}
          isAdmin={isAdmin}
          onNav={setPage}
          onLogout={handleLogout}
        />
        <MessageMatcher />
      </>
    );
  }

  if (page === "contentflow") {
    return (
      <>
        <Header
          userEmail={profile?.email}
          isAdmin={isAdmin}
          onNav={setPage}
          onLogout={handleLogout}
        />
        <ContentFlow />
      </>
    );
  }

  // Dashboard
  return (
    <>
      <Header
        userEmail={profile?.email}
        isAdmin={isAdmin}
        onNav={setPage}
        onLogout={handleLogout}
      />
      <Dashboard
        features={features}
        onOpen={(key) => setPage(key)}
      />
    </>
  );
}
