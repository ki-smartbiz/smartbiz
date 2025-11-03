// Minimal-UI zum Verifizieren, dass index.css greift
export default function App() {
  return (
    <div className="app">
      <div className="app-shell">
        <header className="topbar">
          <h1 className="app-title">
            SmartBiz Suite
            <span className="build-tag">{import.meta.env.VITE_BUILD_TAG ?? "dev"}</span>
          </h1>

          <nav className="nav">
            <button className="btn btn--outline">Home</button>
            <button className="btn btn--outline">Konto</button>
            <button className="btn btn--primary">Logout</button>
          </nav>
        </header>

        <main className="section">
          <section className="cards">
            <div className="card card--app">
              <div className="card__head">
                <div className="card__title">PriceFinder</div>
                <div className="card__subtitle">Wohlfühl-, Wachstums- & Authority-Preis</div>
              </div>
              <p className="muted">Klarer, sauberer Pricing-Flow.</p>
              <div className="spacer"></div>
              <button className="btn btn--primary btn--full">Öffnen</button>
            </div>

            <div className="card card--app">
              <div className="card__head">
                <div className="card__title">MessageMatcher</div>
                <div className="card__subtitle">Messaging-Map aus Bio/Website</div>
              </div>
              <p className="muted">Positionierung ohne Ratespiel.</p>
              <div className="spacer"></div>
              <button className="btn btn--primary btn--full">Öffnen</button>
            </div>

            <div className="card card--app">
              <div className="card__head">
                <div className="card__title">ContentFlow</div>
                <div className="card__subtitle">Hooks, Stories, Captions</div>
              </div>
              <p className="muted">Struktur rein, Output rauf.</p>
              <div className="spacer"></div>
              <button className="btn btn--primary btn--full">Öffnen</button>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
