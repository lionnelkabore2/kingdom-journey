// api/leaderboard.js
// Route GET : /api/leaderboard → classement global + tribus

import { supabaseAdmin } from '../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Méthode non autorisée' })
  }

  const { type = 'global', limit = 50 } = req.query

  try {
    if (type === 'tribes') {
      // Classement des tribus
      const { data: tribes, error } = await supabaseAdmin
        .from('tribes')
        .select('id, name, emoji, description, total_xp, member_count')
        .order('total_xp', { ascending: false })
        .limit(10)

      if (error) throw error

      return res.status(200).json({
        tribes: tribes.map((t, i) => ({ ...t, rank: i + 1 }))
      })
    }

    // Classement global des joueurs
    const { data: players, error } = await supabaseAdmin
      .from('users')
      .select('id, username, avatar, xp, level, streak, tribes(name, emoji)')
      .order('xp', { ascending: false })
      .limit(parseInt(limit))

    if (error) throw error

    return res.status(200).json({
      leaderboard: players.map((p, i) => ({
        rank: i + 1,
        id: p.id,
        username: p.username,
        avatar: p.avatar,
        xp: p.xp,
        level: p.level,
        streak: p.streak,
        tribe: p.tribes,
      }))
    })

  } catch (error) {
    console.error('Erreur leaderboard:', error)
    return res.status(500).json({ error: 'Erreur récupération du classement' })
  }
}
