// src/App.jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabaseClient";
import Admin from "./pages/admin";
import PriceFinder from "./modules/PriceFinder";
import MessageMatcher from "./modules/MessageMatcher";
import ContentFlow from "./modules/ContentFlow";

/* ========================= THEME ========================= */
const theme = {
  bg: "bg-[#0b0b0b]",
  text: "text-neutral-100",
  gold: "#d1a45f",
  goldHover: "#c2924d",
};

/* ========================= BASICS ========================= */
function Card({ title, subtitle, className = "", children, align = "center" }) {
  const alignCls = align === "left" ? "text-left" : "text-center";
  return (
    <div
      className={`rounded-2xl p-6 transition-all duration-300 bg-[#171717] border border-[#3a3a3a]
        hover:border-[#4a4a4a] hover:shadow-[0_12px_32px_rgba(0,0,0,0.45)]
        ${alignCls} ${className}`}
    >
      {(title || subtitle) && (
        <div className="mb-3">
          {title && (
            <div className="text-sm font-semibold tracking-wide" style={{ color: theme.gold }}>
              {title}
            </div>
          )}
          {subtitle && <div className="text-xs mt-1 text-neutral-400">{subtitle}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

function Button({
  children,
  onClick,
  variant = "solid",
  className = "",
  type = "button",
  disabled = false,
  full = false,
}) {
  const styleVars = { "--gold": theme.gold, "--goldHover": theme.goldHover };
  const baseSolid = "hover:bg-[var(--goldHover)]";
  const baseOutline =
    "border border-[var(--gold)] text-[var(--gold)] hover:bg-[var(--gold)] hover:text-black";
  const base = variant === "solid" ? baseSolid : baseOutline;
  const inlineSolid = variant === "solid" ? { backgroundColor: "var(--gold)", color: "#0b0b0b" } : {};
  const widthCls = full ? "w-full" : "";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{ ...styleVars, ...inlineSolid }}
      className={`rounded-2xl px-4 py-2 text-sm font-semibold transition-all duration-150
        disabled:opacity-50 ${base} ${widthCls} ${className}
        hover:-translate-y-0.5 active:translate-y-0 shadow-[0_3px_0_rgba(0,0,0,0.25)]`}
    >
      {children}
    </button>
  );
}

function Banner({ banner, onClose }) {
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
        <button className="text-xs opacity-70 hover:opacity-100" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>
    </div>
  );
}

/* ========================= CORE APP ========================= */
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
    const loadProfile = async () => {
      const uid = session.user.id;
      const { data, error } = await supabase.from("profiles").select("*").eq("id", uid).single();
      setMe(error ? { email: session.user.email } : data ?? { email: session.user.email });
    };
    loadProfile();
  }, [session]);

  const greeting = useMemo(() => {
    const first = me?.first_name?.trim();
    if (first) return `Hey ${first}, let’s move some mountains today ⚡️`;
    const emailSrc = me?.email || session?.user?.email || "";
    const nick = emailSrc.split("@")[0];
    return `Hey ${nick || "there"}, let’s move some mountains today ⚡️`;
  }, [me, session]);

  const handleLogout = async () => {
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
        SmartBiz Suite
      </h1>
      <nav className="flex flex-wrap items-center justify-center gap-2">
        {session ? (
          <>
            <Button variant="outline" onClick={() => { setTool(null); setView("home"); }}>Home</Button>
            <Button variant="outline" onClick={() => { setTool(null); setView("account"); }}>Konto</Button>
            {me?.role === "admin" && (
              <Button variant="outline" onClick={() => { setTool(null); setView("admin"); }}>Admin</Button>
            )}
            <Button onClick={handleLogout}>Logout</Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={() => setView("login")}>Login</Button>
            <Button onClick={() => setView("register")}>Registrieren</Button>
          </>
        )}
      </nav>
    </header>
  );

  const ToolHeader = () => {
    if (!tool) return null;
    const title =
      tool === "pricefinder" ? "PriceFinder" :
      tool === "messagematcher" ? "MessageMatcher" : "ContentFlow";
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

  /* ========================= LAYOUT ========================= */
  return (
    <div className={`min-h-screen flex justify-center ${theme.bg} ${theme.text}`}>
      <div className="app-shell w-full">
        <TopBar />
        <Banner banner={banner} onClose={() => setBanner(null)} />
        <ToolHeader />

        <main className="space-y-10 text-center">
          {/* HOME */}
          {session && view === "home" && !tool && (
            <>
              <section className="max-w-3xl mx-auto">
                <Card className="py-10">
                  <p className="text-lg md:text-xl font-medium text-neutral-300">{greeting}</p>
                </Card>
              </section>

              <section className="max-w-7xl mx-auto">
                <div className="flex flex-wrap justify-center gap-8">
                  <Card title="PriceFinder" subtitle="Wohlfühl-, Wachstums- & Authority-Preis" className="w-[22rem] mx-auto">
                    <p className="text-sm text-neutral-400">Klarer, sauberer Pricing-Flow.</p>
                    <div className="mt-6">
                      <Button onClick={() => setTool("pricefinder")} full>Öffnen</Button>
                    </div>
                  </Card>

                  <Card title="MessageMatcher" subtitle="Messaging-Map aus Bio/Website" className="w-[22rem] mx-auto">
                    <p className="text-sm text-neutral-400">Positionierung ohne Ratespiel.</p>
                    <div className="mt-6">
                      <Button onClick={() => setTool("messagematcher")} full>Öffnen</Button>
                    </div>
                  </Card>

                  <Card title="ContentFlow" subtitle="Hooks, Stories, Captions" className="w-[22rem] mx-auto">
                    <p className="text-sm text-neutral-400">Struktur rein, Output rauf.</p>
                    <div className="mt-6">
                      <Button onClick={() => setTool("contentflow")} full>Öffnen</Button>
                    </div>
                  </Card>
                </div>
              </section>
            </>
          )}

          {/* TOOLS */}
          {session && tool && (
            <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-6 text-left">
              <aside className="lg:col-span-4 space-y-3">
                <Card title="Navigation" align="left">
                  <div className="grid gap-2">
                    <Button variant="outline" className={tool === "pricefinder" ? "opacity-100" : "opacity-70"} onClick={() => setTool("pricefinder")} full>PriceFinder</Button>
                    <Button variant="outline" className={tool === "messagematcher" ? "opacity-100" : "opacity-70"} onClick={() => setTool("messagematcher")} full>MessageMatcher</Button>
                    <Button variant="outline" className={tool === "contentflow" ? "opacity-100" : "opacity-70"} onClick={() => setTool("contentflow")} full>ContentFlow</Button>
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

          {/* ACCOUNT / ADMIN */}
          {session && view === "account" && !tool && <Admin onBack={() => setView("home")} />}
          {session && view === "admin" && !tool && <Admin onBack={() => setView("home")} />}
        </main>
      </div>
    </div>
  );
}
