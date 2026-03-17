import { createClient } from '@supabase/supabase-js'

// Get values from env vars
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl)
console.log('Supabase Key loaded:', supabaseAnonKey ? 'YES' : 'NO')

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
