// lib/supabase.js
// Ce fichier crée la connexion à ta base de données Supabase
// Il est utilisé partout dans l'application

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Variables Supabase manquantes dans .env.local')
}

// Client pour le navigateur (utilisateur connecté)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Client admin pour le serveur (accès complet, jamais exposé au navigateur)
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)
