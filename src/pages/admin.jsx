// src/page/Admin.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient"; // <-- KORREKT relativ

function UIButton({ children, variant = "primary", className = "", ...props }) {
  const base =
    "px-3 py-1.5 rounded-lg text-sm border transition disabled:opacity-60 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-black text-white border-black hover:bg-gray-900",
    outline: "bg-white text-gray-900 border-gray-300 hover:bg-gray-50",
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

function UISwitch({ checked, onChange }) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      <span className="w-10 h-6 rounded-full bg-gray-300 peer-checked:bg-green-500 relative transition">
        <span className="absolute left-1 top-1 h-4 w-4 bg-white rounded-full transition peer-checked:translate-x-4" />
      </span>
      <span className="text-[13px] text-gray-700">{checked ? "an" : "aus"}</span>
    </label>
  );
}

function Badge({ children, tone = "default" }) {
  const toneClass =
    tone === "default"
      ? "bg-gray-900 text-white"
      : "bg-gray-100 text-gray-800 border border-gray-200";
  return (
    <span className={`text-xs px-2 py-0.5 rounded ${toneClass}`}>{children}</span>
  );
}

function Card({ title, children, className = "" }) {
  return (
    <div className={`rounded-2xl border bg-white ${className}`}>
      {title ? (
        <div className="px-4 py-3 border-b">
          <div className="font-semibold">{title}</div>
        </div>
      ) : null}
      <div className="p-4">{children}</div>
    </div>
  );
}

export default function Admin({ onBack }) {
  const [me, setMe] = useState(null);
  const [ready, setReady] = useState(false);

  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]); // [{ id, email, role, features: Set }]
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const ALL_FEATURES = useMemo(
    () => [
      { key: "pricefinder", label: "PriceFinder" },
      { key: "messagematcher", label: "MessageMatcher" },
      { key: "contentflow", label: "ContentFlow" },
    ],
    []
  );

  // Initial Admin-Check
  useEffect(() => {
    (async () => {
      try {
        const { data: sess } = await supabase.auth.getUser();
        const uid = sess?.user?.id;
        if (!uid) throw new Error("Keine Session");
        const { data: myp, error: pe } = await supabase
          .from("profiles")
          .select("id,email,role")
          .eq("id", uid)
          .single();
        if (pe) throw pe;
        setMe(myp);
      } catch (e) {
        console.error(e);
        setError("Admin-Check fehlgeschlagen.");
      } finally {
        setReady(true);
      }
    })();
  }, []);

  // Suche (mit Debounce)
  const debounceRef = useRef(null);
  const onChangeSearch = (v) => {
    setQ(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(v), 350);
  };

  const search = useCallback(
    async (queryStr) => {
      setError("");
      setNotice("");
      setLoading(true);
      try {
        let query = supabase
          .from("profiles")
          .select("id,email,role")
          .order("email");
        if (queryStr?.trim())
          query = query.ilike("email", `%${queryStr.trim()}%`);
        const { data: profiles, error: pe } = await query;
        if (pe) throw pe;

        const ids = profiles.map((p) => p.id);
        let map = {};
        if (ids.length) {
          const { data: feats, error: fe } = await supabase
            .from("user_features")
            .select("user_id,feature_key")
            .in("user_id", ids);
          if (fe) throw fe;
          for (const f of feats || []) {
            (map[f.user_id] ||= new Set()).add(f.feature_key);
          }
        }
        setRows(
          profiles.map((p) => ({ ...p, features: map[p.id] || new Set() }))
        );
      } catch (e) {
        console.error(e);
        setError(e.message || "Suche fehlgeschlagen.");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Initiale Suche leer (alle)
  useEffect(() => {
    if (ready && me?.role === "admin") search("");
  }, [ready, me, search]);

  async function toggleFeature(userId, featureKey, enabled) {
    try {
      setNotice("");
      if (enabled) {
        const { error } = await supabase
          .from("user_features")
          .upsert({ user_id: userId, feature_key: featureKey, granted_by: me.id });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_features")
          .delete()
          .eq("user_id", userId)
          .eq("feature_key", featureKey);
        if (error) throw error;
      }
      setRows((prev) =>
        prev.map((r) => {
          if (r.id !== userId) return r;
          const next = new Set(r.features);
          enabled ? next.add(featureKey) : next.delete(featureKey);
          return { ...r, features: next };
        })
      );
      setNotice(`${featureKey} ${enabled ? "freigeschaltet" : "entzogen"}.`);
    } catch (e) {
      console.error(e);
      setError("Änderung konnte nicht gespeichert werden.");
    }
  }

  async function toggleRole(userId, toAdmin) {
    try {
      setNotice("");
      const newRole = toAdmin ? "admin" : "user";
      const { error } = await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("id", userId);
      if (error) throw error;
      setRows((prev) =>
        prev.map((r) => (r.id === userId ? { ...r, role: newRole } : r))
      );
      if (userId === me?.id) setMe((m) => ({ ...m, role: newRole }));
      setNotice(`Nutzer ist jetzt ${newRole}.`);
    } catch (e) {
      console.error(e);
      setError("Rollenwechsel fehlgeschlagen.");
    }
  }

  if (!ready)
    return (
      <div className="max-w-5xl mx-auto p-6 text-sm text-gray-500">
        Admin-Check…
      </div>
    );
  if (!me || me.role !== "admin") {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <UIButton variant="outline" onClick={onBack}>
          ← Zurück
        </UIButton>
        <Card title="Zugriff verweigert" className="mt-4">
          <div>Du bist kein Admin.</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Admin-Dashboard</h1>
        <UIButton variant="outline" onClick={onBack}>
          ← Zurück
        </UIButton>
      </div>

      <Card title="Suche" className="mt-4">
        <div className="flex gap-3 items-center">
          <input
            value={q}
            onChange={(e) => onChangeSearch(e.target.value)}
            placeholder="E-Mail enthält…"
            className="max-w-md w-full border rounded-lg px-3 py-2 text-sm"
          />
          <UIButton onClick={() => search(q)} disabled={loading}>
            {loading ? "Suche…" : "Suchen"}
          </UIButton>
        </div>
        {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
        {notice && <p className="text-green-600 text-sm mt-3">{notice}</p>}
      </Card>

      <Card title="Nutzerverwaltung" className="mt-4">
        {rows.length === 0 ? (
          <p className="text-sm text-gray-500">Keine Einträge. Suche starten.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-2 pr-4">E-Mail</th>
                  <th className="py-2 pr-4">Rolle</th>
                  {ALL_FEATURES.map((f) => (
                    <th key={f.key} className="py-2 pr-4">
                      {f.label}
                    </th>
                  ))}
                  <th className="py-2 pr-4">Aktion</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="py-2 pr-4">{r.email}</td>
                    <td className="py-2 pr-4">
                      <Badge tone={r.role === "admin" ? "default" : "muted"}>
                        {r.role}
                      </Badge>
                    </td>
                    {ALL_FEATURES.map((f) => {
                      const enabled = r.features.has(f.key);
                      return (
                        <td key={f.key} className="py-2 pr-4">
                          <UISwitch
                            checked={enabled}
                            onChange={(val) =>
                              toggleFeature(r.id, f.key, val)
                            }
                          />
                        </td>
                      );
                    })}
                    <td className="py-2 pr-4">
                      {r.role === "admin" ? (
                        <UIButton
                          variant="outline"
                          onClick={() => toggleRole(r.id, false)}
                        >
                          Admin entziehen
                        </UIButton>
                      ) : (
                        <UIButton onClick={() => toggleRole(r.id, true)}>
                          Admin machen
                        </UIButton>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="my-4 border-t" />
        <p className="text-xs text-gray-500">
          Hinweis: DB-Policies erzwingen, dass nur freigeschaltete Features
          genutzt werden können.
        </p>
      </Card>
    </div>
  );
}
