import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" }})
  }
  try {
    const { code, host_name, max_players } = await req.json()
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "")
    const { data: tokens } = await supabase.from("cev_push_tokens").select("subscription, user_id")
    if (!tokens || tokens.length === 0) return new Response(JSON.stringify({ sent: 0 }), { status: 200 })
    let sent = 0
    for (const token of tokens) {
      try {
        const sub = JSON.parse(token.subscription)
        const payload = JSON.stringify({
          title: "⚔️ Challenge Biblique !",
          body: `${host_name} crée un challenge pour ${max_players} joueurs ! Code : ${code}`,
          icon: "/icons/icon-192x192.png",
          data: { code }
        })
        const r = await fetch(sub.endpoint, { method: "POST", headers: { "Content-Type": "application/octet-stream", "TTL": "86400" }, body: new TextEncoder().encode(payload) })
        if (r.ok || r.status === 201) sent++
        else if (r.status === 410 || r.status === 404) await supabase.from("cev_push_tokens").delete().eq("user_id", token.user_id)
      } catch(e) {}
    }
    return new Response(JSON.stringify({ sent, total: tokens.length }), { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }})
  } catch(e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
})