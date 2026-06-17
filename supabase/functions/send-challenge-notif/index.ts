import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const OS_APP_ID = "d2f59331-4855-48b6-9c39-e236ebe11ce0"

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      }
    })
  }

  try {
    const { code, host_name, max_players, lang } = await req.json()
    const OS_KEY = Deno.env.get("ONESIGNAL_REST_KEY") ?? ""

    const fr = lang !== "en"
    const title = fr ? "⚔️ Challenge Biblique !" : "⚔️ Bible Challenge!"
    const body = fr
      ? `${host_name} crée un challenge pour ${max_players} joueurs ! Code : ${code}`
      : `${host_name} created a challenge for ${max_players} players! Code: ${code}`

    const response = await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Key ${OS_KEY}`
      },
      body: JSON.stringify({
        app_id: OS_APP_ID,
        included_segments: ["All"],
        headings: { en: title, fr: title },
        contents: { en: body, fr: body },
        data: { code, type: "challenge" },
        url: "https://kingdom-journey.vercel.app",
        chrome_web_icon: "https://kingdom-journey.vercel.app/icons/icon-192x192.png",
        chrome_web_badge: "https://kingdom-journey.vercel.app/icons/icon-96x96.png",
      })
    })

    const result = await response.json()
    console.log("OneSignal response:", JSON.stringify(result))

    return new Response(
      JSON.stringify({ ok: response.ok, result }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    )
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})
