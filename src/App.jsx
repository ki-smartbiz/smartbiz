// src/App.jsx — dark+gold, zentriert, Dashboard, feine Buttons (build-fähig)
import { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabaseClient";

// Wichtig: Groß-/Kleinschreibung exakt wie Dateinamen
import Admin from "./pages/Admin";
import PriceFinder from "./modules/PriceFinder";
import MessageMatcher from "./modules/MessageMatcher";
import ContentFlow from "./modules/ContentFlow";

/* ========================= THEME ========================= */
const theme = {
  bg: "bg-[#0b0b0b]",
  card: "bg-[#141414] border border-[#2a2a2a]",
  cardHover:
    "hover:border-[#3a3a3a] hover:shadow-[0_10px_30px_rgba(0,0,0,0.35)]",
  text: "text-neutral-100",
  gold: "#d1a45f",
  goldHover: "#c2924d",
};

/* ========================= PRIMITIVES ========================= */
function Card({ title, subtitle, className = "", children, align = "center" }) {
  const alignCls = align === "left" ? "text-left" : "text-center";
  return (
    <div
      className={`rounded-xl p-6 transition-all duration-300 ${theme.card} ${theme.cardHover} ${alignCls} ${className}`}
    >
      {(title || subtitle) && (
        <div className="mb-3">
          {title && (
            <div
              className="text-sm font-semibold tracking-wide"
              style={{ color: theme.gold }}
            >
              {title}
            </div>
          )}
          {subtitle && (
            <div className="text-xs mt-1 text-neutral-400">{subtitle}</div>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

function Banner({ banner, onClose }) {
  if (!banner) return null;
  const color =
    banner.type === "success"
      ? "bg-emerald-900/40 border-emerald-700 text-emerald-200"
      : banner.type === "error"
      ? "bg-rose-900/40 border-rose-700 text-rose-200"
      : `${theme.card} ${theme.text}`;
  return (
    <div className={`mb-4 rounded-lg border px-4 py-2 text-sm ${color}`}>
      <div className="flex items-start justify-between gap-3">
        <div>{banner.msg}</div>
        <button
          className="text-xs opacity-70 hover:opacity-100"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>
      </div>
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
  const inlineSolid =
    variant === "solid"
      ? { backgroundColor: "var(--gold)", color: "#0b0b0b" }
      : {};
  const widthCls = full ? "w-full" : "";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{ ...styleVars, ...inlineSolid }}
      className={`rounded-2xl px-4 py-2 text-sm font-semibold transition-all duration-150 disabled:opacity-50 ${base} ${widthCls} ${className} hover:-translate-y-0.5 active:translate-y-0 shadow-[0_3px_0_rgba(0,0,0,0.25)]`}
    >
      {children}
    </button>
  );
}

function FadeIn({ children, inKey }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    setShow(false);
    const t = setTimeout(() => setShow(true), 10);
    return () => clearTimeout(t);
  }, [inKey]);
  return (
    <div
      className={`transform transition-all duration-300 ${
        show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }`}
    >
      {children}
    </div>
  );
}

/* ========================= INPUT ========================= */
function TextInput({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
}) {
  return (
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
}

/* ========================= AUTH VIEWS ========================= */
function LoginView({ setBanner, setView }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const origin =
    typeof window !== "undefined" ? window.location.origin : undefined;

  const signInWithPassword = (emailRaw, password) => {
    const email = (emailRaw || "").trim().toLowerCase();
    return supabase.auth.signInWithPassword({ email, password });
    };
  const signInWithMagicLink = (emailRaw) => {
    const email = (emailRaw || "").trim().toLowerCase();
    return supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: origin },
    });
  };
  const sendReset = (emailRaw) => {
    const email = (emailRaw || "").trim().toLowerCase();
    return supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin || ""}/#recovery`,
    });
  };

  const onLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErr("");
    try {
      const { error } = await signInWithPassword(email, pw);
      if (error) throw error;
      setBanner({ type: "success", msg: "Eingeloggt. Willkommen zurück!" });
    } catch (e) {
      setErr(e?.message || "Invalid login credentials.");
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
      setBanner({
        type: "success",
        msg: "Magic Link gesendet. Prüfe dein Postfach.",
      });
    } catch (e) {
      setErr(e?.message || "Magic Link konnte nicht gesendet werden.");
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
      setBanner({
        type: "success",
        msg: "Reset-Link verschickt. Prüfe dein Postfach.",
      });
    } catch (e) {
      setErr(e?.message || "Reset-E-Mail konnte nicht gesendet werden.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Login" subtitle="Willkommen zurück">
      <form className="space-y-3" onSubmit={onLogin}>
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
        {err && <div className="text-sm text-rose-400">{err}</div>}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? "Einloggen…" : "Einloggen"}
          </Button>
          <Button variant="outline" onClick={onMagic} disabled={loading}>
            Magic Link
          </Button>
          <button
            className="text-sm underline decoration-neutral-600 hover:decoration-neutral-300"
            onClick={onForgot}
            disabled={loading}
          >
            Passwort vergessen?
          </button>
          <span className="opacity-40">|</span>
          <button
            className="text-sm underline decoration-neutral-600 hover:decoration-neutral-300"
            onClick={() => setView("register")}
          >
            Jetzt registrieren
          </button>
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
      setBanner({
        type: "success",
        msg: "Passwort gesetzt. Du bist eingeloggt.",
      });
      if (typeof window !== "undefined") {
        window.history.replaceState({}, "", window.location.pathname);
      }
    } catch (e) {
      setErr(e?.message || "Passwort konnte nicht gesetzt werden.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Neues Passwort setzen">
      <form className="space-y-3" onSubmit={onSubmit}>
        <TextInput
          label="Neues Passwort"
          type="password"
          value={pw1}
          onChange={(e) => setPw1(e.target.value)}
          placeholder="••••••••"
          autoComplete="new-password"
        />
        <TextInput
          label="Wiederholen"
          type="password"
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
          placeholder="••••••••"
          autoComplete="new-password"
        />
        {err && <div className="text-sm text-rose-400">{err}</div>}
        <Button type="submit" disabled={loading}>
          {loading ? "Speichere…" : "Passwort speichern"}
        </Button>
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
      const { error } = await supabase
        .from("profiles")
        .update({ first_name: first })
        .eq("id", me.id);
      if (error) throw error;
      setBanner({ type: "success", msg: "Profil gespeichert." });
    } catch {
      setBanner({
        type: "error",
        msg: "Profil konnte nicht gespeichert werden.",
      });
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
    } catch (e) {
      setErrPw(e?.message || "Passwort konnte nicht geändert werden.");
    } finally {
      setBusyPw(false);
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card title="Profil" subtitle="Dein öffentlicher Name" align="left">
        <form onSubmit={saveProfile} className="space-y-3">
          <TextInput
            label="Vorname"
            value={first}
            onChange={(e) => setFirst(e.target.value)}
            placeholder="Christina"
          />
          <Button type="submit" disabled={saving}>
            {saving ? "Speichere…" : "Speichern"}
          </Button>
        </form>
      </Card>
      <Card title="Passwort ändern" subtitle="Sicher & schnell" align="left">
        <form onSubmit={changePw} className="space-y-3">
          <TextInput
            label="Neues Passwort"
            type="password"
            value={pw1}
            onChange={(e) => setPw1(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
          />
          <TextInput
            label="Wiederholen"
            type="password"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
          />
          {errPw && <div className="text-sm text-rose-400">{errPw}</div>}
          <Button type="submit" disabled={busyPw}>
            {busyPw ? "Aktualisiere…" : "Passwort speichern"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

/* ========================= APP ========================= */
export default function App() {
  const [session, setSession] = useState(null);
  const [me, setMe] = useState(null);
  const [view, setView] = useState("home"); // home | login | register | recovery | account | admin
  const [tool, setTool] = useState(null); // null | "pricefinder" | "messagematcher" | "contentflow"
  const [banner, setBanner] = useState(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === "#recovery") {
      setView("recovery");
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (mounted) setSession(data.session ?? null);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) =>
      setSession(sess ?? null)
    );
    return () => sub?.subscription?.unsubscribe?.();
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!session?.user?.id) {
        setMe(null);
        return;
      }
      const uid = session.user.id;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", uid)
        .single();
      if (mounted) {
        setMe(error ? { email: session.user.email } : data ?? { email: session.user.email });
      }
    })();
    return () => {
      mounted = false;
    };
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
      tool === "pricefinder"
        ? "PriceFinder"
        : tool === "messagematcher"
        ? "MessageMatcher"
        : "ContentFlow";
    return (
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            className="text-sm text-neutral-400 hover:text-neutral-200"
            onClick={() => setTool(null)}
          >
            Home
          </button>
          <span className="text-neutral-600">/</span>
          <span className="text-sm" style={{ color: theme.gold }}>
            {title}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setTool(null)}>
            ← Zurück
          </Button>
          <Button
            variant="outline"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            Nach oben
          </Button>
        </div>
      </div>
    );
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
            <Button
              variant="outline"
              onClick={() => {
                setTool(null);
                setView("home");
              }}
            >
              Home
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setTool(null);
                setView("account");
              }}
            >
              Konto
            </Button>
            {me?.role === "admin" && (
              <Button
                variant="outline"
                onClick={() => {
                  setTool(null);
                  setView("admin");
                }}
              >
                Admin
              </Button>
            )}
            <Button onClick={handleLogout}>Logout</Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={() => setView("login")}>
              Login
            </Button>
            <Button onClick={() => setView("register")}>Registrieren</Button>
          </>
        )}
      </nav>
    </header>
  );

  return (
    <div className={`min-h-screen ${theme.bg} ${theme.text}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <TopBar />
        <Banner banner={banner} onClose={() => setBanner(null)} />
        <ToolHeader />

        <main className="space-y-10">
          {/* HOME */}
          {session && view === "home" && !tool && (
            <FadeIn inKey="home">
              <section className="max-w-3xl mx-auto">
                <Card className="py-10">
                  <p className="text-lg md:text-xl font-medium text-neutral-300">
                    {greeting}
                  </p>
                </Card>
              </section>

              {/* Apps als zentriertes Grid */}
              <section className="max-w-6xl mx-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 place-items-center justify-center">
                  <Card
                    title="PriceFinder"
                    subtitle="Wohlfühl-, Wachstums- & Authority-Preis"
                    className="w-full max-w-sm"
                  >
                    <p className="text-sm text-neutral-400">
                      Klarer, sauberer Pricing-Flow.
                    </p>
                    <div className="mt-6">
                      <Button onClick={() => setTool("pricefinder")} full>
                        Öffnen
                      </Button>
                    </div>
                  </Card>

                  <Card
                    title="MessageMatcher"
                    subtitle="Messaging-Map aus Bio/Website"
                    className="w-full max-w-sm"
                  >
                    <p className="text-sm text-neutral-400">
                      Positionierung ohne Ratespiel.
                    </p>
                    <div className="mt-6">
                      <Button onClick={() => setTool("messagematcher")} full>
                        Öffnen
                      </Button>
                    </div>
                  </Card>

                  <Card
                    title="ContentFlow"
                    subtitle="Hooks, Stories, Captions"
                    className="w-full max-w-sm"
                  >
                    <p className="text-sm text-neutral-400">
                      Struktur rein, Output rauf.
                    </p>
                    <div className="mt-6">
                      <Button onClick={() => setTool("contentflow")} full>
                        Öffnen
                      </Button>
                    </div>
                  </Card>
                </div>
              </section>
            </FadeIn>
          )}

          {/* DASHBOARD TOOL LAYOUT */}
          {session && tool && (
            <FadeIn inKey={tool}>
              <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-6">
                {/* Sidebar */}
                <aside className="lg:col-span-4 space-y-3">
                  <Card title="Navigation" align="left">
                    <div className="grid gap-2">
                      <Button
                        variant="outline"
                        className={tool === "pricefinder" ? "opacity-100" : "opacity-70"}
                        onClick={() => setTool("pricefinder")}
                        full
                      >
                        PriceFinder
                      </Button>
                      <Button
                        variant="outline"
                        className={tool === "messagematcher" ? "opacity-100" : "opacity-70"}
                        onClick={() => setTool("messagematcher")}
                        full
                      >
                        MessageMatcher
                      </Button>
                      <Button
                        variant="outline"
                        className={tool === "contentflow" ? "opacity-100" : "opacity-70"}
                        onClick={() => setTool("contentflow")}
                        full
                      >
                        ContentFlow
                      </Button>
                    </div>
                  </Card>
                  <Card title="Quick Actions" align="left">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        onClick={() =>
                          window.scrollTo({ top: 0, behavior: "smooth" })
                        }
                      >
                        Scroll Top
                      </Button>
                      <Button variant="outline" onClick={() => setTool(null)}>
                        Zur Übersicht
                      </Button>
                    </div>
                  </Card>
                </aside>

                {/* Main */}
                <section className="lg:col-span-8 space-y-4">
                  {tool === "pricefinder" && (
                    <Card title="PriceFinder" align="left">
                      <PriceFinder />
                    </Card>
                  )}
                  {tool === "messagematcher" && (
                    <Card title="MessageMatcher" align="left">
                      <MessageMatcher />
                    </Card>
                  )}
                  {tool === "contentflow" && (
                    <Card title="ContentFlow" align="left">
                      <ContentFlow />
                    </Card>
                  )}
                </section>
              </div>
            </FadeIn>
          )}

          {/* AUTH / ACCOUNT */}
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
            <div className="text-sm opacity-70 text-center">
              Du bist nicht eingeloggt. Bitte{" "}
              <button className="underline" onClick={() => setView("login")}>
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

/* ========================= REGISTER VIEW ========================= */
function RegisterView({ setBanner, setView }) {
  const [first, setFirst] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const signUp = (emailRaw, password) => {
    const email = (emailRaw || "").trim().toLowerCase();
    return supabase.auth.signUp({ email, password });
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
        const { error: pe } = await supabase.from("profiles").upsert({
          id: uid,
          email: email.trim().toLowerCase(),
          role: "user",
          first_name: first || null,
        });
        if (pe) throw pe;
      }
      setBanner({
        type: "success",
        msg: "Registrierung erfolgreich. Bitte einloggen.",
      });
      setView("login");
    } catch (e) {
      setErr(e?.message || "Registrierung fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Registrieren" subtitle="Starte los">
      <form className="space-y-3" onSubmit={onRegister}>
        <TextInput
          label="Vorname"
          value={first}
          onChange={(e) => setFirst(e.target.value)}
          placeholder="Dein Name"
        />
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
          autoComplete="new-password"
        />
        {err && <div className="text-sm text-rose-400">{err}</div>}
        <div className="flex gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? "Registriere…" : "Registrieren"}
          </Button>
          <Button variant="outline" onClick={() => setView("login")}>
            Zurück zum Login
          </Button>
        </div>
      </form>
    </Card>
  );
}
