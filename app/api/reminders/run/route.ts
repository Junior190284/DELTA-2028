import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic="force-dynamic";

function plDate(offsetDays=0){
  const now=new Date();
  const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Warsaw",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(now);
  const y=Number(parts.find(p=>p.type==="year")?.value);const m=Number(parts.find(p=>p.type==="month")?.value);const d=Number(parts.find(p=>p.type==="day")?.value);
  const x=new Date(Date.UTC(y,m-1,d+offsetDays));
  return `${x.getUTCFullYear()}-${String(x.getUTCMonth()+1).padStart(2,"0")}-${String(x.getUTCDate()).padStart(2,"0")}`;
}

function safe(err:any){return String(err?.body||err?.message||err||"błąd").slice(0,300)}

export async function POST(req:NextRequest){
  const secret=process.env.DELTA_SYNC_SECRET;
  const supplied=req.headers.get("authorization")?.replace(/^Bearer\s+/i,"")||req.headers.get("x-delta-secret")||"";
  if(!secret||supplied!==secret)return NextResponse.json({error:"Unauthorized"},{status:401});

  const subject=process.env.VAPID_SUBJECT;
  const publicKey=process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey=process.env.VAPID_PRIVATE_KEY;
  if(!subject||!publicKey||!privateKey)return NextResponse.json({error:"VAPID_CONFIG"},{status:500});
  webpush.setVapidDetails(subject,publicKey,privateKey);

  const admin=createAdminClient();
  const today=plDate(0),tomorrow=plDate(1);
  const [matchesQ,linksQ,attQ,subsQ,trainingQ,birthdaysQ,logQ]=await Promise.all([
    admin.from("matches").select("id,match_date,match_time,home_team,away_team,status").in("match_date",[today,tomorrow]).eq("status","scheduled"),
    admin.from("parent_players").select("parent_id,player_id"),
    admin.from("match_attendance").select("match_id,player_id,status"),
    admin.from("push_subscriptions").select("id,user_id,endpoint,p256dh,auth"),
    admin.from("training_sessions").select("id,training_date,start_time,title,location").eq("training_date",tomorrow),
    admin.from("team_events").select("id,title,event_date,event_type").eq("event_date",today).eq("event_type","birthday"),
    admin.from("smart_notification_log").select("notification_key").gte("created_at",new Date(Date.now()-14*86400000).toISOString())
  ]);
  const errors=[matchesQ.error,linksQ.error,attQ.error,subsQ.error,trainingQ.error,birthdaysQ.error,logQ.error].filter(Boolean);
  if(errors.length)return NextResponse.json({error:"READ_FAILED",details:errors.map(e=>e?.message)},{status:500});

  const subsByUser=new Map<string,any[]>();
  for(const s of subsQ.data||[])subsByUser.set(s.user_id,[...(subsByUser.get(s.user_id)||[]),s]);
  const sentKeys=new Set((logQ.data||[]).map((x:any)=>x.notification_key));
  let sent=0,failed=0,removed=0,skipped=0;

  async function sendUser(userId:string,key:string,kind:string,title:string,body:string,url:string){
    if(sentKeys.has(key)){skipped++;return;}
    const subs=subsByUser.get(userId)||[];
    if(!subs.length){skipped++;return;}
    let anySent=false;
    for(const s of subs){
      try{
        await webpush.sendNotification({endpoint:s.endpoint,keys:{p256dh:s.p256dh,auth:s.auth}},JSON.stringify({title,body,url,tag:key}),{TTL:60*60*24});
        sent++;anySent=true;
      }catch(e:any){
        failed++;const code=Number(e?.statusCode||0);if(code===404||code===410){await admin.from("push_subscriptions").delete().eq("id",s.id);removed++;}
        console.error("smart reminder",key,code,safe(e));
      }
    }
    if(anySent){await admin.from("smart_notification_log").upsert({notification_key:key,user_id:userId,kind},{onConflict:"notification_key"});sentKeys.add(key);}
  }

  // Parent RSVP reminders for matches today/tomorrow.
  for(const m of matchesQ.data||[]){
    for(const link of linksQ.data||[]){
      const answered=(attQ.data||[]).some((a:any)=>a.match_id===m.id&&a.player_id===link.player_id&&["yes","no","maybe","present"].includes(a.status));
      if(answered)continue;
      const when=m.match_date===today?"Dziś":"Jutro";
      await sendUser(link.parent_id,`rsvp:${m.id}:${link.player_id}`,"rsvp","DELTA 2018 GM — potwierdź obecność",`${when} mecz. Potwierdź obecność zawodnika.`,"/dashboard?view=matchday");
    }
  }

  // Training tomorrow: one notification per subscribed user.
  for(const tr of trainingQ.data||[]){
    for(const userId of subsByUser.keys())await sendUser(userId,`training:${tr.id}:${userId}`,"training","DELTA 2018 GM — trening jutro",`${tr.title||"Trening"} ${tr.start_time?.slice(0,5)||""}${tr.location?` • ${tr.location}`:""}`,"/dashboard?view=training");
  }

  // Birthday / team celebration today.
  for(const b of birthdaysQ.data||[]){
    for(const userId of subsByUser.keys())await sendUser(userId,`birthday:${b.id}:${userId}`,"birthday","DELTA 2018 GM 🎂",b.title,"/dashboard?view=calendar");
  }

  return NextResponse.json({ok:true,date:{today,tomorrow},sent,failed,removed,skipped});
}
