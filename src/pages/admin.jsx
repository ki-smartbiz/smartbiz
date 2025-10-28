// src/pages/Admin.jsx
import { useEffect, useMemo, useState } from "react"
import { supabase } from "../lib/supabaseClient"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

function TextInput({ value, onChange, placeholder }) {
  return (
    <input
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  )
}

export default function Admin({ onBack }) {
  const [me, setMe] = useState(null)                // eigenes Profile (mit Rolle)
  const [ready, setReady] = useState(false)
  const [q, setQ] = useState("")
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState([])              // [{ id, email, role, features: Set([...]) }]
  const [error, setError] = useState("")

  // Features, die du im System führen willst
  const ALL_FEATURES = useMemo(() => ([
    { key: "pricefinder", label: "PriceFinder" },
    { key: "messagematcher", label: "MessageMatcher" },
    { key: "contentflow", label: "ContentFlow" },
  ]), [])

  useEffect(() => {
    (async () => {
      try {
        const { data: sess } = await supabase.auth.getUser()
        const uid = sess?.user?.id
        if (!uid) {
          setError("Keine Session.")
          return
        }
        // eigenes Profil holen
        const { data: myp, error: pe } = await supabase
          .from("profiles")
          .select("id,email,role")
          .eq("id", uid)
          .single()
        if (pe) throw pe
        setMe(myp)
      } catch (e) {
        console.error(e)
        setError("Admin-Check fehlgeschlagen.")
      } finally {
        setReady(true)
      }
    })()
  }, [])

  async function search() {
    setError("")
    setLoading(true)
    try {
      // Nutzer nach Email-Substring suchen
      let query = supabase.from("profiles").select("id,email,role").order("email")
      if (q.trim()) query = query.ilike("email", `%${q.trim()}%`)
      const { data: profiles, error: pe } = await query
      if (pe) throw pe

      // Features je Nutzer dazuladen
      const ids = profiles.map(p => p.id)
      let featuresByUser = {}
      if (ids.length) {
        const { data: feats, error: fe } = await supabase
          .from("user_features")
          .select("user_id,feature_key")
          .in("user_id", ids)
        if (fe) throw fe
        for (const f of feats || []) {
          if (!featuresByUser[f.user_id]) featuresByUser[f.user_id] = new Set()
          featuresByUser[f.user_id].add(f.feature_key)
        }
      }

      const combined = profiles.map(p => ({
        ...p,
        features: featuresByUser[p.id] || new Set()
      }))
      setRows(combined)
    } catch (e) {
      console.error(e)
      setError(e.message || "Suche fehlgeschlagen.")
    } finally {
      setLoading(false)
    }
  }

  async function toggleFeature(userId, featureKey, enabled) {
    try {
      setError("")
      if (enabled) {
        const { error } = await supabase
          .from("user_features")
          .upsert({ user_id: userId, feature_key: featureKey, granted_by: me.id })
        if (error) throw error
      } else {
        const { error } = await supabase
          .from("user_features")
          .delete()
          .eq("user_id", userId)
          .eq("feature_key", featureKey)
        if (error) throw error
      }
      // UI aktualisieren
      setRows(prev => prev.map(r => {
        if (r.id !== userId) return r
        const next = new Set(r.features)
        if (enabled) next.add(featureKey)
        else next.delete(featureKey)
        return { ...r, features: next }
      }))
    } catch (e) {
      console.error(e)
      setError("Änderung konnte nicht gespeichert werden.")
    }
  }

  async function toggleRole(userId, toAdmin) {
    try {
      setError("")
      const newRole = toAdmin ? "admin" : "user"
      const { error } = await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("id", userId)
      if (error) throw error
      setRows(prev => prev.map(r => r.id === userId ? { ...r, role: newRole } : r))
      // Falls ich mich selbst down- oder upgrade: UI justieren
      if (userId === me?.id) setMe(m => ({ ...m, role: newRole }))
    } catch (e) {
      console.error(e)
      setError("Rollenwechsel fehlgeschlagen.")
    }
  }

  if (!ready) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <p className="text-sm text-gray-500">Admin-Check…</p>
      </div>
    )
  }

  if (!me || me.role !== "admin") {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <Button variant="outline" onClick={onBack}>← Zurück</Button>
        <Card className="mt-4">
          <CardHeader><CardTitle>Zugriff verweigert</CardTitle></CardHeader>
          <CardContent>Du bist kein Admin.</CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Admin-Dashboard</h1>
        <Button variant="outline" onClick={onBack}>← Zurück</Button>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Suche</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <TextInput value={q} onChange={setQ} placeholder="E-Mail enthält…" />
            <Button onClick={search} disabled={loading}>{loading ? "Suche…" : "Suchen"}</Button>
          </div>
          {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Nutzerverwaltung</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-gray-500">Keine Einträge. Suche starten.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="py-2 pr-4">E-Mail</th>
                    <th className="py-2 pr-4">Rolle</th>
                    {ALL_FEATURES.map(f => (
                      <th key={f.key} className="py-2 pr-4">{f.label}</th>
                    ))}
                    <th className="py-2 pr-4">Aktion</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="py-2 pr-4">{r.email}</td>
                      <td className="py-2 pr-4">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${r.role === "admin" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"}`}>
                          {r.role}
                        </span>
                      </td>
                      {ALL_FEATURES.map(f => {
                        const enabled = r.features.has(f.key)
                        return (
                          <td key={f.key} className="py-2 pr-4">
                            <label className="inline-flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={enabled}
                                onChange={(e) => toggleFeature(r.id, f.key, e.target.checked)}
                              />
                              <span className="text-[13px] text-gray-700">{enabled ? "an" : "aus"}</span>
                            </label>
                          </td>
                        )
                      })}
                      <td className="py-2 pr-4">
                        {r.role === "admin" ? (
                          <Button variant="outline" size="sm" onClick={() => toggleRole(r.id, false)}>Admin entziehen</Button>
                        ) : (
                          <Button size="sm" onClick={() => toggleRole(r.id, true)}>Admin machen</Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
