import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/current-profile";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DELTA_URL = "https://www.delta.warszawa.pl/pilka.php?a=druzyny&druzyna=108";

function decodeEntities(input:string){
  return input
    .replace(/&nbsp;/gi," ")
    .replace(/&amp;/gi,"&")
    .replace(/&quot;/gi,'"')
    .replace(/&#039;|&apos;/gi,"'")
    .replace(/&lt;/gi,"<")
    .replace(/&gt;/gi,">")
    .replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n)));
}

function htmlToLines(html:string){
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi," ")
    .replace(/<style[\s\S]*?<\/style>/gi," ")
    .replace(/<(br|\/p|\/div|\/li|\/tr|\/td|\/h\d)>/gi,"\n")
    .replace(/<[^>]+>/g," ");
  return decodeEntities(cleaned)
    .replace(/\r/g,"")
    .split("\n")
    .map(x=>x.replace(/\s+/g," ").trim())
    .filter(Boolean);
}

function stableId(title:string,date:string,body:string){
  return crypto.createHash("sha256").update(`${title}|${date}|${body.slice(0,500)}`).digest("hex");
}

function relevance(title:string, body:string){
  const s=(title+" "+body).toLocaleLowerCase("pl-PL");
  if(s.includes("2018 górny mokotów")) return 100;
  if(s.includes("powołania 2018")) return 95;
  if(s.includes("drużyna: 2018") || s.includes("drużyny: 2018")) return 90;
  if(s.includes("2018") && (s.includes("trening") || s.includes("mecz") || s.includes("turniej") || s.includes("grafik"))) return 80;
  if(s.includes("górny mokotów")) return 75;
  if(s.includes("trening") || s.includes("grafik") || s.includes("dni wolne") || s.includes("aktualizacja")) return 55;
  return 25;
}

function parseDeltaUpdates(html:string){
  const lines=htmlToLines(html);
  const candidates:{source_key:string;title:string;body:string;published_at:string;priority:number;source_url:string}[]=[];
  const dateRx=/^(.*?)(\d{2}-\d{2}-\d{4})$/;

  for(let i=0;i<lines.length;i++){
    const m=lines[i].match(dateRx);
    if(!m) continue;

    const title=m[1].trim().replace(/\s+/g," ");
    const date=m[2];
    if(!title || title.length<3 || title.length>180) continue;

    const bodyParts:string[]=[];
    for(let j=i+1;j<Math.min(lines.length,i+18);j++){
      if(dateRx.test(lines[j])) break;
      if(bodyParts.join(" ").length>2400) break;
      bodyParts.push(lines[j]);
    }

    const body=bodyParts.join(" ").trim();
    const [dd,mm,yyyy]=date.split("-");
    const published_at=`${yyyy}-${mm}-${dd}T12:00:00+02:00`;
    const priority=relevance(title,body);

    candidates.push({
      source_key:stableId(title,date,body),
      title,
      body,
      published_at,
      priority,
      source_url:DELTA_URL
    });
  }

  // Keep newest unique items; page may repeat some navigation text.
  const unique=new Map<string,(typeof candidates)[number]>();
  for(const item of candidates){
    if(!unique.has(item.source_key)) unique.set(item.source_key,item);
  }

  return [...unique.values()]
    .filter(x=>x.priority>=50)
    .sort((a,b)=>b.published_at.localeCompare(a.published_at))
    .slice(0,40);
}

async function authorize(req:NextRequest){
  const secret=process.env.DELTA_SYNC_SECRET;
  const sent=req.headers.get("x-delta-sync-secret") || req.nextUrl.searchParams.get("secret");
  if(secret && sent && secret===sent) return true;

  try{
    const { profile }=await getCurrentProfile();
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
        "user-agent":"DELTA-2018-GM-TeamHub/1.0 (+https://delta-2028.vercel.app)"
      }
    });

    if(!res.ok){
      throw new Error(`DELTA HTTP ${res.status}`);
    }

    const html=await res.text();
    const items=parseDeltaUpdates(html);
    const admin=createAdminClient();

    let inserted=0;
    let updated=0;

    for(const item of items){
      const {data:existing}=await admin
        .from("club_updates")
        .select("id,source_key")
        .eq("source_key",item.source_key)
        .maybeSingle();

      const row={
        ...item,
        source_name:"K.S. Delta Warszawa",
        synced_at:new Date().toISOString()
      };

      if(existing){
        const {error}=await admin.from("club_updates").update(row).eq("id",existing.id);
        if(error) throw error;
        updated++;
      }else{
        const {error}=await admin.from("club_updates").insert(row);
        if(error) throw error;
        inserted++;
      }
    }

    await admin.from("delta_sync_log").insert({
      status:"ok",
      items_found:items.length,
      items_inserted:inserted,
      details:`updated=${updated}`
    });

    return NextResponse.json({
      ok:true,
      source:DELTA_URL,
      found:items.length,
      inserted,
      updated,
      synced_at:new Date().toISOString()
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
  // Useful for admin diagnostics in a browser; performs the same sync.
  return POST(req);
}
