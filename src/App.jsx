// src/App.jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabaseClient";

// Module
import PriceFinder from "./modules/PriceFinder";
import MessageMatcher from "./modules/MessageMatcher";
import ContentFlow from "./modules/ContentFlow";

// Optional: Admin-Seite
import Admin from "./pages/admin";

/* ---------- Theme ---------- */
const theme = { gold: "#d1a45f", goldHover: "#c2924d" };

/* ---------- UI-Primitives ---------- */
function Button({ children, onClick, variant = "outline", className = "", type = "button" }) {
  const vars = { "--gold": theme.gold, "--goldHover": theme.goldHover };
  const base =
    variant === "solid"
      ? "bg-[var(--gold)] text-black hover:bg-[var(--goldHover)]"
      : "border border-[var(--gold)] text-[var(--gold)] hover:bg-[var(--gold)] hover:text-black";
  return (
    <button
      type={type}
      onClick={onClick}
      style={vars}
      className={`rounded-2xl px-4 py-2 text-sm font-semibold transition-colors ${base} ${className}`}
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

/* ---------- Home: Feature Cards + Icons ---------- */
function FeatureCard({ title, subtitle, onOpen, Icon }) {
  return (
    <div
      className="
        w-[22rem] rounded-2xl p-6
        bg-[#121212]                                  /* dunkler als Page */
        border border-[#3a3a3a]                      /* sichtbarer Rahmen */
        ring-1 ring-black/20                         /* leichte Kante */
        shadow-[0_4px_14px_rgba(0,0,0,0.35)]
        hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(0,0,0,0.55)]
        hover:border-[#4a4a4a] hover:ring-black/30
        transition-all duration-200
      "
    >
      <div className="flex items-start gap-4">
        <div className="shrink-0"><Icon /></div>
        <div>
          <div className="text-lg font-semibold" style={{ color: theme.gold }}>{title}</div>
          <div className="text-sm text-neutral-300 mt-1">{subtitle}</div>
        </div>
      </div>
      <div className="mt-6">
        <Button variant="solid" className="w-full" onClick={onOpen}>Öffnen</Button>
      </div>
    </div>
  );
}


function IconPrice() {
  return (
    <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-900/30 to-amber-500/10 border border-[#2a2a2a]">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="text-amber-300">
        <path d="M20 13L12 21L3 12L11 4L20 13Z" stroke="currentColor" strokeWidth="1.6" />
        <path d="M8.5 11.5c.828 0 1.5-.672 1.5-1.5S9.328 8.5 8.5 8.5 7 9.172 7 10s.672 1.5 1.5 1.5Z" fill="currentColor"/>
      </svg>
    </div>
  );
}
function IconMessage() {
  return (
    <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-900/30 to-sky-500/10 border border-[#2a2a2a]">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="text-sky-300">
        <path d="M21 12c0 3.866-3.806 7-8.5 7-.94 0-1.848-.118-2.7-.339L4 20l1.53-3.061C4.584 15.72 4 13.93 4 12 4 8.134 7.806 5 12.5 5S21 8.134 21 12Z" stroke="currentColor" strokeWidth="1.6"/>
        <path d="M8 12h5M8 9.5h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    </div>
  );
}
function IconFlow() {
  return (
    <div className="p-3 rounded-xl bg-gradient-to-br from-violet-900/30 to-fuchsia-500/10 border border-[#2a2a2a]">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="text-fuchsia-300">
        <path d="M5 7h7a4 4 0 0 1 4 4v0a4 4 0 0 0 4 4H19" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        <rect x="3" y="5" width="6" height="4" rx="1.2" stroke="currentColor" strokeWidth="1.6"/>
        <rect x="15" y="15" width="6" height="4" rx="1.2" stroke="currentColor" strokeWidth="1.6"/>
      </svg>
    </div>
  );
}

/* ---------- Auth Views ---------- */
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
      onOK?.();
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

/* ---------- Konto ---------- */
function AccountView({ session }) {
  const mail = session?.user?.email || "—";
  return (
    <section className="max-w-xl mx-auto">
      <Card title="Konto" subtitle="Deine Session">
        <div className="text-sm text-neutral-300">E-Mail: <span className="text-neutral-100">{mail}</span></div>
      </Card>
    </section>
  );
}

/* ---------- Haupt-App ---------- */
export default function App() {
  const [view, setView] = useState("home"); // "home" | "pricefinder" | "messagematcher" | "contentflow" | "login" | "register" | "account" | "admin"
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);

  // Session + Listener
  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (active) setSession(data.session ?? null);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => setSession(sess ?? null));
    return () => sub?.subscription?.unsubscribe?.();
  }, []);

  // Rolle
  useEffect(() => {
    let stop = false;
    (async () => {
      if (!session?.user?.id) { setRole(null); return; }
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
      <div className="app-shell">
        <TopBar />

        {/* AUTH */}
        {!session && view === "login" && (
          <LoginView onOK={() => setView("home")} onSwitch={() => setView("register")} />
        )}
        {!session && view === "register" && (
          <RegisterView onOK={() => setView("login")} onSwitch={() => setView("login")} />
        )}

        {/* HOME – als Karten */}
        {view === "home" && (
          <main className="space-y-10">
            <section className="max-w-3xl mx-auto">
              <Card>
                <p className="text-lg md:text-xl font-medium text-neutral-300">{greeting}</p>
              </Card>
            </section>

            <section className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 place-items-center">
                <FeatureCard
                  title="PriceFinder"
                  subtitle="Wohlfühl-, Wachstums- & Authority-Preis"
                  onOpen={() => setView("pricefinder")}
                  Icon={IconPrice}
                />
                <FeatureCard
                  title="MessageMatcher"
                  subtitle="Messaging-Map aus Bio/Website"
                  onOpen={() => setView("messagematcher")}
                  Icon={IconMessage}
                />
                <FeatureCard
                  title="ContentFlow"
                  subtitle="Hooks, Stories, Captions"
                  onOpen={() => setView("contentflow")}
                  Icon={IconFlow}
                />
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
          <section className="max-w-5xl mx-auto">
            <Crumb title="admin" />
            <div className="mt-3"><Button onClick={() => setView("home")}>← Zurück</Button></div>
            <Admin onBack={() => setView("home")} />
          </section>
        )}
      </div>
    </div>
  );
}
