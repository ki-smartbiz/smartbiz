console.log('ENV URL:', import.meta.env.VITE_SUPABASE_URL)
console.log('ENV KEY present:', !!import.meta.env.VITE_SUPABASE_ANON_KEY)

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
})
