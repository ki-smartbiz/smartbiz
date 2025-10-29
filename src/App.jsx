import { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseClient";
import Admin from "./pages/admin";

/**
 * Sehr simpler Card-Wrapper, um shadcn/ui zu vermeiden.
 */
function Card({ title, children, className = "" }) {
  return (
    <div className={`rounded-xl border border-neutral-800 bg-neutral-900/50 p-5 ${className}`}>
      {title ? <h2 className="text-lg font-semibold mb-3">{title}</h2> : null}
      {children}
    </div>
  );
}

/**
 * Auth-Helpers
 */
async function loginWithPassword(emailRaw, password) {
  const email = (emailRaw || "").trim().toLowerCase();
  return supabase.auth.signInWithPassword({ email, password });
}

async function registerWithPassword(emailRaw, password) {
  const email = (emailRaw || "").trim().toLowerCase();
  // Falls E-Mail-Confirmation AUS ist, ist Login sofort erlaubt.
  return supabase.auth.signUp({ email, password });
}

async function sendReset(emailRaw) {
  const email = (emailRaw || "").trim().toLowerCase();
  // Supabase nutzt die Projekt-Einstellung für Redirect-URL (SITE URL / Additional)
  // Optional könntest du hier eine explizite redirectTo-URL setzen.
  return supabase.auth.resetPasswordForEmail(email);
}

function LoadingScreen() {
  return (
    <div className="min-h-screen grid place-items-center bg-neutral-950 text-neutral-100">
      <div className="animate-pulse text-sm text-neutral-400">Lade…</div>
    </div>
  );
}

/**
 * Simple Module Platzhalter
 */
function ModuleCard({ title, children }) {
  return (
    <Card title={title} className="w-full">
      <div className="text-sm text-neutral-300">{children}</div>
    </Card>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [me, setMe] = useState(null); // profile: { id, email, role }
  const [view, setView] = useState("home"); // 'home' | 'admin' | 'login' | 'register' | 'forgot' | 'recovery'
  const [busy, setBusy] = useState(true);
  const [banner, setBanner] = useState(null); // {type:'success'|'error'|'info', msg:string}

  // --- Recovery Hash (#recovery) abfangen und Ansicht setzen
  useEffect(() => {
    if (location.hash?.startsWith("#recovery")) {
      setView("recovery");
    }
  }, []);

  // --- Session verfolgen
  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session ?? null);
      setBusy(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess ?? null);
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  // --- Profil laden wenn Session
  useEffect(() => {
    let ignore = false;
    (async () => {
      if (!session?.user?.id) {
        setMe(null);
        return;
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("id,email,role")
        .eq("id", session.user.id)
        .single();

      if (error) {
        console.error("Profile load error:", error);
        if (!ignore) setBanner({ type: "error", msg: "Profil konnte nicht geladen werden." });
      } else if (!ignore) {
        setMe(data || null);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [session]);

  async function handleLogout() {
    await supabase.auth.signOut();
    setView("login");
    setBanner({ type: "info", msg: "Abgemeldet." });
  }

  if (busy) return <LoadingScreen />;

  // -------------------------------
  // Views
  // -------------------------------

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* Header */}
      <header className="border-b border-neutral-800 bg-neutral-900/40 backdrop-blur sticky top-0">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <div
            className="font-semibold tracking-wide text-neutral-100 cursor-pointer"
            onClick={() => setView("home")}
            title="SmartBiz Suite"
          >
            SmartBiz Suite
          </div>
          <div className="ml-auto flex items-center gap-2">
            {session ? (
              <>
                {me?.role === "admin" && (
                  <button
                    className={`px-3 py-1.5 rounded-md text-sm border ${
                      view === "admin"
                        ? "bg-emerald-600 border-emerald-600"
                        : "border-neutral-700 hover:border-neutral-500"
                    }`}
                    onClick={() => setView("admin")}
                    title="Admin-Dashboard"
                  >
                    Admin
                  </button>
                )}
                <button
                  className="px-3 py-1.5 rounded-md text-sm border border-neutral-700 hover:border-neutral-500"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  className={`px-3 py-1.5 rounded-md text-sm border ${
                    view === "login"
                      ? "bg-neutral-200 text-neutral-900 border-neutral-200"
                      : "border-neutral-700 hover:border-neutral-500"
                  }`}
                  onClick={() => setView("login")}
                >
                  Login
                </button>
                <button
                  className={`px-3 py-1.5 rounded-md text-sm border ${
                    view === "register"
                      ? "bg-emerald-600 border-emerald-600"
                      : "border-neutral-700 hover:border-neutral-500"
                  }`}
                  onClick={() => setView("register")}
                >
                  Registrieren
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Banner */}
      {banner && (
        <div
          className={`${
            banner.type === "error"
              ? "bg-red-900/50 text-red-200"
              : banner.type === "success"
              ? "bg-emerald-900/50 text-emerald-200"
              : "bg-neutral-800 text-neutral-200"
          }`}
        >
          <div className="max-w-6xl mx-auto px-4 py-2 text-sm flex items-start justify-between gap-4">
            <div>{banner.msg}</div>
            <button className="opacity-70 hover:opacity-100" onClick={() => setBanner(null)}>
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* RECOVERY (Passwort aus Reset-Link setzen) */}
        {view === "recovery" && <RecoveryView onDone={() => setView("login")} setBanner={setBanner} />}

        {/* LOGIN / REGISTER / FORGOT */}
        {!session && view === "login" && <LoginView setBanner={setBanner} setView={setView} />}
        {!session && view === "register" && <RegisterView setBanner={setBanner} setView={setView} />}
        {!session && view === "forgot" && <ForgotView setBanner={setBanner} setView={setView} />}

        {/* HOME */}
        {session && view === "home" && (
          <div className="grid md:grid-cols-3 gap-6">
            <ModuleCard title="PriceFinder">
              <p className="mb-3">
                Berechnet drei Preispunkte (Wohlfühl / Wachstum / Authority) – <em>Demo-Placeholder</em>.
              </p>
              <button
                className="px-3 py-1.5 rounded-md text-sm border border-neutral-700 hover:border-neutral-500"
                onClick={() => setBanner({ type: "info", msg: "PriceFinder-Demo – hier später die echte Logik." })}
              >
                Test-Analyse starten
              </button>
            </ModuleCard>

            <ModuleCard title="MessageMatcher">
              <p className="mb-3">Analysiert Tonalität & Differenzierung – <em>Demo-Placeholder</em>.</p>
              <button
                className="px-3 py-1.5 rounded-md text-sm border border-neutral-700 hover:border-neutral-500"
                onClick={() => setBanner({ type: "info", msg: "MessageMatcher-Demo – hier später die echte Logik." })}
              >
                Text analysieren
              </button>
            </ModuleCard>

            <ModuleCard title="ContentFlow">
              <p className="mb-3">Erstellt Content-Serien & Hooks – <em>Demo-Placeholder</em>.</p>
              <button
                className="px-3 py-1.5 rounded-md text-sm border border-neutral-700 hover:border-neutral-500"
                onClick={() => setBanner({ type: "info", msg: "ContentFlow-Demo – hier später die echte Logik." })}
              >
                5 Hooks generieren
              </button>
            </ModuleCard>
          </div>
        )}

        {/* ADMIN */}
        {session && view === "admin" && me?.role === "admin" && (
          <Admin onBack={() => setView("home")} />
        )}

        {/* Default-Hinweis */}
        {!session && !["login", "register", "forgot", "recovery"].includes(view) && (
          <Card>
            <div className="text-sm text-neutral-300">
              Bitte <button className="underline" onClick={() => setView("login")}>einloggen</button> oder{" "}
              <button className="underline" onClick={() => setView("register")}>registrieren</button>.
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}

/* ---------------- Views: Login / Register / Forgot / Recovery ---------------- */

function LoginView({ setBanner, setView }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function onLogin(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const { error } = await loginWithPassword(email, pw);
      if (error) throw error;
      setBanner({ type: "success", msg: "Erfolgreich eingeloggt." });
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Login fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }

  async function onMagic(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const emailNorm = (email || "").trim().toLowerCase();
      const { error } = await supabase.auth.signInWithOtp({ email: emailNorm });
      if (error) throw error;
      setBanner({ type: "info", msg: "Magic Link gesendet. Bitte E-Mail checken." });
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Magic Link konnte nicht gesendet werden.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card title="Login" className="max-w-md mx-auto">
      <form onSubmit={onLogin} className="space-y-3">
        <div className="space-y-1">
          <label className="text-sm text-neutral-300">E-Mail</label>
          <input
            type="email"
            autoComplete="username"
            className="w-full rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2 outline-none focus:border-neutral-400"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm text-neutral-300">Passwort</label>
          <input
            type="password"
            autoComplete="current-password"
            className="w-full rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2 outline-none focus:border-neutral-400"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            required
            placeholder="••••••••"
          />
        </div>

        {err && <div className="text-sm text-red-400">{err}</div>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="px-3 py-2 rounded-md text-sm bg-neutral-200 text-neutral-900 disabled:opacity-60"
          >
            {loading ? "Einloggen…" : "Einloggen"}
          </button>

          <button
            type="button"
            onClick={onMagic}
            disabled={loading || !email}
            className="px-3 py-2 rounded-md text-sm border border-neutral-700 hover:border-neutral-500 disabled:opacity-60"
            title="Login per E-Mail-Link"
          >
            Magic Link
          </button>
        </div>

        <div className="pt-2 text-sm text-neutral-400 flex items-center gap-3">
          <button type="button" className="underline" onClick={() => setView("forgot")}>
            Passwort vergessen?
          </button>
          <span className="opacity-50">|</span>
          <button type="button" className="underline" onClick={() => setView("register")}>
            Jetzt registrieren
          </button>
        </div>
      </form>
    </Card>
  );
}

function RegisterView({ setBanner, setView }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function onRegister(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const { error } = await registerWithPassword(email, pw);
      if (error) throw error;
      setBanner({ type: "success", msg: "Registrierung erfolgreich. Du kannst dich jetzt einloggen." });
      setView("login");
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Registrierung fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card title="Registrieren" className="max-w-md mx-auto">
      <form onSubmit={onRegister} className="space-y-3">
        <div className="space-y-1">
          <label className="text-sm text-neutral-300">E-Mail</label>
          <input
            type="email"
            autoComplete="username"
            className="w-full rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2 outline-none focus:border-neutral-400"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm text-neutral-300">Passwort</label>
          <input
            type="password"
            autoComplete="new-password"
            className="w-full rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2 outline-none focus:border-neutral-400"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            required
            placeholder="Mind. 6 Zeichen"
          />
        </div>

        {err && <div className="text-sm text-red-400">{err}</div>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="px-3 py-2 rounded-md text-sm bg-emerald-600 disabled:opacity-60"
          >
            {loading ? "Registriere…" : "Registrieren"}
          </button>
          <button
            type="button"
            className="px-3 py-2 rounded-md text-sm border border-neutral-700 hover:border-neutral-500"
            onClick={() => setView("login")}
          >
            Zurück zum Login
          </button>
        </div>
      </form>
    </Card>
  );
}

function ForgotView({ setBanner, setView }) {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSend(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const { error } = await sendReset(email);
      if (error) throw error;
      setBanner({ type: "info", msg: "Reset-Link gesendet. Bitte E-Mail checken." });
      setView("login");
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Versand fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card title="Passwort zurücksetzen" className="max-w-md mx-auto">
      <form onSubmit={onSend} className="space-y-3">
        <div className="space-y-1">
          <label className="text-sm text-neutral-300">E-Mail</label>
          <input
            type="email"
            autoComplete="username"
            className="w-full rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2 outline-none focus:border-neutral-400"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
          />
        </div>

        {err && <div className="text-sm text-red-400">{err}</div>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="px-3 py-2 rounded-md text-sm bg-neutral-200 text-neutral-900 disabled:opacity-60"
          >
            {loading ? "Sende…" : "Reset-Link senden"}
          </button>
          <button
            type="button"
            className="px-3 py-2 rounded-md text-sm border border-neutral-700 hover:border-neutral-500"
            onClick={() => setView("login")}
          >
            Zurück zum Login
          </button>
        </div>
      </form>
    </Card>
  );
}

function RecoveryView({ onDone, setBanner }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSet(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;
      await supabase.auth.signOut();
      setBanner({ type: "success", msg: "Passwort aktualisiert. Bitte neu einloggen." });
      // Hash aufräumen
      history.replaceState(null, "", location.pathname);
      onDone?.();
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Aktualisierung fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card title="Neues Passwort setzen" className="max-w-md mx-auto">
      <form onSubmit={onSet} className="space-y-3">
        <div className="space-y-1">
          <label className="text-sm text-neutral-300">Neues Passwort</label>
          <input
            type="password"
            autoComplete="new-password"
            className="w-full rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2 outline-none focus:border-neutral-400"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            required
            placeholder="••••••••"
          />
        </div>

        {err && <div className="text-sm text-red-400">{err}</div>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="px-3 py-2 rounded-md text-sm bg-emerald-600 disabled:opacity-60"
          >
            {loading ? "Speichere…" : "Passwort speichern"}
          </button>
          <button
            type="button"
            className="px-3 py-2 rounded-md text-sm border border-neutral-700 hover:border-neutral-500"
            onClick={onDone}
          >
            Abbrechen
          </button>
        </div>
      </form>
    </Card>
  );
}
