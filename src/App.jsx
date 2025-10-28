// src/App.jsx
import { useEffect, useMemo, useState, createContext, useContext } from "react";
import { supabase } from "./lib/supabaseClient";
import PriceFinder from "./modules/PriceFinder";
import MessageMatcher from "./modules/MessageMatcher";
import ContentFlow from "./modules/ContentFlow";
import Admin from "./pages/Admin";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";

/* ----------------------------- Feature Context ----------------------------- */

const FeatureCtx = createContext({
  ready: false,
  allowed: new Set(),
  isAdmin: false,
  refresh: async () => {},
});

function FeatureProvider({ children }) {
  const [allowed, setAllowed] = useState(new Set());
  const [isAdmin, setIsAdmin] = useState(false);
  const [ready, setReady] = useState(false);

  const load = async () => {
    setReady(false);
    const { data: u } = await supabase.auth.getUser();
    const uid = u?.user?.id;
    if (!uid) {
      setAllowed(new Set());
      setIsAdmin(false);
      setReady(true);
      return;
    }
    const [{ data: feats, error: fe }, { data: me, error: pe }] = await Promise.all([
      supabase.from("user_features").select("feature_key"),
      supabase.from("profiles").select("role, email").eq("id", uid).single(),
    ]);
    if (fe) console.error("user_features error", fe);
    if (pe) console.error("profiles error", pe);
    setAllowed(new Set((feats || []).map((f) => f.feature_key)));
    setIsAdmin(me?.role === "admin");
    setReady(true);
  };

  useEffect(() => {
    load();
    const { data: sub } = supabase.auth.onAuthStateChange((_e) => load());
    return () => sub?.subscription?.unsubscribe();
  }, []);

  const value = useMemo(() => ({ ready, allowed, isAdmin, refresh: load }), [ready, allowed, isAdmin]);
  return <FeatureCtx.Provider value={value}>{children}</FeatureCtx.Provider>;
}

function useFeatures() {
  return useContext(FeatureCtx);
}

/* --------------------------------- Layout --------------------------------- */

function Header({ onNav }) {
  const [email, setEmail] = useState("");
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data?.user?.email ?? ""));
  }, []);
  return (
    <header className="w-full border-b bg-white/70 backdrop-blur sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <button className="font-semibold" onClick={() => onNav("dashboard")}>SmartBiz Suite</button>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden sm:inline text-gray-600">{email}</span>
          <button
            onClick={async () => { await supabase.auth.signOut(); }}
            className="px-3 py-1.5 rounded-lg border hover:bg-gray-50"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}

function Card({ title, desc, onClick }) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-2xl border p-5 hover:shadow transition bg-white"
    >
      <div className="text-base font-semibold">{title}</div>
      <div className="text-sm text-gray-600 mt-1">{desc}</div>
    </button>
  );
}

/* --------------------------------- Routes --------------------------------- */

function Dashboard({ onOpen }) {
  const { ready, allowed, isAdmin, refresh } = useFeatures();

  if (!ready) return <div className="p-6 text-sm text-gray-500">Lade Zugriffe…</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {allowed.has("pricefinder") && (
        <Card title="PriceFinder" desc="3 Preislevel + Begründung" onClick={() => onOpen("pricefinder")} />
      )}
      {allowed.has("messagematcher") && (
        <Card title="MessageMatcher" desc="Voice, Hooks, Differenzierung" onClick={() => onOpen("messagematcher")} />
      )}
      {allowed.has("contentflow") && (
        <Card title="ContentFlow" desc="Hooks, Story, Caption, CTA" onClick={() => onOpen("contentflow")} />
      )}
      {isAdmin && (
        <Card title="Admin" desc="Nutzer & Features steuern" onClick={() => onOpen("admin")} />
      )}

      <div className="col-span-full">
        <button className="text-xs text-gray-500 underline" onClick={refresh}>
          Zugriffe aktualisieren
        </button>
      </div>
    </div>
  );
}

function Guarded({ feature, children }) {
  const { allowed, ready } = useFeatures();
  if (!ready) return <div className="p-6 text-sm text-gray-500">Lade…</div>;
  if (!allowed.has(feature)) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="rounded-xl border p-6 bg-white">
          <div className="font-semibold mb-1">Kein Zugriff</div>
          <div className="text-sm text-gray-600">
            Dieses Modul ist für deinen Account nicht freigeschaltet.
          </div>
        </div>
      </div>
    );
  }
  return children;
}

/* ---------------------------------- App ----------------------------------- */

export default function App() {
  const [session, setSession] = useState(null);
  const [route, setRoute] = useState("dashboard");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub?.subscription?.unsubscribe();
  }, []);

  if (!session) {
    return (
      <div className="min-h-screen grid place-items-center bg-gray-50">
        <div className="w-full max-w-md bg-white rounded-2xl border p-6">
          <h1 className="text-lg font-semibold mb-3">Login</h1>
          <Auth
            supabaseClient={supabase}
            providers={[]}
            appearance={{ theme: ThemeSupa }}
            redirectTo={window.location.origin}
          />
          <p className="text-xs text-gray-500 mt-3">
            Mit Login stimmst du den Nutzungsbedingungen zu.
          </p>
        </div>
      </div>
    );
  }

  return (
    <FeatureProvider>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <Header onNav={setRoute} />
        {route === "dashboard" && <Dashboard onOpen={setRoute} />}
        {route === "admin" && <Admin onBack={() => setRoute("dashboard")} />}
        {route === "pricefinder" && (
          <Guarded feature="pricefinder">
            <PriceFinder onBack={() => setRoute("dashboard")} />
          </Guarded>
        )}
        {route === "messagematcher" && (
          <Guarded feature="messagematcher">
            <MessageMatcher onBack={() => setRoute("dashboard")} />
          </Guarded>
        )}
        {route === "contentflow" && (
          <Guarded feature="contentflow">
            <ContentFlow onBack={() => setRoute("dashboard")} />
          </Guarded>
        )}
      </div>
    </FeatureProvider>
  );
}
