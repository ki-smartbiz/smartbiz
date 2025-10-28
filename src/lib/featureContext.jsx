import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const FeatureCtx = createContext({ ready:false, allowed:new Set(), isAdmin:false, refresh:()=>{} });

export function FeatureProvider({ children }) {
  const [allowed, setAllowed] = useState(new Set());
  const [isAdmin, setIsAdmin] = useState(false);
  const [ready, setReady] = useState(false);

  async function load() {
    setReady(false);
    const { data: u } = await supabase.auth.getUser();
    const uid = u?.user?.id;
    if (!uid) { setAllowed(new Set()); setIsAdmin(false); setReady(true); return; }

    const [{ data: feats }, { data: me }] = await Promise.all([
      supabase.from("user_features").select("feature_key"),
      supabase.from("profiles").select("role").eq("id", uid).single()
    ]);
    setAllowed(new Set((feats||[]).map(f=>f.feature_key)));
    setIsAdmin(me?.role === "admin");
    setReady(true);
  }

  useEffect(() => { load(); }, []);

  return (
    <FeatureCtx.Provider value={{ ready, allowed, isAdmin, refresh: load }}>
      {children}
    </FeatureCtx.Provider>
  );
}

export function useFeatures() {
  return useContext(FeatureCtx);
}
