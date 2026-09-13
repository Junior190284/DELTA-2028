import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/current-profile";
import crypto from "node:crypto";
import webpush from "web-push";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DELTA_URL = "https://www.delta.warszawa.pl/pilka.php?a=druzyny&druzyna=108";

type ClubItem = {
  source_key:string;
  title:string;
  body:string;
  published_at:string;
  priority:number;
  source_url:string;
};

function decodeEntities(input:string){
  return input
    .replace(/&nbsp;|&#160;/gi," ")
    .replace(/&amp;/gi,"&")
    .replace(/&quot;/gi,'"')
    .replace(/&#039;|&apos;/gi,"'")
    .replace(/&lt;/gi,"<")
    .replace(/&gt;/gi,">")
    .replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n)));
}

function decoderScore(text:string){
  let score=0;
  const good=[
    "Powołania","Górny Mokotów","Zbiórka","piłk","zajęcia",
    "drużyna","trening","Warszawa","Święto"
  ];
  for(const x of good) if(text.includes(x)) score+=20;
  const bad=["�","Ã","Å","Ä","Â","â€","PowoĹ","GĂłrny","piĹ"];
  for(const x of bad) score-=50*(text.split(x).length-1);
  return score;
}

function decodeHtml(buffer:ArrayBuffer){
  const candidates:string[]=[];
  for(const enc of ["windows-1250","utf-8","iso-8859-2"]){
    try{ candidates.push(new TextDecoder(enc).decode(buffer)); }catch{}
  }
  if(!candidates.length) return new TextDecoder().decode(buffer);
  return candidates.sort((a,b)=>decoderScore(b)-decoderScore(a))[0];
}

function htmlToTokens(html:string){
  const cleaned=html
    .replace(/<script[\s\S]*?<\/script>/gi," ")
    .replace(/<style[\s\S]*?<\/style>/gi," ")
    .replace(/<!--[\s\S]*?-->/g," ")
    .replace(/<(br|\/p|\/div|\/li|\/tr|\/td|\/h\d|\/a)>/gi,"\n")
    .replace(/<[^>]+>/g," ");

  return decodeEntities(cleaned)
    .replace(/\r/g,"")
    .split(/\n+/)
    .map(x=>x.replace(/\s+/g," ").trim())
    .filter(Boolean);
}

function stableId(title:string,date:string){
  return crypto.createHash("sha256").update(`${title}|${date}`).digest("hex");
}

function isDateToken(x:string){
  return /^\d{2}-\d{2}-\d{4}$/.test(x.trim());
}

function extractHeadlineAndDate(tokens:string[], i:number){
  const inline=tokens[i].match(/^(.*?)\s+(\d{2}-\d{2}-\d{4})$/);
  if(inline){
    return {title:inline[1].trim(),date:inline[2],dateIndex:i};
  }
  if(isDateToken(tokens[i]) && i>0){
    return {title:tokens[i-1].trim(),date:tokens[i].trim(),dateIndex:i};
  }
  return null;
}

function isBadHeadline(title:string){
  const t=title.trim();
  if(!t || t.length<4 || t.length>180) return true;
  if(/^\d{4}$/.test(t)) return true;
  if(/^kolejka\b/i.test(t)) return true;
  if(/^sezon \d{4}/i.test(t)) return true;
  if(/^2018$/i.test(t)) return true;
  if(/^Powołania 2018$/i.test(t)) return true; // reprezentacja, nie Górny Mokotów
  if(/^(SENIORZY|Trener|Asystent|Praktykant|Trener Bramkarzy)$/i.test(t)) return true;
  if(/K\.S\. Delta Warszawa .* - |FC Vizja|MUKS Julianów|RKS Ursus|Alfa Przymierze Rodzin/.test(t)) return true;
  return false;
}

function relevantScheduleExcerpt(parts:string[]){
  const keep:string[]=[];
  for(let i=0;i<parts.length;i++){
    const s=parts[i];
    const low=s.toLocaleLowerCase("pl-PL");
    const relevant=
      low.includes("2018") ||
      low.includes("dni wolne") ||
      low.includes("rozpoczęcie zajęć") ||
      low.includes("zakończenie zajęć") ||
      low.includes("przerwa świąteczna") ||
      low.includes("majówka") ||
      low.includes("boże ciało");

    if(relevant){
      if(i>0 && !keep.includes(parts[i-1])) keep.push(parts[i-1]);
      keep.push(s);
      if(i+1<parts.length) keep.push(parts[i+1]);
    }
  }
  return [...new Set(keep)].join(" ").replace(/\s+/g," ").trim().slice(0,3000);
}

function buildBody(title:string, parts:string[]){
  const cleaned=parts
    .filter(x=>x && !/^\[?\d+\]?$/.test(x))
    .filter(x=>!/^>>>$/.test(x))
    .filter(x=>!/^Copyright/i.test(x))
    .filter(x=>!/^ZAPISY$/i.test(x));

  if(/^Grafik sezon/i.test(title)){
    return relevantScheduleExcerpt(cleaned);
  }

  return cleaned.join(" ").replace(/\s+/g," ").trim().slice(0,3200);
}

function priority(title:string){
  const t=title.toLocaleLowerCase("pl-PL");
  if(t.includes("powołania 2018 górny mokotów")) return 100;
  if(t.includes("zmiana miejsca treningu")) return 95;
  if(t.includes("grafik sezon")) return 90;
  if(t.includes("zgrupowanie")) return 80;
  if(t.includes("trening") || t.includes("zajęcia")) return 75;
  return 60;
}

function parseDeltaUpdates(html:string){
  const tokens=htmlToTokens(html);

  // Start exactly at the news feed of this team. This prevents roster,
  // standings and future schedule rows from being mistaken for articles.
  const start=tokens.findIndex(x=>x.includes("Powołania 2018 Górny Mokotów"));
  if(start<0) throw new Error("Nie znaleziono sekcji wiadomości 2018 Górny Mokotów na stronie DELTY.");

  const scoped=tokens.slice(start);
  const heads:{title:string;date:string;headIndex:number;dateIndex:number}[]=[];

  for(let i=0;i<scoped.length;i++){
    const h=extractHeadlineAndDate(scoped,i);
    if(!h || isBadHeadline(h.title)) continue;

    // Headline is accepted only when it looks like a real news title.
    // This removes date lines embedded in article bodies.
    const title=h.title;
    const looksNews=
      /[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]/.test(title) &&
      !/^\d{1,2}[:.]\d{2}/.test(title) &&
      !/^(od|do)\s+\d{2}-\d{2}-\d{4}/i.test(title);

    if(!looksNews) continue;

    // Avoid duplicate detection when date was in the same token.
    if(heads.some(x=>x.dateIndex===h.dateIndex)) continue;

    heads.push({title,date:h.date,headIndex:i,dateIndex:h.dateIndex});
  }

  const items:ClubItem[]=[];

  for(let n=0;n<heads.length;n++){
    const h=heads[n];

    // Skip central 2018 representation call-up; this app is for Górny Mokotów.
    if(/^Powołania 2018$/i.test(h.title)) continue;

    const next=heads[n+1];
    const bodyStart=h.dateIndex+1;
    const bodyEnd=next ? next.headIndex : Math.min(scoped.length,bodyStart+100);
    const parts=scoped.slice(bodyStart,bodyEnd);
    const body=buildBody(h.title,parts);

    const [dd,mm,yyyy]=h.date.split("-");
    items.push({
      source_key:stableId(h.title,h.date),
      title:h.title,
      body,
      published_at:`${yyyy}-${mm}-${dd}T12:00:00+02:00`,
      priority:priority(h.title),
      source_url:DELTA_URL
    });
  }

  const unique=new Map<string,ClubItem>();
  for(const item of items){
    if(!unique.has(item.source_key)) unique.set(item.source_key,item);
  }

  const result=[...unique.values()]
    .filter(x=>x.title!=="2018")
    .filter(x=>!/^20\d{2}$/.test(x.title))
    .sort((a,b)=>b.published_at.localeCompare(a.published_at))
    .slice(0,30);

  // Safety guard: never wipe the existing feed if parsing went wrong.
  if(result.length<3 || !result.some(x=>x.title.includes("Powołania 2018 Górny Mokotów"))){
    throw new Error(`Parser DELTY zwrócił podejrzany wynik (${result.length} wpisów). Baza nie została wyczyszczona.`);
  }

  return result;
}

async function sendClubPush(admin:any,newItems:ClubItem[]){
  if(!newItems.length) return {sent:0,failed:0,skipped:true};

  const subject=process.env.VAPID_SUBJECT;
  const publicKey=process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey=process.env.VAPID_PRIVATE_KEY;
  if(!subject||!publicKey||!privateKey){
    return {sent:0,failed:0,skipped:true,reason:"VAPID not configured"};
  }

  webpush.setVapidDetails(subject,publicKey,privateKey);
  const {data:subs,error}=await admin.from("push_subscriptions").select("id,endpoint,p256dh,auth");
  if(error) throw error;

  const primary=newItems[0];
  const payload=JSON.stringify({
    title:newItems.length===1 ? "Nowa informacja z klubu" : `${newItems.length} nowe informacje z klubu`,
    body:newItems.length===1 ? primary.title : `${primary.title} (+${newItems.length-1})`,
    url:`/dashboard?view=club&club=${encodeURIComponent(primary.source_key)}`,
    tag:`delta-club-${primary.source_key}`
  });

  let sent=0,failed=0;
  for(const sub of subs||[]){
    try{
      await webpush.sendNotification({
        endpoint:sub.endpoint,
        keys:{p256dh:sub.p256dh,auth:sub.auth}
      },payload);
      sent++;
    }catch(err:any){
      failed++;
      const code=Number(err?.statusCode||0);
      if(code===404||code===410){
        await admin.from("push_subscriptions").delete().eq("id",sub.id);
      }
    }
  }
  return {sent,failed,skipped:false};
}

async function authorize(req:NextRequest){
  const secret=process.env.DELTA_SYNC_SECRET;
  const sent=req.headers.get("x-delta-sync-secret") || req.nextUrl.searchParams.get("secret");
  if(secret && sent && secret===sent) return true;

  try{
    const {profile}=await getCurrentProfile();
    return profile?.role==="admin";
  }catch{
    return false;
  }
}

export async function POST(req:NextRequest){
  if(!(await authorize(req))){
    return NextResponse.json({error:"Unauthorized"},{status:401});
  }

  try{
    const res=await fetch(DELTA_URL,{
      cache:"no-store",
      headers:{
        "user-agent":"DELTA-2018-GM-TeamHub/1.0 (+https://delta-2028.vercel.app)",
        "accept":"text/html,application/xhtml+xml"
      }
    });

    if(!res.ok) throw new Error(`DELTA HTTP ${res.status}`);

    const buffer=await res.arrayBuffer();
    const html=decodeHtml(buffer);
    const items=parseDeltaUpdates(html);
    const admin=createAdminClient();

    // V8.7.8: after successful parsing, replace the old source feed completely.
    // This removes malformed V8.7.6/V8.7.7 rows such as 2017/2019/2020 cards.
    const {data:oldRows,error:oldErr}=await admin
      .from("club_updates")
      .select("id,source_key")
      .eq("source_url",DELTA_URL);

    if(oldErr) throw oldErr;
    const cleaned=oldRows?.length||0;
    const oldKeys=new Set((oldRows||[]).map((x:any)=>x.source_key));
    const newItems=items.filter(item=>!oldKeys.has(item.source_key));

    const {error:deleteErr}=await admin
      .from("club_updates")
      .delete()
      .eq("source_url",DELTA_URL);
    if(deleteErr) throw deleteErr;

    const now=new Date().toISOString();
    const rows=items.map(item=>({
      ...item,
      source_name:"K.S. Delta Warszawa",
      synced_at:now
    }));

    const {error:insertErr}=await admin.from("club_updates").insert(rows);
    if(insertErr) throw insertErr;

    const push=await sendClubPush(admin,newItems);

    await admin.from("delta_sync_log").insert({
      status:"ok",
      items_found:items.length,
      items_inserted:newItems.length,
      details:`clean_feed=true; removed_old=${cleaned}; encoding=fixed; new=${newItems.length}; push_sent=${push.sent}; push_failed=${push.failed}`
    });

    return NextResponse.json({
      ok:true,
      source:DELTA_URL,
      found:items.length,
      inserted:newItems.length,
      updated:Math.max(0,items.length-newItems.length),
      cleaned,
      new_items:newItems.length,
      push,
      synced_at:now,
      preview:items.slice(0,5).map(x=>x.title)
    });
  }catch(error:any){
    try{
      const admin=createAdminClient();
      await admin.from("delta_sync_log").insert({
        status:"error",
        items_found:0,
        items_inserted:0,
        details:String(error?.message||error)
      });
    }catch{}
    return NextResponse.json({ok:false,error:String(error?.message||error)},{status:500});
  }
}

export async function GET(req:NextRequest){
  return POST(req);
}
