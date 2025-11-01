// src/App.jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabaseClient";
import Admin from "./pages/admin";
import PriceFinder from "./modules/PriceFinder";
import MessageMatcher from "./modules/MessageMatcher";
import ContentFlow from "./modules/ContentFlow";

const theme = {
  bg: "bg-[#0b0b0b]",
  text: "text-neutral-100",
  gold: "#d1a45f",
  goldHover: "#c2924d",
};

const Card = ({ title, subtitle, children, align = "center", className = "" }) => (
  <div
    className={[
      "rounded-2xl p-6 bg-[#171717] border border-[#2a2a2a]",
      "hover:border-[#3a3a3a] hover:shadow-[0_12px_32px_rgba(0,0,0,0.45)]",
      "transition-all duration-300",
      align === "left" ? "text-left" : "text-center",
      className,
    ].join(" ")}
  >
    {(title || subtitle) && (
      <div className="mb-3">
        {title && <div className="text-sm font-semibold" style={{ color: theme.gold }}>{title}</div>}
        {subtitle && <div className="text-xs mt-1 text-neutral-400">{subtitle}</div>}
      </div>
    )}
    {children}
  </div>
);

const Button = ({ children, onClick, variant = "solid", full = false, disabled = false, type = "button" }) => {
  const styleVars = { "--gold": theme.gold, "--goldHover": theme.goldHover };
  const base =
    variant === "solid"
      ? "bg-[var(--gold)] hover:bg-[var(--goldHover)] text-black"
      : "border border-[var(--gold)] text-[var(--gold)] hover:bg-[var(--gold)] hover:text-black";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={styleVars}
      className={[
        "rounded-2xl px-4 py-2 text-sm font-semibold transition-all duration-150",
        "hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 shadow-[0_3px_0_rgba(0,0,0,0.25)]",
        base,
        full ? "w-full" : "",
      ].join(" ")}
    >
      {children}
    </button>
  );
};

const TextInput = ({ label, type = "text", value, onChange, placeholder, autoComplete }) => (
  <div className="space-y-1">
    {label && <label className="text-sm text-neutral-300">{label}</label>}
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      autoComplete={autoComplete}
      className="w-full rounded-md bg-[#0f0f0f] border border-[#2a2a2a] px-3 py-2 text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-[var(--gold)]"
      style={{ "--gold": theme.gold }}
    />
  </div>
);

const Banner = ({ banner, onClose }) => {
  if (!banner) return null;
  const color =
    banner.type === "success"
      ? "bg-emerald-900/40 border-emerald-700 text-emerald-200"
      : banner.type === "error"
      ? "bg-rose-900/40 border-rose-700 text-rose-200"
      : "bg-[#141414] border border-[#2a2a2a] text-neutral-100";
  return (
    <div className={`mb-4 rounded-lg px-4 py-2 text-sm ${color}`}>
      <div className="flex items-start justify-between gap-3">
        <div>{banner.msg}</div>
        <button className="text-xs opacity-70 hover:opacity-100" onClick={onClose} aria-label="Close">✕</button>
      </div>
    </div>
  );
};

/* ===== Auth Views (Login/Recovery/Register/Account) – unverändert funktional, gekürzt wo möglich ===== */
function LoginView({ setBanner, setView }) {
  const [email, setEmail] = useState(""); const [pw, setPw] = useState("");
  const [err, setErr] = useState(""); const [loading, setLoading] = useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const signInWithPassword = (em, p) => supabase.auth.signInWithPassword({ email: (em||"").trim().toLowerCase(), password: p });
  const signInWithMagicLink = (em) => supabase.auth.signInWithOtp({ email: (em||"").trim().toLowerCase(), options: { emailRedirectTo: origin } });
  const sendReset = (em) => supabase.auth.resetPasswordForEmail((em||"").trim().toLowerCase(), { redirectTo: `${origin}/#recovery` });

  const onLogin = async (e) => { e.preventDefault(); setLoading(true); setErr("");
    try { const { error } = await signInWithPassword(email, pw); if (error) throw error;
      setBanner({ type: "success", msg: "Eingeloggt. Willkommen zurück!" });
    } catch (e2) { setErr(e2?.message || "Invalid login credentials."); }
    finally { setLoading(false); } };

  return (
    <Card title="Login" subtitle="Willkommen zurück">
      <form className="space-y-3" onSubmit={onLogin}>
        <TextInput label="E-Mail" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@domain.com" autoComplete="username" />
        <TextInput label="Passwort" type="password" value={pw} onChange={(e)=>setPw(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
        {err && <div className="text-sm text-rose-400">{err}</div>}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={loading}>{loading ? "Einloggen…" : "Einloggen"}</Button>
          <Button variant="outline" onClick={()=>signInWithMagicLink(email)} disabled={loading}>Magic Link</Button>
          <button className="text-sm underline decoration-neutral-600 hover:decoration-neutral-300" onClick={()=>sendReset(email)} disabled={loading}>Passwort vergessen?</button>
          <span className="opacity-40">|</span>
          <button className="text-sm underline decoration-neutral-600 hover:decoration-neutral-300" onClick={()=>setView("register")}>Jetzt registrieren</button>
        </div>
      </form>
    </Card>
  );
}

function RecoveryView({ setBanner }) {
  const [pw1, setPw1] = useState(""); const [pw2, setPw2] = useState("");
  const [err, setErr] = useState(""); const [loading, setLoading] = useState(false);
  const onSubmit = async (e) => { e.preventDefault(); setErr("");
    if (!pw1 || pw1 !== pw2) return setErr("Passwörter stimmen nicht überein.");
    setLoading(true);
    try { const { error } = await supabase.auth.updateUser({ password: pw1 }); if (error) throw error;
      setBanner({ type: "success", msg: "Passwort gesetzt. Du bist eingeloggt." });
      if (typeof window !== "undefined") window.history.replaceState({}, "", window.location.pathname);
    } catch (e2) { setErr(e2?.message || "Passwort konnte nicht gesetzt werden."); }
    finally { setLoading(false); } };
  return (
    <Card title="Neues Passwort setzen">
      <form className="space-y-3" onSubmit={onSubmit}>
        <TextInput label="Neues Passwort" type="password" value={pw1} onChange={(e)=>setPw1(e.target.value)} placeholder="••••••••" autoComplete="new-password" />
        <TextInput label="Wiederholen" type="password" value={pw2} onChange={(e)=>setPw2(e.target.value)} placeholder="••••••••" autoComplete="new-password" />
        {err && <div className="text-sm text-rose-400">{err}</div>}
        <Button type="submit" disabled={loading}>{loading ? "Speichere…" : "Passwort speichern"}</Button>
      </form>
    </Card>
  );
}

function RegisterView({ setBanner, setView }) {
  const [first, setFirst] = useState(""); const [email, setEmail] = useState(""); const [pw, setPw] = useState("");
  const [err, setErr] = useState(""); const [loading, setLoading] = useState(false);
  const signUp = (em, p) => supabase.auth.signUp({ email: (em||"").trim().toLowerCase(), password: p });

  const onRegister = async (e) => { e.preventDefault(); setLoading(true); setErr("");
    try {
      const { data, error } = await signUp(email, pw); if (error) throw error;
      const uid = data?.user?.id;
      if (uid) {
        const { error: pe } = await supabase.from("profiles").upsert({
          id: uid, email: email.trim().toLowerCase(), role: "user", first_name: first || null,
        }); if (pe) throw pe;
      }
      setBanner({ type: "success", msg: "Registrierung erfolgreich. Bitte einloggen." }); setView("login");
    } catch (e2) { setErr(e2?.message || "Registrierung fehlgeschlagen."); }
    finally { setLoading(false); } };

  return (
    <Card title="Registrieren" subtitle="Starte los">
      <form className="space-y-3" onSubmit={onRegister}>
        <TextInput label="Vorname" value={first} onChange={(e)=>setFirst(e.target.value)} placeholder="Dein Name" />
        <TextInput label="E-Mail" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@domain.com" autoComplete="username" />
        <TextInput label="Passwort" type="password" value={pw} onChange={(e)=>setPw(e.target.value)} placeholder="••••••••" autoComplete="new-password" />
        {err && <div className="text-sm text-rose-400">{err}</div>}
        <div className="flex gap-3">
          <Button type="submit" disabled={loading}>{loading ? "Registriere…" : "Registrieren"}</Button>
          <Button variant="outline" onClick={()=>setView("login")}>Zurück zum Login</Button>
        </div>
      </form>
    </Card>
  );
}

function AccountView({ me, setBanner }) {
  const [first, setFirst] = useState(me?.first_name || ""); const [saving, setSaving] = useState(false);
  const saveProfile = async (e) => { e.preventDefault(); setSaving(true);
    try { const { error } = await supabase.from("profiles").update({ first_name: first }).eq("id", me.id);
      if (error) throw error; setBanner({ type: "success", msg: "Profil gespeichert." });
    } catch { setBanner({ type: "error", msg: "Profil konnte nicht gespeichert werden." }); }
    finally { setSaving(false); } };
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card title="Profil" subtitle="Dein öffentlicher Name" align="left">
        <form onSubmit={saveProfile} className="space-y-3">
          <TextInput label="Vorname" value={first} onChange={(e)=>setFirst(e.target.value)} placeholder="Christina" />
          <Button type="submit" disabled={saving}>{saving ? "Speichere…" : "Speichern"}</Button>
        </form>
      </Card>
      <Card title="Info" align="left">
        <div className="text-sm text-neutral-400">
          {me?.email ? <>E-Mail: <span className="text-neutral-200">{me.email}</span></> : "Kein Profil geladen."}
        </div>
      </Card>
    </div>
  );
}

/* ========================= APP ========================= */
export default function App() {
  const [session, setSession] = useState(null);
  const [me, setMe] = useState(null);
  const [view, setView] = useState("home");
  const [tool, setTool] = useState(null);
  const [banner, setBanner] = useState(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === "#recovery") setView("recovery");
  }, []);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session ?? null);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => setSession(sess ?? null));
    return () => sub?.subscription?.unsubscribe?.();
  }, []);
  useEffect(() => {
    if (!session?.user?.id) return setMe(null);
    (async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
      setMe(error ? { email: session.user.email } : data ?? { email: session.user.email });
    })();
  }, [session]);

  const greeting = useMemo(() => {
    const first = me?.first_name?.trim();
    const emailSrc = me?.email || session?.user?.email || "";
    const nick = first || emailSrc.split("@")[0] || "there";
    return `Hey ${nick}, let’s move some mountains today ⚡️`;
  }, [me, session]);

  const logout = async () => {
    await supabase.auth.signOut();
    setBanner({ type: "neutral", msg: "Abgemeldet." });
    setTool(null);
    setView("login");
  };

  const TopBar = () => (
  <header className="mb-10 flex flex-col items-center gap-4 md:flex-row md:items-center md:justify-between">
    <h1
      className="text-4xl md:text-5xl font-extrabold tracking-tight text-center md:text-left"
      style={{ color: theme.gold }}
    >
      SmartBiz Suite{" "}
      <span className="text-sm opacity-60 align-middle">
        ({import.meta.env?.VITE_BUILD_TAG ?? "dev"})
      </span>
    </h1>

    <nav className="flex flex-wrap items-center justify-center gap-2">
      {/* deine Buttons */}
    </nav>
  </header>
  );

  const ToolHeader = () => {
    if (!tool) return null;
    const title = tool === "pricefinder" ? "PriceFinder" : tool === "messagematcher" ? "MessageMatcher" : "ContentFlow";
    return (
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button className="text-sm text-neutral-400 hover:text-neutral-200" onClick={() => setTool(null)}>Home</button>
          <span className="text-neutral-600">/</span>
          <span className="text-sm" style={{ color: theme.gold }}>{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setTool(null)}>← Zurück</Button>
          <Button variant="outline" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Nach oben</Button>
        </div>
      </div>
    );
  };

  return (
    <div className={`min-h-screen flex justify-center items-start ${theme.bg} ${theme.text}`}>
      <div className="app-shell w-full">
        <TopBar />
        <Banner banner={banner} onClose={() => setBanner(null)} />
        <ToolHeader />

        <main className="space-y-10">
          {session && view === "home" && !tool && (
            <>
              <section className="max-w-3xl mx-auto text-center">
                <Card className="py-10">
                  <p className="text-lg md:text-xl font-medium text-neutral-300">{greeting}</p>
                </Card>
              </section>

              <section className="max-w-7xl mx-auto">
                <div className="cards-center">
                  <Card title="PriceFinder" subtitle="Wohlfühl-, Wachstums- & Authority-Preis" className="w-[22rem]">
                    <p className="text-sm text-neutral-400 mb-6">Klarer, sauberer Pricing-Flow.</p>
                    <Button onClick={() => setTool("pricefinder")} full>Öffnen</Button>
                  </Card>
                  <Card title="MessageMatcher" subtitle="Messaging-Map aus Bio/Website" className="w-[22rem]">
                    <p className="text-sm text-neutral-400 mb-6">Positionierung ohne Ratespiel.</p>
                    <Button onClick={() => setTool("messagematcher")} full>Öffnen</Button>
                  </Card>
                  <Card title="ContentFlow" subtitle="Hooks, Stories, Captions" className="w-[22rem]">
                    <p className="text-sm text-neutral-400 mb-6">Struktur rein, Output rauf.</p>
                    <Button onClick={() => setTool("contentflow")} full>Öffnen</Button>
                  </Card>
                </div>
              </section>
            </>
          )}

          {session && tool && (
            <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-6">
              <aside className="lg:col-span-4 space-y-3">
                <Card title="Navigation" align="left">
                  <div className="grid gap-2">
                    <Button variant="outline" onClick={() => setTool("pricefinder")} full>PriceFinder</Button>
                    <Button variant="outline" onClick={() => setTool("messagematcher")} full>MessageMatcher</Button>
                    <Button variant="outline" onClick={() => setTool("contentflow")} full>ContentFlow</Button>
                    <Button variant="outline" onClick={() => setTool(null)} full>Zur Übersicht</Button>
                  </div>
                </Card>
              </aside>

              <section className="lg:col-span-8 space-y-4">
                {tool === "pricefinder" && <Card title="PriceFinder" align="left"><PriceFinder /></Card>}
                {tool === "messagematcher" && <Card title="MessageMatcher" align="left"><MessageMatcher /></Card>}
                {tool === "contentflow" && <Card title="ContentFlow" align="left"><ContentFlow /></Card>}
              </section>
            </div>
          )}

          {!session && view === "login" && <LoginView setBanner={setBanner} setView={setView} />}
          {!session && view === "register" && <RegisterView setBanner={setBanner} setView={setView} />}
          {view === "recovery" && <RecoveryView setBanner={setBanner} />}
          {session && view === "account" && !tool && <AccountView me={me} setBanner={setBanner} />}
          {session && view === "admin" && !tool && (
            <Card title="Admin Panel" align="left">
              <Admin onBack={() => setView("home")} />
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}
