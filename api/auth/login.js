// api/auth/login.js
// Route : POST /api/auth/login
// Connecte un utilisateur existant

import { supabase, supabaseAdmin } from '../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' })
  }

  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' })
  }

  try {
    // 1. Connexion via Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' })
    }

    const userId = authData.user.id

    // 2. Récupérer le profil complet
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select(`
        *,
        tribes (name, emoji),
        user_badges (
          earned_at,
          badges (name, emoji, description)
        )
      `)
      .eq('id', userId)
      .single()

    if (profileError) {
      return res.status(500).json({ error: 'Erreur récupération du profil' })
    }

    // 3. Mettre à jour le streak
    const today = new Date().toISOString().split('T')[0]
    const lastActive = userProfile.last_active

    let newStreak = userProfile.streak
    if (lastActive) {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]

      if (lastActive === yesterdayStr) {
        newStreak += 1 // Jour consécutif !
      } else if (lastActive !== today) {
        newStreak = 1 // Streak cassé, on repart à 1
      }
    } else {
      newStreak = 1
    }

    await supabaseAdmin
      .from('users')
      .update({ last_active: today, streak: newStreak })
      .eq('id', userId)

    // 4. Créer les défis du jour s'ils n'existent pas encore
    const { data: existingChallenges } = await supabaseAdmin
      .from('daily_challenges')
      .select('id')
      .eq('user_id', userId)
      .eq('challenge_date', today)

    if (!existingChallenges || existingChallenges.length === 0) {
      await supabaseAdmin.from('daily_challenges').insert([
        { user_id: userId, challenge_type: 'lecture',  description: 'Lire un chapitre de la Bible', xp_reward: 50, challenge_date: today },
        { user_id: userId, challenge_type: 'quiz',     description: 'Répondre à 5 questions de quiz', xp_reward: 40, challenge_date: today },
        { user_id: userId, challenge_type: 'priere',   description: 'Temps de prière du matin', xp_reward: 30, challenge_date: today },
      ])
    }

    // 5. Retourner tout ce dont l'app a besoin
    return res.status(200).json({
      message: 'Connexion réussie !',
      session: {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        expires_at: authData.session.expires_at,
      },
      user: {
        id: userProfile.id,
        email: userProfile.email,
        username: userProfile.username,
        avatar: userProfile.avatar,
        profile_type: userProfile.profile_type,
        xp: userProfile.xp,
        level: userProfile.level,
        streak: newStreak,
        tribe: userProfile.tribes,
        badges: userProfile.user_badges?.map(ub => ub.badges) || [],
        is_premium: userProfile.is_premium,
      },
    })

  } catch (error) {
    console.error('Erreur connexion:', error)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
}
