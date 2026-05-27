// api/user.js
// Route GET  : /api/user → récupère le profil complet
// Route PUT  : /api/user → met à jour le profil
// Route POST : /api/user/xp → ajoute des XP

import { supabaseAdmin } from '../lib/supabase'
import { createClient } from '@supabase/supabase-js'

async function getUserFromToken(req) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.split(' ')[1]
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  const { data: { user } } = await supabase.auth.getUser(token)
  return user
}

export default async function handler(req, res) {
  const user = await getUserFromToken(req)
  if (!user) {
    return res.status(401).json({ error: 'Non connecté' })
  }

  // ── GET : récupérer le profil complet ────────────────────
  if (req.method === 'GET') {
    const { data: profile, error } = await supabaseAdmin
      .from('users')
      .select(`
        *,
        tribes (id, name, emoji, description, total_xp),
        user_badges (
          earned_at,
          badges (id, name, emoji, description)
        )
      `)
      .eq('id', user.id)
      .single()

    if (error) return res.status(500).json({ error: 'Profil introuvable' })

    // Récupérer les défis du jour
    const today = new Date().toISOString().split('T')[0]
    const { data: challenges } = await supabaseAdmin
      .from('daily_challenges')
      .select('*')
      .eq('user_id', user.id)
      .eq('challenge_date', today)

    // Statistiques
    const { count: quizCount } = await supabaseAdmin
      .from('quiz_attempts')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('is_correct', true)

    const { count: chaptersRead } = await supabaseAdmin
      .from('reading_progress')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('completed', true)

    // Position dans le classement
    const { data: leaderboard } = await supabaseAdmin
      .from('users')
      .select('id')
      .gte('xp', profile.xp)
    const rank = leaderboard?.length || 1

    return res.status(200).json({
      profile: {
        ...profile,
        stats: {
          quiz_correct: quizCount || 0,
          chapters_read: chaptersRead || 0,
          rank,
        },
      },
      challenges: challenges || [],
    })
  }

  // ── PUT : mettre à jour le profil ────────────────────────
  if (req.method === 'PUT') {
    const { username, avatar, goals, tribe_id } = req.body

    const updates = {}
    if (username) updates.username = username.slice(0, 30) // max 30 chars
    if (avatar)   updates.avatar   = avatar
    if (goals)    updates.goals    = goals
    if (tribe_id) updates.tribe_id = tribe_id

    const { data, error } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()

    if (error) return res.status(500).json({ error: 'Mise à jour impossible' })

    return res.status(200).json({ message: 'Profil mis à jour !', user: data })
  }

  return res.status(405).json({ error: 'Méthode non autorisée' })
}
