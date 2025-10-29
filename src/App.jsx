// src/App.jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabaseClient";
import Admin from "./pages/admin"; // Datei: src/pages/admin.jsx (klein geschrieben)

function Card({ title, className = "", children }) {
  return (
    <div className={`rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 ${className}`}>
      {title && <div className="mb-3 text-sm font-semibold text-neutral-200">{title}</div>}
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
      : "bg-neutral-900/40 border-neutral-700 text-neutral-200";
  return (
    <div className={`mb-4 rounded-lg border px-4 py-2 text-sm ${color}`}>
      <div className="flex items-start justify-between gap-3">
        <div>{banner.msg}</div>
        <button className="text-xs opacity-70 hover:opacity-100" onClick={onClose}>
          ✕
        </button>
      </div>
    </div>
  );
}

/* ------------------------- Auth Helper ------------------------- */

async function signInWithPassword(emailRaw, password) {
  const email = (emailRaw || "").trim().toLowerCase();
  return supabase.auth.signInWithPassword({ email, password });
}

async function signInWithMagicLink(emailRaw) {
  const email = (emailRaw || "").trim().toLowerCase();
  return supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  });
}

async function signUp(emailRaw, password) {
  const email = (emailRaw || "").trim().toLowerCase();
  return supabase.auth.signUp({ email, password });
}

async function sendReset(emailRaw) {
  const email = (emailRaw || "").trim().toLowerCase();
  // Sehr wichtig: wir leiten auf /#recovery, damit unsere App das „Neues Passwort“-Form zeigt
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/#recovery`,
  });
}

/* ------------------------- Views ------------------------- */

function LoginView({ setBanner, setView }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function onLogin(e) {
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
  }

  async function onMagic(e) {
    e.preventDefault();
    setLoading(true);
    setErr("");
    try {
      const { error } = await signInWithMagicLink(email);
      if (error) throw error;
      setBanner({
        type: "success",
        msg: "Magic Link gesendet. Prüfe dein E-Mail-Postfach.",
      });
    } catch (e) {
      setErr(e?.message || "Magic Link konnte nicht gesendet werden.");
    } finally {
      setLoading(false);
    }
  }

  async function onForgot(e) {
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
  }

  return (
    <Card title="Login" className="max-w-md mx-auto">
      <form className="space-y-3" onSubmit={onLogin}>
        <div className="space-y-1">
          <label className="text-sm text-neutral-300">E-Mail</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2"
            placeholder="you@domain.com"
            autoComplete="username"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm text-neutral-300">Passwort</label>
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            className="w-full rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2"
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </div>
        {err && <div className="text-sm text-rose-400">{err}</div>}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="px-3 py-2 rounded-md text-sm bg-neutral-200 text-neutral-900 disabled:opacity-60"
          >
            {loading ? "Einloggen…" : "Einloggen"}
          </button>
          <button
            onClick={onMagic}
            disabled={loading}
            className="px-3 py-2 rounded-md text-sm border border-neutral-700 hover:border-neutral-500"
          >
            Magic Link
          </button>
        </div>
        <div className="mt-2 flex items-center gap-3 text-sm">
          <button
            className="underline decoration-neutral-500 hover:decoration-neutral-300"
            onClick={onForgot}
            disabled={loading}
          >
            Passwort vergessen?
          </button>
          <span className="opacity-40">|</span>
          <button
            className="underline decoration-neutral-500 hover:decoration-neutral-300"
            onClick={() => setView("register")}
          >
            Jetzt registrieren
          </button>
        </div>
      </form>
    </Card>
  );
}

function RegisterView({ setBanner, setView }) {
  const [first, setFirst] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function onRegister(e) {
    e.preventDefault();
    setLoading(true);
    setErr("");
    try {
      const { data, error } = await signUp(email, pw);
      if (error) throw error;

      // falls keine Email-Bestätigung erzwungen ist, existiert user direkt
      const uid = data?.user?.id;
      if (uid) {
        const { error: pe } = await supabase
          .from("profiles")
          .upsert({
            id: uid,
            email: (email || "").trim().toLowerCase(),
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
  }

  return (
    <Card title="Registrieren" className="max-w-md mx-auto">
      <form className="space-y-3" onSubmit={onRegister}>
        <div className="space-y-1">
          <label className="text-sm text-neutral-300">Vorname</label>
          <input
            value={first}
            onChange={(e) => setFirst(e.target.value)}
            className="w-full rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2"
            placeholder="Christina"
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm text-neutral-300">E-Mail</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2"
            placeholder="you@domain.com"
            autoComplete="username"
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm text-neutral-300">Passwort</label>
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            className="w-full rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2"
            placeholder="••••••••"
            autoComplete="new-password"
            required
          />
        </div>
        {err && <div className="text-sm text-rose-400">{err}</div>}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="px-3 py-2 rounded-md text-sm bg-neutral-200 text-neutral-900 disabled:opacity-60"
          >
            {loading ? "Registriere…" : "Registrieren"}
          </button>
          <button
            type="button"
            onClick={() => setView("login")}
            className="px-3 py-2 rounded-md text-sm border border-neutral-700 hover:border-neutral-500"
          >
            Zurück zum Login
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

  async function onSubmit(e) {
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
      // Hash entfernen
      window.history.replaceState({}, "", window.location.pathname);
    } catch (e) {
      setErr(e?.message || "Passwort konnte nicht gesetzt werden.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card title="Neues Passwort setzen" className="max-w-md mx-auto">
      <form className="space-y-3" onSubmit={onSubmit}>
        <div className="space-y-1">
          <label className="text-sm text-neutral-300">Neues Passwort</label>
          <input
            type="password"
            value={pw1}
            onChange={(e) => setPw1(e.target.value)}
            className="w-full rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2"
            placeholder="••••••••"
            autoComplete="new-password"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm text-neutral-300">Wiederholen</label>
          <input
            type="password"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            className="w-full rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2"
            placeholder="••••••••"
            autoComplete="new-password"
          />
        </div>
        {err && <div className="text-sm text-rose-400">{err}</div>}
        <button
          type="submit"
          disabled={loading}
          className="px-3 py-2 rounded-md text-sm bg-neutral-200 text-neutral-900 disabled:opacity-60"
        >
          {loading ? "Speichere…" : "Passwort speichern"}
        </button>
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

  async function saveProfile(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ first_name: first })
        .eq("id", me.id);
      if (error) throw error;
      setBanner({ type: "success", msg: "Profil gespeichert." });
    } catch (e) {
      setBanner({ type: "error", msg: "Profil konnte nicht gespeichert werden." });
    } finally {
      setSaving(false);
    }
  }

  async function changePw(e) {
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
      setPw1(""); setPw2("");
      setBanner({ type: "success", msg: "Passwort aktualisiert." });
    } catch (e) {
      setErrPw(e?.message || "Passwort konnte nicht geändert werden.");
    } finally {
      setBusyPw(false);
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card title="Profil">
        <form onSubmit={saveProfile} className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm text-neutral-300">Vorname</label>
            <input
              value={first}
              onChange={(e) => setFirst(e.target.value)}
              className="w-full rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2"
              placeholder="Christina"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-3 py-2 rounded-md text-sm bg-emerald-600 disabled:opacity-60"
          >
            {saving ? "Speichere…" : "Speichern"}
          </button>
        </form>
      </Card>

      <Card title="Passwort ändern">
        <form onSubmit={changePw} className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm text-neutral-300">Neues Passwort</label>
            <input
              type="password"
              value={pw1}
              onChange={(e) => setPw1(e.target.value)}
              className="w-full rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2"
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-neutral-300">Wiederholen</label>
            <input
              type="password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              className="w-full rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2"
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>
          {errPw && <div className="text-sm text-rose-400">{errPw}</div>}
          <button
            type="submit"
            disabled={busyPw}
            className="px-3 py-2 rounded-md text-sm bg-neutral-200 text-neutral-900 disabled:opacity-60"
          >
            {busyPw ? "Aktualisiere…" : "Passwort speichern"}
          </button>
        </form>
      </Card>
    </div>
  );
}

/* ------------------------- Haupt-App ------------------------- */

export default function App() {
  const [session, setSession] = useState(null);
  const [me, setMe] = useState(null);
  const [view, setView] = useState("home"); // home | login | register | recovery | account | admin
  const [banner, setBanner] = useState(null);

  // Hash-Handling (/#recovery)
  useEffect(() => {
    if (window.location.hash === "#recovery") {
      setView("recovery");
    }
  }, []);

  // Session laden und Profile syncen
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session ?? null);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      setSession(sess ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Profil nachladen/updaten
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!session?.user?.id) {
        setMe(null);
        return;
      }
      const uid = session.user.id;
      const email = (session.user.email || "").toLowerCase();

      // sicherstellen, dass Profil existiert
      const { data: p, error } = await supabase
        .from("profiles")
        .upsert({ id: uid, email, role: "user" }, { onConflict: "id" })
        .select("*")
        .eq("id", uid)
        .single();

      if (!mounted) return;
      if (!error) setMe(p || null);
    })();
    return () => {
      mounted = false;
    };
  }, [session]);

  // Automatische Banner-Ausblendung
  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 3500);
    return () => clearTimeout(t);
  }, [banner]);

  async function handleLogout() {
    await supabase.auth.signOut();
    setBanner({ type: "neutral", msg: "Abgemeldet." });
    setView("login");
  }

  // Begrüßungstext
  const greeting = useMemo(() => {
    if (!me) return "";
    const first = me.first_name?.trim();
    if (first) return `Hey ${first}, lass uns heute kreativ sein. 🚀`;
    const nick = (me.email || "").split("@")[0];
    return `Hey ${nick}, lass uns heute kreativ sein. 🚀`;
  }, [me]);

  return (
    <div className="min-h-dvh bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-6xl p-4 md:p-6">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="text-lg font-semibold">SmartBiz Suite</div>
          <div className="flex items-center gap-2">
            {!session && (
              <>
                <button
                  className={`px-3 py-1.5 rounded-md text-sm border ${view === "login" ? "bg-neutral-200 text-neutral-900 border-neutral-200" : "border-neutral-700 hover:border-neutral-500"}`}
                  onClick={() => setView("login")}
                >
                  Login
                </button>
                <button
                  className={`px-3 py-1.5 rounded-md text-sm border ${view === "register" ? "bg-neutral-200 text-neutral-900 border-neutral-200" : "border-neutral-700 hover:border-neutral-500"}`}
                  onClick={() => setView("register")}
                >
                  Registrieren
                </button>
              </>
            )}
            {session && (
              <>
                <button
                  className={`px-3 py-1.5 rounded-md text-sm border ${view === "home" ? "bg-neutral-200 text-neutral-900 border-neutral-200" : "border-neutral-700 hover:border-neutral-500"}`}
                  onClick={() => setView("home")}
                >
                  Home
                </button>
                <button
                  className={`px-3 py-1.5 rounded-md text-sm border ${view === "account" ? "bg-neutral-200 text-neutral-900 border-neutral-200" : "border-neutral-700 hover:border-neutral-500"}`}
                  onClick={() => setView("account")}
                >
                  Konto
                </button>
                {me?.role === "admin" && (
                  <button
                    className={`px-3 py-1.5 rounded-md text-sm border ${view === "admin" ? "bg-emerald-600 border-emerald-600" : "border-neutral-700 hover:border-neutral-500"}`}
                    onClick={() => setView("admin")}
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
            )}
          </div>
        </div>

        <Banner banner={banner} onClose={() => setBanner(null)} />

        {/* Content */}
        <main className="space-y-6">
          {!session && view === "login" && (
            <LoginView setBanner={setBanner} setView={setView} />
          )}
          {!session && view === "register" && (
            <RegisterView setBanner={setBanner} setView={setView} />
          )}
          {view === "recovery" && <RecoveryView setBanner={setBanner} />}

          {session && view === "home" && (
            <>
              <Card className="bg-neutral-900/30">
                <div className="text-base">{greeting}</div>
              </Card>

              <div className="grid md:grid-cols-3 gap-6">
                <Card title="PriceFinder">
                  <div className="text-sm opacity-80">
                    Finde deinen Wohlfühl-, Wachstums- und Authority-Preis.
                  </div>
                  <div className="mt-3">
                    <button className="px-3 py-2 rounded-md text-sm border border-neutral-700 hover:border-neutral-500">
                      Öffnen
                    </button>
                  </div>
                </Card>
                <Card title="MessageMatcher">
                  <div className="text-sm opacity-80">
                    Analysiere Bio/Website und erhalte deine Messaging-Map.
                  </div>
                  <div className="mt-3">
                    <button className="px-3 py-2 rounded-md text-sm border border-neutral-700 hover:border-neutral-500">
                      Öffnen
                    </button>
                  </div>
                </Card>
                <Card title="ContentFlow">
                  <div className="text-sm opacity-80">
                    Generiere Hooks, Story-Outlines, Captions & Co.
                  </div>
                  <div className="mt-3">
                    <button className="px-3 py-2 rounded-md text-sm border border-neutral-700 hover:border-neutral-500">
                      Öffnen
                    </button>
                  </div>
                </Card>
              </div>
            </>
          )}

          {session && view === "account" && me && (
            <AccountView me={me} setBanner={setBanner} />
          )}

          {session && view === "admin" && (
            <Admin onBack={() => setView("home")} />
          )}

          {!session && !["login", "register", "recovery"].includes(view) && (
            <div className="text-sm opacity-70">
              Du bist nicht eingeloggt. Bitte <button className="underline" onClick={() => setView("login")}>einloggen</button>.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
