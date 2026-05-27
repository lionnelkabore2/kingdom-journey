// api/quiz.js
// Route GET  : /api/quiz?world=jerusalem&limit=10 → récupère des questions
// Route POST : /api/quiz → soumet une réponse et gagne des XP

import { supabaseAdmin } from '../lib/supabase'
import { createClient } from '@supabase/supabase-js'

// Vérifie que l'utilisateur est connecté
async function getUserFromToken(req) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null

  const token = authHeader.split(' ')[1]
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  const { data: { user } } = await supabase.auth.getUser(token)
  return user
}

export default async function handler(req, res) {

  // ── GET : récupérer des questions ────────────────────────
  if (req.method === 'GET') {
    const { world, difficulty, limit = 10 } = req.query

    let query = supabaseAdmin
      .from('quiz_questions')
      .select('id, question, emoji, options, category, difficulty, world')
      .limit(parseInt(limit))

    if (world) query = query.eq('world', world)
    if (difficulty) query = query.eq('difficulty', difficulty)

    // Ordre aléatoire pour que ce soit différent à chaque fois
    query = query.order('created_at', { ascending: false })

    const { data: questions, error } = await query

    if (error) {
      return res.status(500).json({ error: 'Erreur récupération des questions' })
    }

    // On n'envoie PAS la bonne réponse (correct_index) au client !
    // Elle sera vérifiée côté serveur lors de la soumission
    return res.status(200).json({ questions })
  }

  // ── POST : soumettre une réponse ─────────────────────────
  if (req.method === 'POST') {
    const user = await getUserFromToken(req)
    if (!user) {
      return res.status(401).json({ error: 'Tu dois être connecté pour jouer' })
    }

    const { question_id, selected_index } = req.body

    if (question_id === undefined || selected_index === undefined) {
      return res.status(400).json({ error: 'question_id et selected_index requis' })
    }

    // 1. Récupérer la vraie réponse (côté serveur seulement !)
    const { data: question, error: qError } = await supabaseAdmin
      .from('quiz_questions')
      .select('correct_index, difficulty')
      .eq('id', question_id)
      .single()

    if (qError || !question) {
      return res.status(404).json({ error: 'Question introuvable' })
    }

    const isCorrect = selected_index === question.correct_index

    // XP selon difficulté
    const xpMap = { facile: 10, moyen: 20, difficile: 35 }
    const xpGained = isCorrect ? (xpMap[question.difficulty] || 10) : 0

    // 2. Enregistrer la tentative
    await supabaseAdmin.from('quiz_attempts').insert({
      user_id: user.id,
      question_id,
      is_correct: isCorrect,
      xp_gained: xpGained,
    })

    // 3. Ajouter les XP si bonne réponse
    let xpResult = null
    if (isCorrect && xpGained > 0) {
      const { data } = await supabaseAdmin.rpc('add_xp', {
        p_user_id: user.id,
        p_xp: xpGained,
      })
      xpResult = data

      // Vérifier si un badge quiz doit être attribué
      const { count } = await supabaseAdmin
        .from('quiz_attempts')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('is_correct', true)

      if (count === 10) {
        const { data: badge } = await supabaseAdmin
          .from('badges')
          .select('id')
          .eq('condition_type', 'quiz')
          .eq('condition_value', 10)
          .single()

        if (badge) {
          await supabaseAdmin.from('user_badges')
            .insert({ user_id: user.id, badge_id: badge.id })
            .onConflict(['user_id', 'badge_id'])
            .ignore()
        }
      }
    }

    return res.status(200).json({
      is_correct: isCorrect,
      correct_index: question.correct_index,
      xp_gained: xpGained,
      xp_result: xpResult, // contient le nouveau total XP et si level up
    })
  }

  return res.status(405).json({ error: 'Méthode non autorisée' })
}
