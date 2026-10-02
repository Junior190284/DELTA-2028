import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/current-profile";
import { decodeDeltaHtml, parseDeltaUpdates, type ClubItem } from "@/lib/delta-sync/parser";
import crypto from "node:crypto";
import webpush from "web-push";

export const dynamic="force-dynamic";
export const runtime="nodejs";

const DELTA_URL="https://www.delta.warszawa.pl/pilka.php?a=druzyny&druzyna=108";
const FETCH_TIMEOUT_MS=15_000;
const MAX_HTML_BYTES=5_000_000;

type ExistingClubItem={
  source_key:string;
  title:string;
  body:string|null;
  priority:number;
  published_at:string;
};

function sameItem(existing:ExistingClubItem,item:ClubItem){
  return existing.title===item.title
    && (existing.body||"")===(item.body||"")
    && existing.priority===item.priority
    && new Date(existing.published_at).toISOString()===new Date(item.published_at).toISOString();
}

function errorCategory(error:unknown){
  const message=String((error as any)?.message||error);
  const name=String((error as any)?.name||"");
  if(name==="TimeoutError"||name==="AbortError"||/timeout/i.test(message))return "timeout";
  if(/^DELTA_HTTP_/.test(message))return "source_http";
  if(/^DELTA_CONTENT_TYPE/.test(message))return "source_content_type";
  if(/^DELTA_RESPONSE_SIZE/.test(message))return "source_response_size";
  if(name==="DeltaParserError")return "parser";
  return "internal";
}

async function sendClubPush(admin:any,newItems:ClubItem[]){
  if(!newItems.length)return {sent:0,failed:0,skipped:true};
  const subject=process.env.VAPID_SUBJECT;
  const publicKey=process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey=process.env.VAPID_PRIVATE_KEY;
  if(!subject||!publicKey||!privateKey)return {sent:0,failed:0,skipped:true,reason:"VAPID not configured"};

  webpush.setVapidDetails(subject,publicKey,privateKey);
  const {data:subscriptions,error}=await admin.from("push_subscriptions").select("id,endpoint,p256dh,auth");
  if(error)throw error;

  const primary=newItems[0];
  const payload=JSON.stringify({
    title:newItems.length===1?"Nowa informacja z klubu":`${newItems.length} nowe informacje z klubu`,
    body:newItems.length===1?primary.title:`${primary.title} (+${newItems.length-1})`,
    url:`/dashboard?view=club&club=${encodeURIComponent(primary.source_key)}`,
    tag:`delta-club-${primary.source_key}`
  });

  let sent=0;
  let failed=0;
  for(const subscription of subscriptions||[]){
    try{
      await webpush.sendNotification({
        endpoint:subscription.endpoint,
        keys:{p256dh:subscription.p256dh,auth:subscription.auth}
      },payload);
      sent++;
    }catch(error:any){
      failed++;
      const code=Number(error?.statusCode||0);
      if(code===404||code===410)await admin.from("push_subscriptions").delete().eq("id",subscription.id);
    }
  }
  return {sent,failed,skipped:false};
}

function validSecret(expected:string,sent:string|null){
  if(!sent)return false;
  const expectedBuffer=Buffer.from(expected);
  const sentBuffer=Buffer.from(sent);
  return expectedBuffer.length===sentBuffer.length&&crypto.timingSafeEqual(expectedBuffer,sentBuffer);
}

async function authorize(request:NextRequest){
  const secret=process.env.DELTA_SYNC_SECRET;
  if(secret&&validSecret(secret,request.headers.get("x-delta-sync-secret")))return true;
  try{
    const {profile}=await getCurrentProfile();
    return profile?.role==="admin";
  }catch{
    return false;
  }
}

export async function POST(request:NextRequest){
  if(!(await authorize(request)))return NextResponse.json({error:"Unauthorized"},{status:401});
  const startedAt=Date.now();

  try{
    const response=await fetch(DELTA_URL,{
      cache:"no-store",
      signal:AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers:{
        "user-agent":"DELTA-2018-GM-TeamHub/2.0 (+https://delta-2028.vercel.app)",
        accept:"text/html,application/xhtml+xml"
      }
    });
    if(!response.ok)throw new Error(`DELTA_HTTP_${response.status}`);
    const contentType=response.headers.get("content-type")||"";
    if(contentType&&!contentType.toLocaleLowerCase().includes("text/html")){
      throw new Error(`DELTA_CONTENT_TYPE_${contentType}`);
    }

    const buffer=await response.arrayBuffer();
    if(buffer.byteLength<1_000||buffer.byteLength>MAX_HTML_BYTES){
      throw new Error(`DELTA_RESPONSE_SIZE_${buffer.byteLength}`);
    }

    const items=parseDeltaUpdates(decodeDeltaHtml(buffer),DELTA_URL);
    const admin=createAdminClient();
    const {data:existingRows,error:existingError}=await admin
      .from("club_updates")
      .select("source_key,title,body,priority,published_at")
      .eq("source_url",DELTA_URL);
    if(existingError)throw existingError;

    const existingByKey=new Map((existingRows||[]).map((row:ExistingClubItem)=>[row.source_key,row]));
    const newItems=items.filter(item=>!existingByKey.has(item.source_key));
    const updatedItems=items.filter(item=>{
      const existing=existingByKey.get(item.source_key);
      return existing&&!sameItem(existing,item);
    });
    const now=new Date().toISOString();
    const rows=items.map(({content_hash:_,...item})=>({...item,source_name:"K.S. Delta Warszawa",synced_at:now}));
    const {error:upsertError}=await admin.from("club_updates").upsert(rows,{onConflict:"source_key"});
    if(upsertError)throw upsertError;

    const push=await sendClubPush(admin,newItems);
    const durationMs=Date.now()-startedAt;
    const details={
      source:DELTA_URL,
      duration_ms:durationMs,
      new:newItems.length,
      updated:updatedItems.length,
      unchanged:Math.max(0,items.length-newItems.length-updatedItems.length),
      push_sent:push.sent,
      push_failed:push.failed
    };
    const {error:logError}=await admin.from("delta_sync_log").insert({
      status:"ok",
      items_found:items.length,
      items_inserted:newItems.length,
      details:JSON.stringify(details)
    });
    if(logError)console.error("DELTA Sync log write failed:",logError.message);

    return NextResponse.json({
      ok:true,
      source:DELTA_URL,
      found:items.length,
      inserted:newItems.length,
      updated:updatedItems.length,
      unchanged:details.unchanged,
      push,
      duration_ms:durationMs,
      synced_at:now,
      preview:items.slice(0,5).map(item=>item.title)
    });
  }catch(error:unknown){
    const durationMs=Date.now()-startedAt;
    const message=String((error as any)?.message||error);
    try{
      const admin=createAdminClient();
      await admin.from("delta_sync_log").insert({
        status:"error",
        items_found:0,
        items_inserted:0,
        details:JSON.stringify({source:DELTA_URL,duration_ms:durationMs,category:errorCategory(error),message})
      });
    }catch{}
    return NextResponse.json({ok:false,error:message,category:errorCategory(error),duration_ms:durationMs},{status:500});
  }
}
