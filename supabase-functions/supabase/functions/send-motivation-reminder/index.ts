import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// ── Rappel de motivation pour les retardataires (chaque soir vers 18h) ────
// Détecte deux catégories d'utilisateurs "en retard" :
//   1. N'ont pas joué au quiz aujourd'hui (aucune ligne dans cev_scores pour ce jour)
//   2. N'ont pas lu de chapitre biblique depuis plus de 2 jours (cev_profiles.last_bible_read)
// Envoie un message aléatoire parmi plusieurs variantes (pour éviter l'effet robotique),
// ciblé uniquement sur ces utilisateurs via include_external_user_ids.

const OS_APP_ID = "d2f59331-4855-48b6-9c39-e236ebe11ce0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

// ── Messages de motivation — variés pour ne pas lasser ──────────────────
// Ajoute-en librement ici : un est choisi au hasard à chaque envoi.

const QUIZ_MESSAGES_FR = [
  { title: "🎯 Ton défi t'attend !", body: "Tu n'as pas encore joué aujourd'hui. 5 minutes suffisent pour continuer ta série !" },
  { title: "🔥 Ne casse pas ta série !", body: "Un petit quiz aujourd'hui pour garder ton streak vivant ?" },
  { title: "📖 On t'a manqué !", body: "Le Quiz Biblique t'attend. Reviens tester tes connaissances aujourd'hui." },
  { title: "⏳ Il reste du temps aujourd'hui", body: "Prends quelques minutes pour jouer et gagner des XP avant la fin de la journée." },
  { title: "🏆 Grimpe au classement !", body: "D'autres joueurs avancent pendant que tu te reposes... à toi de jouer !" },
  { title: "💪 Un petit effort aujourd'hui", body: "Même une seule question aujourd'hui, ça compte pour ta constance." },
]

const QUIZ_MESSAGES_EN = [
  { title: "🎯 Your challenge is waiting!", body: "You haven't played today yet. 5 minutes is all it takes to keep going!" },
  { title: "🔥 Don't break your streak!", body: "A quick quiz today to keep your streak alive?" },
  { title: "📖 We missed you!", body: "The Bible Quiz is waiting. Come test your knowledge today." },
  { title: "⏳ There's still time today", body: "Take a few minutes to play and earn XP before the day ends." },
  { title: "🏆 Climb the leaderboard!", body: "Other players are moving up while you rest... your turn!" },
  { title: "💪 A small effort today", body: "Even one question today counts toward your consistency." },
]

const BIBLE_MESSAGES_FR = [
  { title: "📖 Ta lecture t'attend", body: "Ça fait un moment que tu n'as pas ouvert ta Bible ici. Un chapitre aujourd'hui ?" },
  { title: "🌱 Reprends ton plan de lecture", body: "Quelques minutes suffisent pour avancer dans ta lecture biblique." },
  { title: "✨ La Parole nourrit chaque jour", body: "Prends un moment aujourd'hui pour lire un chapitre et grandir dans la foi." },
  { title: "📅 Ne laisse pas ton plan de côté", body: "Ton plan de lecture biblique t'attend, reprends où tu t'es arrêté." },
]

const BIBLE_MESSAGES_EN = [
  { title: "📖 Your reading is waiting", body: "It's been a while since you opened your Bible here. One chapter today?" },
  { title: "🌱 Pick up your reading plan", body: "A few minutes is enough to move forward in your Bible reading." },
  { title: "✨ God's word feeds you daily", body: "Take a moment today to read a chapter and grow in faith." },
  { title: "📅 Don't leave your plan behind", body: "Your Bible reading plan is waiting, pick up where you left off." },
]

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function daysAgo(dateStr: string | null): number {
  if (!dateStr) return 999 // jamais lu → très en retard
  const then = new Date(dateStr + "T00:00:00Z").getTime()
  const now = new Date(todayStr() + "T00:00:00Z").getTime()
  return Math.round((now - then) / 86400000)
}

async function sendPush(osKey: string, userIds: string[], title: string, body: string, url: string) {
  if (userIds.length === 0) return { skipped: true }
  const MAX_TARGETS = 2000 // limite OneSignal par appel
  const batch = userIds.slice(0, MAX_TARGETS)
  const payload = {
    app_id: OS_APP_ID,
    include_external_user_ids: batch,
    headings: { en: title, fr: title },
    contents: { en: body, fr: body },
    url,
  }
  const res = await fetch("https://onesignal.com/api/v1/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Basic ${osKey}`,
    },
    body: JSON.stringify(payload),
  })
  return await res.json()
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? ""
    const providedSecret = req.headers.get("x-cron-secret") ?? ""
    if (!CRON_SECRET || providedSecret !== CRON_SECRET) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? ""
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    const OS_KEY = Deno.env.get("ONESIGNAL_REST_KEY") ?? ""

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !OS_KEY) {
      return new Response(JSON.stringify({ error: "Missing configuration (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / ONESIGNAL_REST_KEY)" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const sbHeaders = {
      "apikey": SUPABASE_SERVICE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
    }

    const today = todayStr()

    // ── 1. Tous les profils (id, dernière lecture biblique) ──────────────
    const profilesRes = await fetch(
      `${SUPABASE_URL}/rest/v1/cev_profiles?select=id,last_bible_read`,
      { headers: sbHeaders }
    )
    const profiles: { id: string; last_bible_read: string | null }[] = await profilesRes.json()

    // ── 2. Utilisateurs ayant déjà joué aujourd'hui (à exclure du rappel quiz) ─
    const scoresRes = await fetch(
      `${SUPABASE_URL}/rest/v1/cev_scores?day=eq.${today}&select=user_id`,
      { headers: sbHeaders }
    )
    const playedToday: { user_id: string }[] = await scoresRes.json()
    const playedTodaySet = new Set(playedToday.map((r) => r.user_id))

    // ── 3. Répartition des utilisateurs en deux groupes de rappel ────────
    const quizLaggards: string[] = []
    const bibleLaggards: string[] = []

    for (const p of profiles) {
      if (!playedTodaySet.has(p.id)) quizLaggards.push(p.id)
      if (daysAgo(p.last_bible_read) >= 2) bibleLaggards.push(p.id)
    }

    // Un utilisateur en retard sur les deux ne reçoit qu'UN seul message
    // (priorité au quiz, pour ne pas spammer) — évite la fatigue de notification.
    const bibleOnly = bibleLaggards.filter((id) => !quizLaggards.includes(id))

    const results: Record<string, unknown> = {}

    if (quizLaggards.length > 0) {
      const msgFr = pickRandom(QUIZ_MESSAGES_FR)
      const idx = QUIZ_MESSAGES_FR.indexOf(msgFr)
      const msgEn = QUIZ_MESSAGES_EN[idx]
      results.quiz = await sendPush(
        OS_KEY,
        quizLaggards,
        msgFr.title, // OneSignal choisit la bonne langue via contents/headings par code
        msgFr.body,
        "https://kingdom-journey.vercel.app/?notif=play"
      )
      results.quiz_count = quizLaggards.length
      // Note : pour un vrai multi-langue par utilisateur, il faudrait connaître la
      // langue préférée de chacun ; ici on envoie le même payload FR/EN et OneSignal
      // affiche la version correspondant à la langue de l'appareil du destinataire.
    }

    if (bibleOnly.length > 0) {
      const msgFr = pickRandom(BIBLE_MESSAGES_FR)
      const idx = BIBLE_MESSAGES_FR.indexOf(msgFr)
      results.bible = await sendPush(
        OS_KEY,
        bibleOnly,
        msgFr.title,
        msgFr.body,
        "https://kingdom-journey.vercel.app/?notif=bible"
      )
      results.bible_count = bibleOnly.length
    }

    console.log("Motivation reminder sent:", results)

    return new Response(JSON.stringify({ ok: true, ...results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (e) {
    console.error("send-motivation-reminder error:", e)
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
