// api/auth/register.js
// Route : POST /api/auth/register
// Crée un nouveau compte utilisateur

import { supabase, supabaseAdmin } from '../../lib/supabase'

export default async function handler(req, res) {
  // Seulement les requêtes POST sont acceptées
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' })
  }

  const { email, password, username, avatar, profile_type, goals } = req.body

  // Validation des champs obligatoires
  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe obligatoires' })
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Mot de passe trop court (6 caractères minimum)' })
  }

  try {
    // 1. Créer le compte dans Supabase Auth (gestion email/password)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError) {
      // Traduction des erreurs courantes
      if (authError.message.includes('already registered')) {
        return res.status(400).json({ error: 'Cet email est déjà utilisé' })
      }
      return res.status(400).json({ error: authError.message })
    }

    const userId = authData.user.id

    // 2. Créer le profil dans notre table users
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .insert({
        id: userId,
        email,
        username: username || 'Guerrier de la Foi',
        avatar: avatar || '🧑',
        profile_type: profile_type || 'adulte',
        goals: goals || [],
        xp: 100, // Bonus de bienvenue !
      })
      .select()
      .single()

    if (profileError) {
      console.error('Erreur création profil:', profileError)
      return res.status(500).json({ error: 'Erreur création du profil' })
    }

    // 3. Attribuer le badge "Premier pas"
    const { data: badge } = await supabaseAdmin
      .from('badges')
      .select('id')
      .eq('condition_type', 'register')
      .single()

    if (badge) {
      await supabaseAdmin
        .from('user_badges')
        .insert({ user_id: userId, badge_id: badge.id })
    }

    // 4. Créer les défis du jour
    await supabaseAdmin.from('daily_challenges').insert([
      { user_id: userId, challenge_type: 'lecture',  description: 'Lire un chapitre de la Bible', xp_reward: 50 },
      { user_id: userId, challenge_type: 'quiz',     description: 'Répondre à 5 questions de quiz', xp_reward: 40 },
      { user_id: userId, challenge_type: 'priere',   description: 'Temps de prière du matin', xp_reward: 30 },
    ])

    // Succès !
    return res.status(201).json({
      message: 'Compte créé avec succès ! Bienvenue dans Kingdom Journey 🎉',
      user: {
        id: userProfile.id,
        email: userProfile.email,
        username: userProfile.username,
        avatar: userProfile.avatar,
        xp: userProfile.xp,
        level: userProfile.level,
      },
    })

  } catch (error) {
    console.error('Erreur inscription:', error)
    return res.status(500).json({ error: 'Erreur serveur, réessaie dans quelques instants' })
  }
}
