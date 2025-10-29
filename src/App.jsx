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
  const [pw2, setPw2] = useState("");
  const [mode, setMode] = useState("login"); // 'login' | 'signup' | 'reset'
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Wenn aus dem Reset-Link gekommen (Supabase setzt type=recovery im Hash)
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    if (hash.get("type") === "recovery") {
      setMode("reset");
      setErr(""); setMsg("Bitte neues Passwort setzen.");
    }
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    setErr(""); setMsg(""); setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: pw });
      if (error) throw error;
      onSuccess?.(data?.user || null);
    } catch (e) {
      setErr(e.message || "Login fehlgeschlagen.");
    } finally { setLoading(false); }
  }

  async function handleSignup(e) {
    e.preventDefault();
    setErr(""); setMsg(""); setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: pw,
        options: { emailRedirectTo: window.location.origin + "/#recovery" }
      });
      if (error) throw error;
      if (!data?.session) {
        setMsg("Bestätigungs-E-Mail gesendet. Bitte Postfach prüfen.");
      } else {
        onSuccess?.(data?.user || null);
      }
    } catch (e) {
      setErr(e.message || "Registrierung fehlgeschlagen.");
    } finally { setLoading(false); }
  }

  async function handleForgot() {
    setErr(""); setMsg("");
    if (!email) { setErr("Bitte deine E-Mail eintragen und dann „Passwort vergessen?“ klicken."); return; }
    try {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/#recovery",
      });
      if (error) throw error;
      setMsg("Reset-Link gesendet. Bitte E-Mail prüfen.");
    } catch (e) {
      setErr(e.message || "Senden fehlgeschlagen.");
    } finally { setLoading(false); }
  }

  async function handleReset(e) {
    e.preventDefault();
    setErr(""); setMsg(""); setLoading(true);
    try {
      if (pw.length < 6) throw new Error("Passwort min. 6 Zeichen.");
      if (pw !== pw2) throw new Error("Passwörter stimmen nicht überein.");
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;
      setMsg("Passwort aktualisiert. Du bist angemeldet.");
      // Optional: Hard reload, falls du direkt ins Dashboard willst
      setTimeout(() => window.location.replace("/"), 800);
    } catch (e) {
      setErr(e.message || "Reset fehlgeschlagen.");
    } finally { setLoading(false); }
  }

  const onSubmit = mode === "login" ? handleLogin
                  : mode === "signup" ? handleSignup
                  : handleReset;

  return (
    <div className="min-h-screen grid place-items-center bg-gray-50">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-white p-6 rounded-2xl border">
        <h1 className="text-lg font-semibold">
          {mode === "login" ? "Login" : mode === "signup" ? "Registrieren" : "Passwort zurücksetzen"}
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          {mode === "login" && "Melde dich mit deinem Account an."}
          {mode === "signup" && "Erstelle deinen Account."}
          {mode === "reset" && "Setze jetzt dein neues Passwort."}
        </p>

        <div className="mt-4 space-y-3">
          {/* Email in allen Modi außer Reset ist Pflicht; bei Reset ist sie im Token */}
          {mode !== "reset" && (
            <div>
              <label className="text-sm">E-Mail</label>
              <input type="email" className="w-full mt-1 border rounded-lg px-3 py-2 text-sm"
                     value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
          )}

          {(mode === "login" || mode === "signup") && (
            <div>
              <label className="text-sm">Passwort</label>
              <input type="password" className="w-full mt-1 border rounded-lg px-3 py-2 text-sm"
                     value={pw} onChange={(e) => setPw(e.target.value)} required minLength={6} />
            </div>
          )}

          {mode === "reset" && (
            <>
              <div>
                <label className="text-sm">Neues Passwort</label>
                <input type="password" className="w-full mt-1 border rounded-lg px-3 py-2 text-sm"
                       value={pw} onChange={(e) => setPw(e.target.value)} required minLength={6} />
              </div>
              <div>
                <label className="text-sm">Neues Passwort wiederholen</label>
                <input type="password" className="w-full mt-1 border rounded-lg px-3 py-2 text-sm"
                       value={pw2} onChange={(e) => setPw2(e.target.value)} required minLength={6} />
              </div>
            </>
          )}
        </div>

        {err && <p className="text-red-600 text-sm mt-3">{err}</p>}
        {msg && <p className="text-green-600 text-sm mt-3">{msg}</p>}

        <Button className="mt-4 w-full" disabled={loading}>
          {loading
            ? (mode === "login" ? "Login…" : mode === "signup" ? "Registriere…" : "Speichere…")
            : (mode === "login" ? "Einloggen" : mode === "signup" ? "Registrieren" : "Passwort speichern")}
        </Button>

        {/* Footer-Links */}
        <div className="text-sm text-gray-600 mt-4 text-center space-y-1">
          {mode !== "reset" && (
            <div>
              <button type="button" className="underline" onClick={handleForgot}>
                Passwort vergessen?
              </button>
            </div>
          )}
          <div>
            {mode === "login" ? (
              <>Kein Account?{" "}
                <button type="button" className="underline"
                        onClick={() => { setMode("signup"); setErr(""); setMsg(""); }}>
                  Jetzt registrieren
                </button></>
            ) : mode === "signup" ? (
              <>Bereits Account?{" "}
                <button type="button" className="underline"
                        onClick={() => { setMode("login"); setErr(""); setMsg(""); }}>
                  Hier einloggen
                </button></>
            ) : (
              <>Zurück zum{" "}
                <button type="button" className="underline"
                        onClick={() => { setMode("login"); setErr(""); setMsg(""); }}>
                  Login
                </button></>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

      // Wenn E-Mail-Bestätigung aus: User ist eingeloggt -> reload
      if (data?.user && !data?.session) {
        setMsg("Bestätigungs-E-Mail gesendet. Bitte Postfach prüfen.");
      } else {
        onSuccess?.(data?.user || null);
      }
    } catch (e) {
      setErr(e.message || "Registrierung fehlgeschlagen.");
    } finally { setLoading(false); }
  }

  const submit = mode === "login" ? handleLogin : handleSignup;

  return (
    <div className="min-h-screen grid place-items-center bg-gray-50">
      <form onSubmit={submit} className="w-full max-w-sm bg-white p-6 rounded-2xl border">
        <h1 className="text-lg font-semibold">{mode === "login" ? "Login" : "Registrieren"}</h1>
        <p className="text-sm text-gray-600 mt-1">
          {mode === "login" ? "Melde dich mit deinem Account an." : "Erstelle deinen Account."}
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
              minLength={6}
            />
          </div>
        </div>

        {err && <p className="text-red-600 text-sm mt-3">{err}</p>}
        {msg && <p className="text-green-600 text-sm mt-3">{msg}</p>}

        <Button className="mt-4 w-full" disabled={loading}>
          {loading ? (mode === "login" ? "Login…" : "Registriere…") : (mode === "login" ? "Einloggen" : "Registrieren")}
        </Button>

        <div className="text-sm text-gray-600 mt-4 text-center">
          {mode === "login" ? (
            <>
              Kein Account?{" "}
              <button
                type="button"
                className="underline"
                onClick={() => { setMode("signup"); setErr(""); setMsg(""); }}
              >
                Jetzt registrieren
              </button>
            </>
          ) : (
            <>
              Bereits Account?{" "}
              <button
                type="button"
                className="underline"
                onClick={() => { setMode("login"); setErr(""); setMsg(""); }}
              >
                Hier einloggen
              </button>
            </>
          )}
        </div>
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
