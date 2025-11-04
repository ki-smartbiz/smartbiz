// src/App.jsx
import { useEffect, useState } from "react";

// Supabase optional einbinden – wenn die ENV fehlt, crashen wir nicht
let supabase = null;
try {
  // nur laden, wenn die Datei existiert
  // (falls du sie noch nicht hast, lässt sich das hier gefahrlos überspringen)
  // eslint-disable-next-line import/no-unresolved
  supabase = (await import("./lib/supabaseClient")).supabase;
} catch (_) {}

const theme = {
  bg: "bg-[#0b0b0b]",
  text: "text-neutral-100",
  gold: "#d1a45f",
};

function Button({ children, onClick, variant = "outline" }) {
  const cls =
    variant === "solid"
      ? "bg-[#d1a45f] text-black hover:brightness-95"
      : "border border-[#d1a45f] text-[#d1a45f] hover:bg-[#d1a45f] hover:text-black";
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${cls}`}
    >
      {children}
    </button>
  );
}

export default function App() {
  const [view, setView] = useState("home"); // 'home' | 'pricefinder' | 'messagematcher' | 'contentflow'
  const [session, setSession] = useState(null);

  // Session rudimentär verwalten (funktioniert auch ohne Supabase)
  useEffect(() => {
    let unsub;
    (async () => {
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      setSession(data?.session ?? null);
      const sub = supabase.auth.onAuthStateChange((_e, s) => setSession(s ?? null));
      unsub = sub?.subscription?.unsubscribe;
    })();
    return () => unsub?.();
  }, []);

  const logout = async () => {
    try {
      if (supabase) await supabase.auth.signOut();
    } catch (e) {
      console.warn("logout warn:", e?.message);
    } finally {
      setSession(null);
      setView("home");
    }
  };

  const TopBar = () => (
    <header className="mb-8">
      <h1
        className="text-4xl md:text-5xl font-extrabold tracking-tight"
        style={{ color: theme.gold }}
      >
        SmartBiz Suite
      </h1>

      <nav className="mt-3 flex flex-wrap items-center gap-2">
        <Button onClick={() => setView("home")}>Home</Button>
        <Button onClick={() => setView("account")}>Konto</Button>
        <Button variant="solid" onClick={logout}>Logout</Button>
      </nav>
    </header>
  );

  const Crumb = ({ title }) => (
    <div className="mb-4 flex items-center gap-2 text-sm">
      <span className="opacity-70">Home</span>
      <span className="opacity-50">/</span>
      <span style={{ color: theme.gold }}>{title}</span>
    </div>
  );

  return (
    <div className={`min-h-screen ${theme.bg} ${theme.text}`}>
      {/* HARTES ZENTRIEREN – dieser Wrapper ist entscheidend */}
      <div className="app-shell">
        <TopBar />

        {view === "home" && (
          <main className="space-y-10">
            <section className="max-w-3xl mx-auto">
              <div className="rounded-2xl p-6 bg-[#141414] border border-[#2a2a2a]">
                <p className="text-lg">
                  Hey {session ? "du bist eingeloggt." : "thomas"}, let’s move some mountains today ⚡️
                </p>
              </div>
            </section>

            <section className="max-w-7xl mx-auto">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card
                  title="PriceFinder"
                  subtitle="Wohlfühl-, Wachstums- & Authority-Preis"
                  onOpen={() => setView("pricefinder")}
                />
                <Card
                  title="MessageMatcher"
                  subtitle="Messaging-Map aus Bio/Website"
                  onOpen={() => setView("messagematcher")}
                />
                <Card
                  title="ContentFlow"
                  subtitle="Hooks, Stories, Captions"
                  onOpen={() => setView("contentflow")}
                />
              </div>
            </section>
          </main>
        )}

        {view === "pricefinder" && (
          <section className="max-w-5xl mx-auto">
            <Crumb title="pricefinder" />
            <Button onClick={() => setView("home")}>← Zurück</Button>
            <div className="mt-6 text-xl">
              Hier würde jetzt das Modul <b>pricefinder</b> geladen.
            </div>
          </section>
        )}

        {view === "messagematcher" && (
          <section className="max-w-5xl mx-auto">
            <Crumb title="messagematcher" />
            <Button onClick={() => setView("home")}>← Zurück</Button>
            <div className="mt-6 text-xl">
              Hier würde jetzt das Modul <b>messagematcher</b> geladen.
            </div>
          </section>
        )}

        {view === "contentflow" && (
          <section className="max-w-5xl mx-auto">
            <Crumb title="contentflow" />
            <Button onClick={() => setView("home")}>← Zurück</Button>
            <div className="mt-6 text-xl">
              Hier würde jetzt das Modul <b>contentflow</b> geladen.
            </div>
          </section>
        )}

        {view === "account" && (
          <section className="max-w-5xl mx-auto">
            <Crumb title="account" />
            <Button onClick={() => setView("home")}>← Zurück</Button>
            <div className="mt-6 text-xl">Account-Bereich (Stub).</div>
          </section>
        )}
      </div>
    </div>
  );
}

function Card({ title, subtitle, onOpen }) {
  return (
    <div className="rounded-2xl p-6 bg-[#141414] border border-[#2a2a2a] hover:border-[#3a3a3a] transition">
      <div className="mb-3">
        <div className="text-sm font-semibold" style={{ color: "#d1a45f" }}>
          {title}
        </div>
        <div className="text-xs mt-1 text-neutral-400">{subtitle}</div>
      </div>
      <Button variant="solid" onClick={onOpen}>Öffnen</Button>
    </div>
  );
}
