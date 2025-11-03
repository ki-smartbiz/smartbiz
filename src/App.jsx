import { useState } from "react";
import "./index.css";

function Button({ children, onClick, variant = "solid", full = false }) {
  return (
    <button
      className={`btn ${variant === "outline" ? "btn--outline" : "btn--solid"} ${
        full ? "btn--full" : ""
      }`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function Card({ title, subtitle, children }) {
  return (
    <article className="card">
      {(title || subtitle) && (
        <header className="card__head">
          {title && <div className="card__title">{title}</div>}
          {subtitle && <div className="card__subtitle">{subtitle}</div>}
        </header>
      )}
      <div className="card__body">{children}</div>
    </article>
  );
}

function Topbar({ onHome, onAccount, onLogout }) {
  return (
    <header className="topbar">
      <h1 className="brand">SmartBiz Suite</h1>
      <nav className="nav">
        <Button variant="outline" onClick={onHome}>Home</Button>
        <Button variant="outline" onClick={onAccount}>Konto</Button>
        <Button onClick={onLogout}>Logout</Button>
      </nav>
    </header>
  );
}

export default function App() {
  const [view, setView] = useState("home"); // "home" | "account" | "tool"
  const [tool, setTool] = useState(null);   // null | "pricefinder" | "messagematcher" | "contentflow"

  const greeting = "Hey thomas, let’s move some mountains today ⚡";

  const openTool = (key) => {
    setTool(key);
    setView("tool");
  };

  const backHome = () => {
    setTool(null);
    setView("home");
  };

  return (
    <div className="app">
      <div className="app-shell">
        <Topbar
          onHome={backHome}
          onAccount={() => setView("account")}
          onLogout={() => alert("Logout (Demo)")}
        />

        {view === "home" && (
          <main className="stack">
            <section className="narrow">
              <Card>
                <p className="lead">{greeting}</p>
              </Card>
            </section>

            <section className="grid">
              <Card
                title="PriceFinder"
                subtitle="Wohlfühl-, Wachstums- & Authority-Preis"
              >
                <p className="muted">Klarer, sauberer Pricing-Flow.</p>
                <div className="mt">
                  <Button full onClick={() => openTool("pricefinder")}>Öffnen</Button>
                </div>
              </Card>

              <Card
                title="MessageMatcher"
                subtitle="Messaging-Map aus Bio/Website"
              >
                <p className="muted">Positionierung ohne Ratespiel.</p>
                <div className="mt">
                  <Button full onClick={() => openTool("messagematcher")}>Öffnen</Button>
                </div>
              </Card>

              <Card
                title="ContentFlow"
                subtitle="Hooks, Stories, Captions"
              >
                <p className="muted">Struktur rein, Output rauf.</p>
                <div className="mt">
                  <Button full onClick={() => openTool("contentflow")}>Öffnen</Button>
                </div>
              </Card>
            </section>
          </main>
        )}

        {view === "tool" && (
          <main className="stack">
            <div className="bar">
              <Button variant="outline" onClick={backHome}>← Zurück</Button>
              <div className="crumbs">
                <span className="muted">Home</span>
                <span className="sep">/</span>
                <span className="accent">
                  {tool === "pricefinder" ? "PriceFinder"
                    : tool === "messagematcher" ? "MessageMatcher"
                    : "ContentFlow"}
                </span>
              </div>
            </div>

            <section className="tool-layout">
              <aside className="tool-side">
                <Card title="Navigation">
                  <div className="vstack">
                    <Button variant="outline" full onClick={() => setTool("pricefinder")}>PriceFinder</Button>
                    <Button variant="outline" full onClick={() => setTool("messagematcher")}>MessageMatcher</Button>
                    <Button variant="outline" full onClick={() => setTool("contentflow")}>ContentFlow</Button>
                  </div>
                </Card>
              </aside>

              <section className="tool-main">
                <Card
                  title={
                    tool === "pricefinder" ? "PriceFinder" :
                    tool === "messagematcher" ? "MessageMatcher" : "ContentFlow"
                  }
                >
                  <p className="muted">
                    Hier kommt dein Modul-Content rein (Formulare/Flows). In dieser
                    Minimalversion ist es nur ein Platzhalter, damit wir das Layout
                    sauber testen können.
                  </p>
                </Card>
              </section>
            </section>
          </main>
        )}

        {view === "account" && (
          <main className="stack">
            <section className="narrow">
              <Card title="Konto">
                <p className="muted">Account-Einstellungen (Demo).</p>
                <div className="mt">
                  <Button variant="outline" onClick={backHome}>Zurück</Button>
                </div>
              </Card>
            </section>
          </main>
        )}
      </div>
    </div>
  );
}
