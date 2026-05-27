// api/eli.js
// Route : POST /api/eli
// Envoie un message à l'assistant Eli (propulsé par Claude d'Anthropic)

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

// Limite : 20 messages par jour en version gratuite
async function checkDailyLimit(userId) {
  const today = new Date().toISOString().split('T')[0]
  const { count } = await supabaseAdmin
    .from('eli_conversations')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .eq('role', 'user')
    .gte('sent_at', today + 'T00:00:00')

  return count < 20
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' })
  }

  const user = await getUserFromToken(req)
  if (!user) {
    return res.status(401).json({ error: 'Connexion requise pour parler à Eli' })
  }

  const { message } = req.body
  if (!message?.trim()) {
    return res.status(400).json({ error: 'Message vide' })
  }

  // Vérifier la limite quotidienne
  const withinLimit = await checkDailyLimit(user.id)
  if (!withinLimit) {
    return res.status(429).json({
      error: 'Limite quotidienne atteinte (20 messages/jour en version gratuite)',
      upgrade_message: 'Passe à Premium pour des conversations illimitées avec Eli !'
    })
  }

  try {
    // Récupérer l'historique récent de la conversation (10 derniers échanges)
    const { data: history } = await supabaseAdmin
      .from('eli_conversations')
      .select('role, content')
      .eq('user_id', user.id)
      .order('sent_at', { ascending: false })
      .limit(20)

    const conversationHistory = (history || []).reverse()

    // Récupérer le profil pour personnaliser la réponse
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('username, level, profile_type')
      .eq('id', user.id)
      .single()

    // Appel à l'API Anthropic (Claude)
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001', // Rapide et économique
        max_tokens: 500,
        system: `Tu es Eli, l'assistant biblique bienveillant de l'application Kingdom Journey.
Tu parles en français, avec chaleur et encouragement.
L'utilisateur s'appelle ${userProfile?.username || 'ami'}, niveau ${userProfile?.level || 1}.
Profil : ${userProfile?.profile_type || 'adulte'}.

Tes rôles :
- Expliquer des versets et histoires bibliques simplement
- Suggérer des versets selon les émotions de l'utilisateur
- Encourager la lecture et la prière quotidienne
- Répondre aux questions spirituelles avec sagesse et douceur

Règles :
- Toujours citer la référence (Livre Chapitre:Verset) quand tu cites la Bible
- Garder les réponses courtes et claires (3-5 phrases max)
- Ne jamais juger, toujours encourager
- Si l'utilisateur est triste/stressé, proposer un verset de réconfort
- Terminer par une question ou une invitation à continuer`,

        messages: [
          ...conversationHistory.map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: message }
        ],
      }),
    })

    if (!response.ok) {
      throw new Error('Erreur API Anthropic')
    }

    const aiData = await response.json()
    const aiReply = aiData.content[0].text

    // Sauvegarder les deux messages en base
    await supabaseAdmin.from('eli_conversations').insert([
      { user_id: user.id, role: 'user',      content: message  },
      { user_id: user.id, role: 'assistant', content: aiReply  },
    ])

    return res.status(200).json({ reply: aiReply })

  } catch (error) {
    console.error('Erreur Eli:', error)
    return res.status(500).json({
      error: 'Eli est momentanément indisponible',
      reply: 'Je rencontre une difficulté technique. En attendant, voici un verset pour toi : "Je puis tout par celui qui me fortifie." — Philippiens 4:13 🙏'
    })
  }
}
