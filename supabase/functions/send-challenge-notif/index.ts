import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const VAPID_PUBLIC_KEY = "BAtnn4tKG1GkasiWnMqSmjU5xP5tmGvwnL_D_fq_q6HI0Jxn0YruIQ5T6JbIb-QCQYgTOq-36UMvdPH-yrnRqGI"
const VAPID_SUBJECT = "mailto:cev.quiz@gmail.com"

function b64urlToBytes(b64: string): Uint8Array {
  const b = b64.replace(/-/g,'+').replace(/_/g,'/')+'=='.slice(0,(4-b64.length%4)%4)
  return new Uint8Array([...atob(b)].map(c=>c.charCodeAt(0)))
}
function bytesToB64url(arr: Uint8Array): string {
  return btoa(String.fromCharCode(...arr)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'')
}

async function vapidJWT(endpoint: string): Promise<string> {
  const url = new URL(endpoint)
  const aud = `${url.protocol}//${url.host}`
  const now = Math.floor(Date.now()/1000)
  const hdr = bytesToB64url(new TextEncoder().encode(JSON.stringify({typ:"JWT",alg:"ES256"})))
  const pay = bytesToB64url(new TextEncoder().encode(JSON.stringify({aud,exp:now+43200,sub:VAPID_SUBJECT})))
  const msg = `${hdr}.${pay}`
  const privKey = Deno.env.get("VAPID_PRIVATE_KEY") ?? ""
  const key = await crypto.subtle.importKey(
    "raw", b64urlToBytes(privKey),
    {name:"ECDSA",namedCurve:"P-256"}, false, ["sign"]
  )
  const sig = await crypto.subtle.sign({name:"ECDSA",hash:"SHA-256"}, key, new TextEncoder().encode(msg))
  return `${msg}.${bytesToB64url(new Uint8Array(sig))}`
}

serve(async (req) => {
  if (req.method==="OPTIONS") return new Response("ok",{headers:{"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,x-client-info,apikey,content-type"}})

  try {
    const {code, host_name, max_players} = await req.json()
    const supabase = createClient(Deno.env.get("SUPABASE_URL")??"", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"")
    const {data:tokens} = await supabase.from("cev_push_tokens").select("subscription,user_id")
    if (!tokens||tokens.length===0) return new Response(JSON.stringify({sent:0}),{status:200})

    const body = JSON.stringify({
      title:"⚔️ Challenge Biblique !",
      body:`${host_name} crée un challenge pour ${max_players} joueurs ! Code : ${code}`,
      icon:"/icons/icon-192x192.png",
      data:{code,url:"/"},
      tag:"cev-challenge",
      renotify:true
    })

    let sent=0, failed=0
    for (const t of tokens) {
      try {
        const sub = JSON.parse(t.subscription)
        const jwt = await vapidJWT(sub.endpoint)
        const r = await fetch(sub.endpoint,{
          method:"POST",
          headers:{
            "Authorization":`vapid t=${jwt},k=${VAPID_PUBLIC_KEY}`,
            "Content-Type":"application/json",
            "TTL":"86400",
            "Urgency":"high"
          },
          body
        })
        if (r.ok||r.status===201) sent++
        else if (r.status===410||r.status===404) {
          await supabase.from("cev_push_tokens").delete().eq("user_id",t.user_id)
          failed++
        } else failed++
      } catch(e) { failed++ }
    }

    return new Response(JSON.stringify({sent,failed,total:tokens.length}),{
      status:200,
      headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}
    })
  } catch(e) {
    return new Response(JSON.stringify({error:e.message}),{status:500})
  }
})
