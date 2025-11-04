// src/App.jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabaseClient";

// Module (deine echten Implementierungen)
import PriceFinder from "./modules/PriceFinder";
import MessageMatcher from "./modules/MessageMatcher";
import ContentFlow from "./modules/ContentFlow";

// Admin-Datei ist klein geschrieben:
import Admin from "./pages/admin";

/* ============ UI Primitives ============ */
const theme = { gold: "#d1a45f", goldHover: "#c2924d" };

function Button({ children, onClick, variant = "outline", className = "", type = "button", disabled }) {
  const vars = { "--gold": theme.gold, "--goldHover": theme.goldHover };
  const base =
    variant === "solid"
      ? "bg-[var(--gold)] text-black hover:bg-[var(--goldHover)]"
      : "border border-[var(--gold)] text-[var(--gold)] hover:bg-[var(--gold)] hover:text-black";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={vars}
      className={`rounded-2xl px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${base} ${className}`}
    >
      {children}
    </button>
  );
}

function Card({ title, subtitle, children, className = "" }) {
  return (
    <div className={`rounded-2xl p-6 bg-[#141414] border border-[#2a2a2a] ${className}`}>
      {(title || subtitle) && (
        <div className="mb-3">
          {title && <div className="text-sm font-semibold" style={{ color: theme.gold }}>{title}</div>}
          {subtitle && <div className="text-xs mt-1 text-neutral-400">{subtitle}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

function Crumb({ title }) {
  return (
    <div className="flex items-center gap-2 text-sm text-neutral-400">
      <span>Home</span>
      <span className="text-neutral-600">/</span>
      <span style={{ color: theme.gold }}>{title}</span>
    </div>
  );
}

function TextField({ label, type = "text", value, onChange, autoComplete, placeholder }) {
  return (
    <label className="grid gap-1">
      <span className="text-sm text-neutral-300">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="rounded-md bg-[#0f0f0f] border border-[#2a2a2a] px-3 py-2 text-neutral-200 focus:outline-none focus:border-[#d1a45f]"
      />
    </label>
  );
}

/* ============ Auth Views (inline) ============ */
function LoginView({ onOK, onSwitch }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: (email || "").trim().toLowerCase(),
        password: pw,
      });
      if (error) throw error;
      onOK?.();
    } catch (e2) {
      setErr(e2?.message || "Login fehlgeschlagen.");
    }
  };

  return (
    <section className="max-w-md mx-auto">
      <Card title="Login" subtitle="Willkommen zurück">
        <form className="grid gap-3" onSubmit={submit}>
          <TextField label="E-Mail" value={email} onChange={setEmail} autoComplete="username" />
          <TextField label="Passwort" type="password" value={pw} onChange={setPw} autoComplete="current-password" />
          {err ? <div className="text-rose-400 text-sm">{err}</div> : null}
        <div className="flex gap-2">
            <Button variant="solid" type="submit">Einloggen</Button>
            <Button onClick={onSwitch}>Registrieren</Button>
          </div>
        </form>
      </Card>
    </section>
  );
}

function RegisterView({ onOK, onSwitch }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      const { error } = await supabase.auth.signUp({
        email: (email || "").trim().toLowerCase(),
        password: pw,
      });
      if (error) throw error;
      onOK?.(); // ggf. E-Mail-Bestätigung je nach Project-Settings
    } catch (e2) {
      setErr(e2?.message || "Registrierung fehlgeschlagen.");
    }
  };

  return (
    <section className="max-w-md mx-auto">
      <Card title="Registrieren" subtitle="Starte los">
        <form className="grid gap-3" onSubmit={submit}>
          <TextField label="E-Mail" value={email} onChange={setEmail} autoComplete="username" />
          <TextField label="Passwort" type="password" value={pw} onChange={setPw} autoComplete="new-password" />
          {err ? <div className="text-rose-400 text-sm">{err}</div> : null}
          <div className="flex gap-2">
            <Button variant="solid" type="submit">Konto anlegen</Button>
            <Button onClick={onSwitch}>Zum Login</Button>
          </div>
        </form>
      </Card>
    </section>
  );
}

/* ============ Konto (inline) ============ */
function AccountView({ session }) {
  const mail = session?.user?.email || "—";
  return (
    <section className="max-w-xl mx-auto">
      <Card title="Konto" subtitle="Deine Session">
        <div className="text-sm text-neutral-300">
          E-Mail: <span className="text-neutral-100">{mail}</span>
        </div>
      </Card>
    </section>
  );
}

/* ============ Main App ============ */
export default function App() {
  const [view, setView] = useState("home"); // "home" | "pricefinder" | "messagematcher" | "contentflow" | "login" | "register" | "account" | "admin"
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);

  // Session laden & Listener
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (mounted) setSession(data.session ?? null);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => setSession(sess ?? null));
    return () => sub?.subscription?.unsubscribe?.();
  }, []);

  // Rolle aus profiles.role
  useEffect(() => {
    let stop = false;
    (async () => {
      if (!session?.user?.id) {
        setRole(null);
        return;
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();
      if (!stop) setRole(error ? null : data?.role ?? null);
    })();
    return () => { stop = true; };
  }, [session]);

  const greeting = useMemo(() => {
    const email = session?.user?.email || "";
    const nick = email.split("@")[0] || "there";
    return `Hey ${nick}, let’s move some mountains today ⚡`;
  }, [session]);

  const logout = async () => {
    await supabase.auth.signOut();
    setView("login");
  };

  const TopBar = () => (
    <header className="mb-10 flex flex-col items-center gap-4 md:flex-row md:items-center md:justify-between">
      <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-center md:text-left" style={{ color: theme.gold }}>
        SmartBiz Suite
      </h1>
      <nav className="mt-3 flex flex-wrap items-center gap-2">
        <Button onClick={() => setView("home")}>Home</Button>
        {session ? (
          <>
            <Button onClick={() => setView("account")}>Konto</Button>
            {role === "admin" && <Button onClick={() => setView("admin")}>Admin</Button>}
            <Button variant="solid" onClick={logout}>Logout</Button>
          </>
        ) : (
          <Button variant="solid" onClick={() => setView("login")}>Login</Button>
        )}
      </nav>
    </header>
  );

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-neutral-100">
      {/* Harte Zentrierung kommt aus src/index.css (.app-shell) */}
      <div className="app-shell">
        <TopBar />

        {/* AUTH */}
        {!session && view === "login" && (
          <LoginView onOK={() => setView("home")} onSwitch={() => setView("register")} />
        )}
        {!session && view === "register" && (
          <RegisterView onOK={() => setView("login")} onSwitch={() => setView("login")} />
        )}

        {/* HOME */}
        {view === "home" && (
          <main className="space-y-10">
            <section className="max-w-3xl mx-auto">
              <Card>
                <p className="text-lg md:text-xl font-medium text-neutral-300">{greeting}</p>
              </Card>
            </section>

            <section className="max-w-7xl mx-auto">
              <div className="flex flex-wrap justify-center gap-8">
                <Card
                  title="PriceFinder"
                  subtitle="Wohlfühl-, Wachstums- & Authority-Preis"
                  className="w-[22rem]"
                >
                  <p className="text-sm text-neutral-400">Klarer, sauberer Flow.</p>
                  <div className="mt-6">
                    <Button variant="solid" className="w-full" onClick={() => setView("pricefinder")}>
                      Öffnen
                    </Button>
                  </div>
                </Card>

                <Card
                  title="MessageMatcher"
                  subtitle="Messaging-Map aus Bio/Website"
                  className="w-[22rem]"
                >
                  <p className="text-sm text-neutral-400">Positionierung ohne Ratespiel.</p>
                  <div className="mt-6">
                    <Button variant="solid" className="w-full" onClick={() => setView("messagematcher")}>
                      Öffnen
                    </Button>
                  </div>
                </Card>

                <Card
                  title="ContentFlow"
                  subtitle="Hooks, Stories, Captions"
                  className="w-[22rem]"
                >
                  <p className="text-sm text-neutral-400">Struktur rein, Output rauf.</p>
                  <div className="mt-6">
                    <Button variant="solid" className="w-full" onClick={() => setView("contentflow")}>
                      Öffnen
                    </Button>
                  </div>
                </Card>
              </div>
            </section>
          </main>
        )}

        {/* MODULE */}
        {view === "pricefinder" && (
          <section className="max-w-5xl mx-auto">
            <Crumb title="pricefinder" />
            <div className="mt-3"><Button onClick={() => setView("home")}>← Zurück</Button></div>
            <div className="mt-6"><PriceFinder /></div>
          </section>
        )}

        {view === "messagematcher" && (
          <section className="max-w-5xl mx-auto">
            <Crumb title="messagematcher" />
            <div className="mt-3"><Button onClick={() => setView("home")}>← Zurück</Button></div>
            <div className="mt-6"><MessageMatcher /></div>
          </section>
        )}

        {view === "contentflow" && (
          <section className="max-w-5xl mx-auto">
            <Crumb title="contentflow" />
            <div className="mt-3"><Button onClick={() => setView("home")}>← Zurück</Button></div>
            <div className="mt-6"><ContentFlow /></div>
          </section>
        )}

        {/* KONTO / ADMIN */}
        {session && view === "account" && <AccountView session={session} />}

        {session && role === "admin" && view === "admin" && (
          <section className="max-w-6xl mx-auto">
            <Crumb title="admin" />
            <div className="mt-3"><Button onClick={() => setView("home")}>← Zurück</Button></div>
            <div className="mt-6"><Admin onBack={() => setView("home")} /></div>
          </section>
        )}
      </div>
    </div>
  );
}
