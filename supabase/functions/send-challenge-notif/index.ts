import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const OS_APP_ID = "d2f59331-4855-48b6-9c39-e236ebe11ce0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { code, host_name, max_players, lang } = body

    const OS_KEY = Deno.env.get("ONESIGNAL_REST_KEY") ?? ""

    if (!OS_KEY) {
      console.error("ONESIGNAL_REST_KEY not set!")
      return new Response(
        JSON.stringify({ error: "ONESIGNAL_REST_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const fr = lang !== "en"
    const title = fr ? "⚔️ Challenge Biblique !" : "⚔️ Bible Challenge!"
    const body_msg = fr
      ? `${host_name} crée un challenge pour ${max_players} joueurs ! Code : ${code}`
      : `${host_name} created a challenge for ${max_players} players! Code: ${code}`

    console.log(`Sending notification: ${title} - ${body_msg}`)
    console.log(`OS_KEY starts with: ${OS_KEY.slice(0, 20)}...`)

    // Appel OneSignal API v1
    const osResponse = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${OS_KEY}`,
      },
      body: JSON.stringify({
        app_id: OS_APP_ID,
        included_segments: ["All"],
        headings: { en: title, fr: title },
        contents: { en: body_msg, fr: body_msg },
        data: { code: code, type: "challenge" },
        url: "https://kingdom-journey.vercel.app",
        chrome_web_icon: "https://kingdom-journey.vercel.app/icons/icon-192x192.png",
        chrome_web_badge: "https://kingdom-journey.vercel.app/icons/icon-96x96.png",
        priority: 10,
        ttl: 3600,
      }),
    })

    const osResult = await osResponse.json()
    console.log("OneSignal response status:", osResponse.status)
    console.log("OneSignal response:", JSON.stringify(osResult))

    return new Response(
      JSON.stringify({
        ok: osResponse.ok,
        status: osResponse.status,
        result: osResult,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  } catch (e) {
    console.error("Edge function error:", e.message)
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
