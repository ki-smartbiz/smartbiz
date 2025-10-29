// src/App.jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabaseClient";
import Admin from "./pages/Admin.jsx";

// -------------------- kleine UI-Helfer --------------------
function Button({ className = "", children, ...props }) {
  return (
    <button
      className={
        "inline-flex items-center justify-center rounded-lg bg-black text-white px-4 py-2 text-sm hover:opacity-90 disabled:opacity-60 " +
        className
      }
      {...props}
    >
      {children}
    </button>
  );
}
function OutlineButton({ className = "", children, ...props }) {
  return (
    <button
      className={
        "inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-60 " +
        className
      }
      {...props}
    >
      {children}
    </button>
  );
}
function Card({ children, className = "" }) {
  return (
    <div className={"rounded-2xl border bg-white " + className}>{children}</div>
  );
}
function CardHeader({ title, subtitle }) {
  return (
    <div className="p-4 border-b">
      <h3 className="text-base font-semibold">{title}</h3>
      {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
    </div>
  );
}
function CardBody({ children, className = "" }) {
  return <div className={"p-4 " + className}>{children}</div>;
}
function Input({ className = "", ...props }) {
  return (
    <input
      className={
        "w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10 " +
        className
      }
      {...props}
    />
  );
}

// -------------------- Login/Signup/Reset --------------------
function Login({ onSuccess }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [mode, setMode] = useState("login"); // login | signup | reset
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Aus Recovery-Link kommen? (Supabase setzt im Hash type=recovery)
  useEffect(() => {
    const p = new URLSearchParams(window.location.hash.slice(1));
    if (p.get("type") === "recovery") {
      setMode("reset");
      setMsg("Bitte neues Passwort setzen.");
      setErr("");
    }
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    setErr(""); setMsg(""); setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email, password: pw,
      });
      if (error) throw error;
      if (typeof onSuccess === "function") onSuccess(data?.user || null);
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
        options: { emailRedirectTo: window.location.origin + "/#recovery" },
      });
      if (error) throw error;
      if (data?.user && !data?.session) {
        setMsg("Bestätigungs-E-Mail gesendet. Bitte Postfach prüfen.");
      } else {
        if (typeof onSuccess === "function") onSuccess(data?.user || null);
      }
    } catch (e) {
      setErr(e.message || "Registrierung fehlgeschlagen.");
    } finally { setLoading(false); }
  }

  async function handleForgot() {
    setErr(""); setMsg("");
    if (!email) {
      setErr("Bitte zuerst deine E-Mail eintragen und dann „Passwort vergessen?“ anklicken.");
      return;
    }
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
      setTimeout(() => window.location.replace("/"), 800);
    } catch (e) {
      setErr(e.message || "Reset fehlgeschlagen.");
    } finally { setLoading(false); }
  }

  const onSubmit =
    mode === "login"  ? handleLogin  :
    mode === "signup" ? handleSignup :
                        handleReset;

  return (
    <div className="min-h-screen grid place-items-center bg-gray-50">
      <form onSubmit={onSubmit} className="w-full max-w-sm">
        <Card>
          <CardHeader
            title={
              mode === "login" ? "Login" :
              mode === "signup" ? "Registrieren" : "Passwort zurücksetzen"
            }
            subtitle={
              mode === "login"
                ? "Melde dich mit deinem Account an."
                : mode === "signup"
                ? "Erstelle deinen Account."
                : "Setze jetzt dein neues Passwort."
            }
          />
          <CardBody className="space-y-3">
            {mode !== "reset" && (
              <div>
                <label className="text-sm">E-Mail</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            )}

            {(mode === "login" || mode === "signup") && (
              <div>
                <label className="text-sm">Passwort</label>
                <Input
                  type="password"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            )}

            {mode === "reset" && (
              <>
                <div>
                  <label className="text-sm">Neues Passwort</label>
                  <Input
                    type="password"
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <div>
                  <label className="text-sm">Neues Passwort wiederholen</label>
                  <Input
                    type="password"
                    value={pw2}
                    onChange={(e) => setPw2(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
              </>
            )}

            {err && <p className="text-sm text-red-600">{err}</p>}
            {msg && <p className="text-sm text-green-600">{msg}</p>}

            <Button className="w-full" disabled={loading}>
              {loading
                ? (mode === "login" ? "Login…" : mode === "signup" ? "Registriere…" : "Speichere…")
                : (mode === "login" ? "Einloggen" : mode === "signup" ? "Registrieren" : "Passwort speichern")}
            </Button>

            {mode !== "reset" && (
              <div className="text-center">
                <button type="button" className="text-sm underline" onClick={handleForgot}>
                  Passwort vergessen?
                </button>
              </div>
            )}

            <div className="text-center text-sm text-gray-700">
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
              ) : mode === "signup" ? (
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
              ) : (
                <>
                  Zurück zum{" "}
                  <button
                    type="button"
                    className="underline"
                    onClick={() => { setMode("login"); setErr(""); setMsg(""); }}
                  >
                    Login
                  </button>
                </>
              )}
            </div>
          </CardBody>
        </Card>
      </form>
    </div>
  );
}

// -------------------- Header --------------------
function Header({ user, role, onGotoAdmin, onSignOut }) {
  return (
    <div className="w-full border-b bg-white">
      <div className="max-w-5xl mx-auto flex items-center justify-between p-4">
        <div className="font-semibold">SmartBiz Suite</div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 hidden sm:inline">
            {user?.email} {role === "admin" ? "(Admin)" : ""}
          </span>
          {role === "admin" && (
            <OutlineButton onClick={onGotoAdmin}>Admin</OutlineButton>
          )}
          <OutlineButton onClick={onSignOut}>Logout</OutlineButton>
        </div>
      </div>
    </div>
  );
}

// -------------------- Dashboard mit Feature-Gating --------------------
function FeatureCard({ title, description, enabled, onClick }) {
  return (
    <Card className={"h-full " + (!enabled ? "opacity-60" : "")}>
      <CardHeader title={title} subtitle={description} />
      <CardBody>
        <Button disabled={!enabled} onClick={onClick}>
          {enabled ? "Öffnen" : "Nicht freigeschaltet"}
        </Button>
      </CardBody>
    </Card>
  );
}

// Platzhalter-Module – später durch echte Module ersetzen
function PriceFinder() {
  return (
    <Card>
      <CardHeader title="PriceFinder" subtitle="Fragenflow & Preislogik – folgt." />
      <CardBody>Work in progress…</CardBody>
    </Card>
  );
}
function MessageMatcher() {
  return (
    <Card>
      <CardHeader title="MessageMatcher" subtitle="Messaging Map – folgt." />
      <CardBody>Work in progress…</CardBody>
    </Card>
  );
}
function ContentFlow() {
  return (
    <Card>
      <CardHeader title="ContentFlow" subtitle="Copy-Generator – folgt." />
      <CardBody>Work in progress…</CardBody>
    </Card>
  );
}

// -------------------- App (Root) --------------------
export default function App() {
  const [session, setSession] = useState(null);
  const [me, setMe] = useState(null); // {id,email,role}
  const [features, setFeatures] = useState(new Set());
  const [view, setView] = useState("dashboard"); // dashboard | admin | pricefinder | messagematcher | contentflow
  const [loading, setLoading] = useState(true);

  const ALL_FEATURES = useMemo(
    () => [
      { key: "pricefinder", title: "PriceFinder", desc: "Psychologisch fundierte Preisempfehlung." },
      { key: "messagematcher", title: "MessageMatcher", desc: "Magnetic Messaging Map." },
      { key: "contentflow", title: "ContentFlow", desc: "Content-Ideen & Copy, verkaufspsychologisch." },
    ],
    []
  );

  // Session-Handling
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session || null);
      setLoading(false);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((evt, sess) => {
      setSession(sess || null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Profil + Features laden
  useEffect(() => {
    if (!session?.user?.id) {
      setMe(null);
      setFeatures(new Set());
      return;
    }
    let canceled = false;
    (async () => {
      try {
        const uid = session.user.id;
        const { data: p, error: pe } = await supabase
          .from("profiles")
          .select("id,email,role")
          .eq("id", uid)
          .single();
        if (pe) throw pe;

        const { data: f, error: fe } = await supabase
          .from("user_features")
          .select("feature_key")
          .eq("user_id", uid);

        if (fe) throw fe;

        if (!canceled) {
          setMe(p);
          setFeatures(new Set((f || []).map((x) => x.feature_key)));
        }
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      canceled = true;
    };
  }, [session]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    setView("dashboard");
  }

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center text-sm text-gray-600">
        Lädt…
      </div>
    );
  }

  if (!session) {
    return <Login onSuccess={() => window.location.reload()} />;
  }

  // Admin-Ansicht
  if (view === "admin") {
    return (
      <>
        <Header
          user={session.user}
          role={me?.role}
          onGotoAdmin={() => setView("admin")}
          onSignOut={handleSignOut}
        />
        <div className="max-w-6xl mx-auto p-4">
          <Admin onBack={() => setView("dashboard")} />
        </div>
      </>
    );
  }

  // Modul-Routen
  if (view === "pricefinder") {
    return (
      <>
        <Header
          user={session.user}
          role={me?.role}
          onGotoAdmin={() => setView("admin")}
          onSignOut={handleSignOut}
        />
        <div className="max-w-4xl mx-auto p-4 space-y-4">
          <PriceFinder />
          <OutlineButton onClick={() => setView("dashboard")}>← Zurück</OutlineButton>
        </div>
      </>
    );
  }
  if (view === "messagematcher") {
    return (
      <>
        <Header
          user={session.user}
          role={me?.role}
          onGotoAdmin={() => setView("admin")}
          onSignOut={handleSignOut}
        />
        <div className="max-w-4xl mx-auto p-4 space-y-4">
          <MessageMatcher />
          <OutlineButton onClick={() => setView("dashboard")}>← Zurück</OutlineButton>
        </div>
      </>
    );
  }
  if (view === "contentflow") {
    return (
      <>
        <Header
          user={session.user}
          role={me?.role}
          onGotoAdmin={() => setView("admin")}
          onSignOut={handleSignOut}
        />
        <div className="max-w-4xl mx-auto p-4 space-y-4">
          <ContentFlow />
          <OutlineButton onClick={() => setView("dashboard")}>← Zurück</OutlineButton>
        </div>
      </>
    );
  }

  // Dashboard
  return (
    <>
      <Header
        user={session.user}
        role={me?.role}
        onGotoAdmin={() => setView("admin")}
        onSignOut={handleSignOut}
      />
      <div className="max-w-6xl mx-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ALL_FEATURES.map((f) => (
            <FeatureCard
              key={f.key}
              title={f.title}
              description={f.desc}
              enabled={features.has(f.key) || me?.role === "admin"}
              onClick={() => setView(f.key)}
            />
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-4">
          Nur freigeschaltete Module sind nutzbar. Admins sehen alles.
        </p>
      </div>
    </>
  );
}
