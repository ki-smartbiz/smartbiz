// src/App.jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabaseClient";

// Achtung: Datei heißt klein geschrieben "admin.jsx"
import Admin from "./pages/admin";
import PriceFinder from "./modules/PriceFinder";
import MessageMatcher from "./modules/MessageMatcher";
import ContentFlow from "./modules/ContentFlow";

/* =============== Primitive UI-Komponenten (klassenbasiert) =============== */
function Card({ title, subtitle, align = "center", className = "", children }) {
  return (
    <div className={`card ${align === "left" ? "card--left" : ""} ${className}`}>
      {(title || subtitle) && (
        <div className="card__head">
          {title && <div className="card__title">{title}</div>}
          {subtitle && <div className="card__subtitle">{subtitle}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

function Banner({ banner, onClose }) {
  if (!banner) return null;
  const tone =
    banner.type === "success" ? "banner--success" :
    banner.type === "error"   ? "banner--error"   :
                                "banner";
  return (
    <div className={`banner ${tone}`}>
      <div className="banner__inner">
        <div>{banner.msg}</div>
        <button className="btn btn--link" onClick={onClose} aria-label="Banner schließen">
          ✕
        </button>
      </div>
    </div>
  );
}

function Button({
  children,
  onClick,
  type = "button",
  variant = "primary", // primary | outline | link
  full = false,
  disabled = false,
  className = "",
}) {
  const v =
    variant === "outline" ? "btn--outline" :
    variant === "link"    ? "btn--link" :
                            "btn--primary";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`btn ${v} ${full ? "btn--full" : ""} ${className}`}
    >
      {children}
    </button>
  );
}

function FadeIn({ children, inKey }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOn(false);
    const t = setTimeout(() => setOn(true), 10);
    return () => clearTimeout(t);
  }, [inKey]);
  return <div className={`fade ${on ? "fade--in" : ""}`}>{children}</div>;
}

function TextInput({ label, type = "text", value, onChange, placeholder, autoComplete }) {
  return (
    <div className="field">
      {label && <label className="field__label">{label}</label>}
      <input
        className="input"
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
    </div>
  );
}

/* ============================== Auth Views ============================== */
function LoginView({ setBanner, setView }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const signInWithPassword = (emailRaw, password) => {
    const e = (emailRaw || "").trim().toLowerCase();
    return supabase.auth.signInWithPassword({ email: e, password });
  };
  const signInWithMagicLink = (emailRaw) => {
    const e = (emailRaw || "").trim().toLowerCase();
    return supabase.auth.signInWithOtp({ email: e, options: { emailRedirectTo: origin } });
  };
  const sendReset = (emailRaw) => {
    const e = (emailRaw || "").trim().toLowerCase();
    return supabase.auth.resetPasswordForEmail(e, { redirectTo: `${origin}/#recovery` });
  };

  const onLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErr("");
    try {
      const { error } = await signInWithPassword(email, pw);
      if (error) throw error;
      setBanner({ type: "success", msg: "Eingeloggt. Willkommen zurück!" });
    } catch (e2) {
      setErr(e2?.message || "Invalid login credentials.");
    } finally {
      setLoading(false);
    }
  };
  const onMagic = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErr("");
    try {
      const { error } = await signInWithMagicLink(email);
      if (error) throw error;
      setBanner({ type: "success", msg: "Magic Link gesendet. Prüfe dein Postfach." });
    } catch (e2) {
      setErr(e2?.message || "Magic Link konnte nicht gesendet werden.");
    } finally {
      setLoading(false);
    }
  };
  const onForgot = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErr("");
    try {
      const { error } = await sendReset(email);
      if (error) throw error;
      setBanner({ type: "success", msg: "Reset-Link verschickt. Prüfe dein Postfach." });
    } catch (e2) {
      setErr(e2?.message || "Reset-E-Mail konnte nicht gesendet werden.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Login" subtitle="Willkommen zurück">
      <form className="form" onSubmit={onLogin}>
        <TextInput
          label="E-Mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@domain.com"
          autoComplete="username"
        />
        <TextInput
          label="Passwort"
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
        />
        {err && <div className="form__error">{err}</div>}
        <div className="row gap">
          <Button type="submit" disabled={loading}>{loading ? "Einloggen…" : "Einloggen"}</Button>
          <Button variant="outline" onClick={onMagic} disabled={loading}>Magic Link</Button>
          <button className="link" onClick={onForgot} disabled={loading}>Passwort vergessen?</button>
          <span className="muted">|</span>
          <button className="link" onClick={() => setView("register")}>Jetzt registrieren</button>
        </div>
      </form>
    </Card>
  );
}

function RecoveryView({ setBanner }) {
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!pw1 || pw1 !== pw2) {
      setErr("Passwörter stimmen nicht überein.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw1 });
      if (error) throw error;
      setBanner({ type: "success", msg: "Passwort gesetzt. Du bist eingeloggt." });
      if (typeof window !== "undefined") window.history.replaceState({}, "", window.location.pathname);
    } catch (e2) {
      setErr(e2?.message || "Passwort konnte nicht gesetzt werden.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Neues Passwort setzen">
      <form className="form" onSubmit={onSubmit}>
        <TextInput label="Neues Passwort" type="password" value={pw1} onChange={(e) => setPw1(e.target.value)} placeholder="••••••••" autoComplete="new-password" />
        <TextInput label="Wiederholen" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="••••••••" autoComplete="new-password" />
        {err && <div className="form__error">{err}</div>}
        <Button type="submit" disabled={loading}>{loading ? "Speichere…" : "Passwort speichern"}</Button>
      </form>
    </Card>
  );
}

function AccountView({ me, setBanner }) {
  const [first, setFirst] = useState(me?.first_name || "");
  const [saving, setSaving] = useState(false);
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [errPw, setErrPw] = useState("");
  const [busyPw, setBusyPw] = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({ first_name: first }).eq("id", me.id);
      if (error) throw error;
      setBanner({ type: "success", msg: "Profil gespeichert." });
    } catch {
      setBanner({ type: "error", msg: "Profil konnte nicht gespeichert werden." });
    } finally {
      setSaving(false);
    }
  };

  const changePw = async (e) => {
    e.preventDefault();
    setErrPw("");
    if (!pw1 || pw1 !== pw2) {
      setErrPw("Passwörter stimmen nicht überein.");
      return;
    }
    setBusyPw(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw1 });
      if (error) throw error;
      setPw1("");
      setPw2("");
      setBanner({ type: "success", msg: "Passwort aktualisiert." });
    } catch (e2) {
      setErrPw(e2?.message || "Passwort konnte nicht geändert werden.");
    } finally {
      setBusyPw(false);
    }
  };

  return (
    <div className="grid-12 gap">
      <Card title="Profil" subtitle="Dein öffentlicher Name" align="left">
        <form onSubmit={saveProfile} className="form">
          <TextInput label="Vorname" value={first} onChange={(e) => setFirst(e.target.value)} placeholder="Christina" />
          <Button type="submit" disabled={saving}>{saving ? "Speichere…" : "Speichern"}</Button>
        </form>
      </Card>
      <Card title="Passwort ändern" subtitle="Sicher & schnell" align="left">
        <form onSubmit={changePw} className="form">
          <TextInput label="Neues Passwort" type="password" value={pw1} onChange={(e) => setPw1(e.target.value)} placeholder="••••••••" autoComplete="new-password" />
          <TextInput label="Wiederholen" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="••••••••" autoComplete="new-password" />
          {errPw && <div className="form__error">{errPw}</div>}
          <Button type="submit" disabled={busyPw}>{busyPw ? "Aktualisiere…" : "Passwort speichern"}</Button>
        </form>
      </Card>
    </div>
  );
}

/* ================================== App ================================== */
export default function App() {
  const [session, setSession] = useState(null);
  const [me, setMe] = useState(null);
  const [view, setView] = useState("home");  // home | login | register | recovery | account | admin
  const [tool, setTool] = useState(null);    // null | pricefinder | messagematcher | contentflow
  const [banner, setBanner] = useState(null);

  // Recovery-View via Hash
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === "#recovery") setView("recovery");
  }, []);

  // Session
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (mounted) setSession(data.session ?? null);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => setSession(sess ?? null));
    return () => sub?.subscription?.unsubscribe?.();
  }, []);

  // Profil
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!session?.user?.id) { setMe(null); return; }
      const uid = session.user.id;
      const { data, error } = await supabase.from("profiles").select("*").eq("id", uid).single();
      if (mounted) setMe(error ? { email: session.user.email } : data ?? { email: session.user.email });
    })();
    return () => { mounted = false; };
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

  const ToolHeader = () => {
    if (!tool) return null;
    const title =
      tool === "pricefinder" ? "PriceFinder" :
      tool === "messagematcher" ? "MessageMatcher" : "ContentFlow";
    return (
      <div className="toolbar">
        <div className="toolbar__crumbs">
          <button className="link" onClick={() => setTool(null)}>Home</button>
          <span className="muted">/</span>
          <span className="crumb">{title}</span>
        </div>
        <div className="row gap">
          <Button variant="outline" onClick={() => setTool(null)}>← Zurück</Button>
          <Button variant="outline" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Nach oben</Button>
        </div>
      </div>
    );
  };

  const TopBar = () => (
    <header className="topbar">
      <h1 className="app-title">
        SmartBiz Suite{" "}
        <span className="build-tag">{import.meta.env?.VITE_BUILD_TAG ?? "dev"}</span>
      </h1>
      <nav className="nav">
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

  return (
    <div className="app">
      <div className="app-shell">
        <TopBar />
        <Banner banner={banner} onClose={() => setBanner(null)} />
        <ToolHeader />

        <main className="stack">
          {/* HOME */}
          {session && view === "home" && !tool && (
            <FadeIn inKey="home">
              <section className="section">
                <Card className="center">
                  <p className="lead">{greeting}</p>
                </Card>
              </section>

              <section className="section">
                <div className="cards">
                  <Card
                    title="PriceFinder"
                    subtitle="Wohlfühl-, Wachstums- & Authority-Preis"
                    className="card--app"
                  >
                    <p className="muted">Klarer, sauberer Pricing-Flow.</p>
                    <div className="spacer" />
                    <Button onClick={() => setTool("pricefinder")} full>Öffnen</Button>
                  </Card>

                  <Card
                    title="MessageMatcher"
                    subtitle="Messaging-Map aus Bio/Website"
                    className="card--app"
                  >
                    <p className="muted">Positionierung ohne Ratespiel.</p>
                    <div className="spacer" />
                    <Button onClick={() => setTool("messagematcher")} full>Öffnen</Button>
                  </Card>

                  <Card
                    title="ContentFlow"
                    subtitle="Hooks, Stories, Captions"
                    className="card--app"
                  >
                    <p className="muted">Struktur rein, Output rauf.</p>
                    <div className="spacer" />
                    <Button onClick={() => setTool("contentflow")} full>Öffnen</Button>
                  </Card>
                </div>
              </section>
            </FadeIn>
          )}

          {/* TOOL-DASHBOARD */}
          {session && tool && (
            <FadeIn inKey={tool}>
              <div className="grid-12 gap">
                {/* Sidebar */}
                <aside className="sidebar">
                  <Card title="Navigation" align="left">
                    <div className="col gap">
                      <Button
                        variant="outline"
                        className={tool === "pricefinder" ? "is-active" : ""}
                        onClick={() => setTool("pricefinder")}
                        full
                      >
                        PriceFinder
                      </Button>
                      <Button
                        variant="outline"
                        className={tool === "messagematcher" ? "is-active" : ""}
                        onClick={() => setTool("messagematcher")}
                        full
                      >
                        MessageMatcher
                      </Button>
                      <Button
                        variant="outline"
                        className={tool === "contentflow" ? "is-active" : ""}
                        onClick={() => setTool("contentflow")}
                        full
                      >
                        ContentFlow
                      </Button>
                    </div>
                  </Card>
                  <Card title="Quick Actions" align="left">
                    <div className="row gap wrap">
                      <Button variant="outline" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
                        Scroll Top
                      </Button>
                      <Button variant="outline" onClick={() => setTool(null)}>
                        Zur Übersicht
                      </Button>
                    </div>
                  </Card>
                </aside>

                {/* Main */}
                <section className="main col gap">
                  {tool === "pricefinder" && (
                    <Card title="PriceFinder" align="left">
                      <PriceFinder onBack={() => setTool(null)} />
                    </Card>
                  )}
                  {tool === "messagematcher" && (
                    <Card title="MessageMatcher" align="left">
                      <MessageMatcher onBack={() => setTool(null)} />
                    </Card>
                  )}
                  {tool === "contentflow" && (
                    <Card title="ContentFlow" align="left">
                      <ContentFlow onBack={() => setTool(null)} />
                    </Card>
                  )}
                </section>
              </div>
            </FadeIn>
          )}

          {/* AUTH / ACCOUNT / ADMIN */}
          {!session && view === "login" && (
            <FadeIn inKey="login">
              <LoginView setBanner={setBanner} setView={setView} />
            </FadeIn>
          )}
          {!session && view === "register" && (
            <FadeIn inKey="register">
              <RegisterView setBanner={setBanner} setView={setView} />
            </FadeIn>
          )}
          {view === "recovery" && (
            <FadeIn inKey="recovery">
              <RecoveryView setBanner={setBanner} />
            </FadeIn>
          )}
          {session && view === "account" && !tool && (
            <FadeIn inKey="account">
              <AccountView me={me} setBanner={setBanner} />
            </FadeIn>
          )}
          {session && view === "admin" && !tool && (
            <FadeIn inKey="admin">
              <Admin onBack={() => setView("home")} />
            </FadeIn>
          )}

          {!session && !["login", "register", "recovery"].includes(view) && (
            <div className="center muted">
              Du bist nicht eingeloggt. Bitte{" "}
              <button className="link" onClick={() => setView("login")}>
                einloggen
              </button>
              .
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

/* ============================= Register View ============================= */
function RegisterView({ setBanner, setView }) {
  const [first, setFirst] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const signUp = (emailRaw, password) => {
    const e = (emailRaw || "").trim().toLowerCase();
    return supabase.auth.signUp({ email: e, password });
  };

  const onRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErr("");
    try {
      const { data, error } = await signUp(email, pw);
      if (error) throw error;
      const uid = data?.user?.id;
      if (uid) {
        const { error: pe } = await supabase
          .from("profiles")
          .upsert({
            id: uid,
            email: email.trim().toLowerCase(),
            role: "user",
            first_name: first || null,
          });
        if (pe) throw pe;
      }
      setBanner({ type: "success", msg: "Registrierung erfolgreich. Bitte einloggen." });
      setView("login");
    } catch (e2) {
      setErr(e2?.message || "Registrierung fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Registrieren" subtitle="Starte los">
      <form className="form" onSubmit={onRegister}>
        <TextInput label="Vorname" value={first} onChange={(e) => setFirst(e.target.value)} placeholder="Dein Name" />
        <TextInput label="E-Mail" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@domain.com" autoComplete="username" />
        <TextInput label="Passwort" type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••" autoComplete="new-password" />
        {err && <div className="form__error">{err}</div>}
        <div className="row gap">
          <Button type="submit" disabled={loading}>{loading ? "Registriere…" : "Registrieren"}</Button>
          <Button variant="outline" onClick={() => setView("login")}>Zurück zum Login</Button>
        </div>
      </form>
    </Card>
  );
}
