// src/pages/Admin.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { supabase } from "../lib/supabaseClient"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"

function RowSwitch({ checked, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <Switch checked={checked} onCheckedChange={onChange} />
      <span className="text-[13px] text-gray-700">{checked ? "an" : "aus"}</span>
    </div>
  )
}

export default function Admin({ onBack }) {
  const { toast } = useToast()
  const [me, setMe] = useState(null)
  const [ready, setReady] = useState(false)

  const [q, setQ] = useState("")
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState([]) // [{ id, email, role, features: Set }]
  const [error, setError] = useState("")

  const ALL_FEATURES = useMemo(() => ([
    { key: "pricefinder", label: "PriceFinder" },
    { key: "messagematcher", label: "MessageMatcher" },
    { key: "contentflow", label: "ContentFlow" },
  ]), [])

  // Initial Admin-Check
  useEffect(() => {
    (async () => {
      try {
        const { data: sess } = await supabase.auth.getUser()
        const uid = sess?.user?.id
        if (!uid) throw new Error("Keine Session")
        const { data: myp, error: pe } = await supabase.from("profiles").select("id,email,role").eq("id", uid).single()
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

  // Suche (mit Debounce)
  const debounceRef = useRef(null)
  const onChangeSearch = (v) => {
    setQ(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(v), 350)
  }

  const search = useCallback(async (queryStr) => {
    setError("")
    setLoading(true)
    try {
      let query = supabase.from("profiles").select("id,email,role").order("email")
      if (queryStr?.trim()) query = query.ilike("email", `%${queryStr.trim()}%`)
      const { data: profiles, error: pe } = await query
      if (pe) throw pe

      const ids = profiles.map(p => p.id)
      let map = {}
      if (ids.length) {
        const { data: feats, error: fe } = await supabase.from("user_features").select("user_id,feature_key").in("user_id", ids)
        if (fe) throw fe
        for (const f of feats || []) {
          (map[f.user_id] ||= new Set()).add(f.feature_key)
        }
      }
      setRows(profiles.map(p => ({ ...p, features: map[p.id] || new Set() })))
    } catch (e) {
      console.error(e)
      setError(e.message || "Suche fehlgeschlagen.")
      toast({ title: "Fehler", description: "Suche fehlgeschlagen.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [toast])

  // Initiale Suche leer (alle)
  useEffect(() => { if (ready && me?.role === "admin") search("") }, [ready, me, search])

  async function toggleFeature(userId, featureKey, enabled) {
    try {
      if (enabled) {
        const { error } = await supabase.from("user_features").upsert({ user_id: userId, feature_key: featureKey, granted_by: me.id })
        if (error) throw error
      } else {
        const { error } = await supabase.from("user_features").delete().eq("user_id", userId).eq("feature_key", featureKey)
        if (error) throw error
      }
      setRows(prev => prev.map(r => {
        if (r.id !== userId) return r
        const next = new Set(r.features)
        enabled ? next.add(featureKey) : next.delete(featureKey)
        return { ...r, features: next }
      }))
      toast({ title: "Gespeichert", description: `${featureKey} ${enabled ? "freigeschaltet" : "entzogen"}.` })
    } catch (e) {
      console.error(e)
      toast({ title: "Fehler", description: "Änderung konnte nicht gespeichert werden.", variant: "destructive" })
    }
  }

  async function toggleRole(userId, toAdmin) {
    try {
      const newRole = toAdmin ? "admin" : "user"
      const { error } = await supabase.from("profiles").update({ role: newRole }).eq("id", userId)
      if (error) throw error
      setRows(prev => prev.map(r => r.id === userId ? { ...r, role: newRole } : r))
      if (userId === me?.id) setMe(m => ({ ...m, role: newRole }))
      toast({ title: "Rolle aktualisiert", description: `Nutzer ist jetzt ${newRole}.` })
    } catch (e) {
      console.error(e)
      toast({ title: "Fehler", description: "Rollenwechsel fehlgeschlagen.", variant: "destructive" })
    }
  }

  if (!ready) return <div className="max-w-5xl mx-auto p-6 text-sm text-gray-500">Admin-Check…</div>
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
        <CardHeader><CardTitle>Suche</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-3 items-center">
            <Input
              value={q}
              onChange={(e) => onChangeSearch(e.target.value)}
              placeholder="E-Mail enthält…"
              className="max-w-md"
            />
            <Button onClick={() => search(q)} disabled={loading}>{loading ? "Suche…" : "Suchen"}</Button>
          </div>
          {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader><CardTitle>Nutzerverwaltung</CardTitle></CardHeader>
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
                    {ALL_FEATURES.map(f => <th key={f.key} className="py-2 pr-4">{f.label}</th>)}
                    <th className="py-2 pr-4">Aktion</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="py-2 pr-4">{r.email}</td>
                      <td className="py-2 pr-4">
                        <Badge variant={r.role === "admin" ? "default" : "secondary"}>
                          {r.role}
                        </Badge>
                      </td>
                      {ALL_FEATURES.map(f => {
                        const enabled = r.features.has(f.key)
                        return (
                          <td key={f.key} className="py-2 pr-4">
                            <RowSwitch
                              checked={enabled}
                              onChange={(val) => toggleFeature(r.id, f.key, val)}
                            />
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
          <Separator className="my-4" />
          <p className="text-xs text-gray-500">
            Hinweis: DB-Policies erzwingen, dass nur freigeschaltete Features genutzt werden können.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
