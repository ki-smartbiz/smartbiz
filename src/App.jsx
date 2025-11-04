// src/App.jsx5
import { useState } from "react";

export default function App() {
  const [tool, setTool] = useState(null);

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-neutral-100">
      {/* HARTES Zentrier-Wrapper: funktioniert in Tailwind v4 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Topbar */}
        <header className="mb-10 flex flex-col items-center gap-4 md:flex-row md:items-center md:justify-between">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-center md:text-left" style={{ color: "#d1a45f" }}>
            SmartBiz Suite
          </h1>
          <nav className="flex flex-wrap items-center justify-center gap-2">
            <Button variant="outline" onClick={() => { setTool(null); }}>Home</Button>
            <Button variant="outline">Konto</Button>
            <Button>Logout</Button>
          </nav>
        </header>

        {/* Greeting */}
        {!tool && (
          <section className="max-w-3xl mx-auto mb-10">
            <Card>
              <p className="text-lg md:text-xl font-medium text-neutral-300">
                Hey thomas, let’s move some mountains today ⚡
              </p>
            </Card>
          </section>
        )}

        {/* Apps – sauber mittig in Zeile, umbrechend */}
        {!tool && (
          <section className="max-w-7xl mx-auto">
            <div className="flex flex-wrap justify-center gap-8">
              <AppCard
                title="PriceFinder"
                subtitle="Wohlfühl-, Wachstums- & Authority-Preis"
                onOpen={() => setTool("pricefinder")}
              />
              <AppCard
                title="MessageMatcher"
                subtitle="Messaging-Map aus Bio/Website"
                onOpen={() => setTool("messagematcher")}
              />
              <AppCard
                title="ContentFlow"
                subtitle="Hooks, Stories, Captions"
                onOpen={() => setTool("contentflow")}
              />
            </div>
          </section>
        )}

        {/* Dummy-Module-Fläche (zentriert) */}
        {tool && (
          <section className="max-w-5xl mx-auto">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button className="text-sm text-neutral-400 hover:text-neutral-200" onClick={() => setTool(null)}>Home</button>
                <span className="text-neutral-600">/</span>
                <span className="text-sm" style={{ color: "#d1a45f" }}>{tool}</span>
              </div>
              <Button variant="outline" onClick={() => setTool(null)}>← Zurück</Button>
            </div>

            <Card align="left">
              <p className="text-neutral-300">
                Hier würde jetzt das Modul <span className="font-semibold">{tool}</span> geladen.
              </p>
            </Card>
          </section>
        )}
      </div>
    </div>
  );
}

/* ---------- kleine UI-Primitives ---------- */

function Card({ children, align = "center", className = "" }) {
  return (
    <div
      className={`rounded-2xl p-6 bg-[#171717] border border-[#3a3a3a] hover:border-[#4a4a4a] hover:shadow-[0_12px_32px_rgba(0,0,0,0.45)] transition-all duration-300 ${align === "left" ? "text-left" : "text-center"} ${className}`}
    >
      {children}
    </div>
  );
}

function Button({ children, onClick, variant = "solid", className = "" }) {
  const gold = "#d1a45f";
  const goldHover = "#c2924d";
  const styleVars = { "--gold": gold, "--goldHover": goldHover };
  const base =
    variant === "solid"
      ? "bg-[var(--gold)] hover:bg-[var(--goldHover)] text-black"
      : "border border-[var(--gold)] text-[var(--gold)] hover:bg-[var(--gold)] hover:text-black";
  return (
    <button
      onClick={onClick}
      style={styleVars}
      className={`rounded-2xl px-4 py-2 text-sm font-semibold transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 shadow-[0_3px_0_rgba(0,0,0,0.25)] ${base} ${className}`}
    >
      {children}
    </button>
  );
}

function AppCard({ title, subtitle, onOpen }) {
  return (
    <Card className="w-[22rem]">
      <div className="mb-3">
        <div className="text-sm font-semibold tracking-wide" style={{ color: "#d1a45f" }}>{title}</div>
        <div className="text-xs mt-1 text-neutral-400">{subtitle}</div>
      </div>
      <p className="text-sm text-neutral-400">Klarer, sauberer Flow.</p>
      <div className="mt-6">
        <Button onClick={onOpen} className="w-full">Öffnen</Button>
      </div>
    </Card>
  );
}
