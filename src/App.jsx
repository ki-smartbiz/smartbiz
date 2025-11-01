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

/* ========================= UI PRIMITIVES ========================= */
const Card = ({ title, subtitle, children, align = "center" }) => (
  <div
    className={`rounded-2xl p-6 bg-[#171717] border border-[#2a2a2a] 
      hover:border-[#3a3a3a] hover:shadow-[0_12px_32px_rgba(0,0,0,0.45)]
      transition-all duration-300 ${align === "left" ? "text-left" : "text-center"}`}
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

const Button = ({ children, onClick, variant = "solid", full = false, disabled = false }) => {
  const styleVars = { "--gold": theme.gold, "--goldHover": theme.goldHover };
  const base =
    variant === "solid"
      ? "bg-[var(--gold)] hover:bg-[var(--goldHover)] text-black"
      : "border border-[var(--gold)] text-[var(--gold)] hover:bg-[var(--gold)] hover:text-black";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={styleVars}
      className={`rounded-2xl px-4 py-2 text-sm font-semibold transition-all duration-150
        hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 shadow-[0_3px_0_rgba(0,0,0,0.25)]
        ${base} ${full ? "w-full" : ""}`}
    >
      {children}
    </button>
  );
};

/* ========================= APP ========================= */
export default function App() {
  const [session, setSession] = useState(null);
  const [me, setMe] = useState(null);
  const [view, setView] = useState("home");
  const [tool, setTool] = useState(null);

  /* ----- AUTH ----- */
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
      const { data } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
      setMe(data ?? { email: session.user.email });
    };
    loadProfile();
  }, [session]);

  const greeting = useMemo(() => {
    const first = me?.first_name?.trim();
    const name = first || me?.email?.split("@")[0] || "there";
    return `Hey ${name}, let’s move some mountains today ⚡️`;
  }, [me]);

  const logout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setTool(null);
    setView("login");
  };

  /* ========================= LAYOUT ========================= */
  return (
    <div className={`min-h-screen flex justify-center items-start ${theme.bg} ${theme.text}`}>
      <div className="app-shell w-full max-w-7xl py-10">
        {/* HEADER */}
        <header className="mb-10 text-center">
          <h1 className="text-5xl font-extrabold tracking-tight mb-6" style={{ color: theme.gold }}>
            SmartBiz Suite
          </h1>
          <nav className="flex flex-wrap justify-center gap-2">
            {session ? (
              <>
                <Button variant="outline" onClick={() => { setTool(null); setView("home"); }}>Home</Button>
                <Button variant="outline" onClick={() => setView("account")}>Konto</Button>
                {me?.role === "admin" && (
                  <Button variant="outline" onClick={() => setView("admin")}>Admin</Button>
                )}
                <Button onClick={logout}>Logout</Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setView("login")}>Login</Button>
                <Button onClick={() => setView("register")}>Registrieren</Button>
              </>
            )}
          </nav>
        </header>

        {/* MAIN */}
        <main className="space-y-10 text-center">
          {/* HOME */}
          {session && view === "home" && !tool && (
            <>
              <Card>
                <p className="text-lg md:text-xl font-medium text-neutral-300">{greeting}</p>
              </Card>
              <div className="flex flex-wrap justify-center gap-8">
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
            </>
          )}

          {/* TOOLS */}
          {session && tool && (
            <div className="grid lg:grid-cols-12 gap-6 text-left">
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

          {/* ADMIN */}
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
