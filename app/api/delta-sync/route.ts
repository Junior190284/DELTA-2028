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

function htmlToTokens(html:string){
  // The DELTA page uses many nested inline elements. Treat every tag as a
  // separator so titles and publication dates do not collapse into one line.
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi," ")
    .replace(/<style[\s\S]*?<\/style>/gi," ")
    .replace(/<[^>]+>/g,"\n");
  return decodeEntities(cleaned)
    .replace(/\r/g,"")
    .split(/\n+/)
    .map(x=>x.replace(/\s+/g," ").trim())
    .filter(Boolean);
}

function stableId(title:string,date:string,body:string){
  // body is deliberately not part of the key: when DELTA corrects a notice,
  // we update the existing record instead of duplicating it.
  return crypto.createHash("sha256").update(`${title}|${date}`).digest("hex");
}

function relevance(title:string, body:string){
  const s=(title+" "+body).toLocaleLowerCase("pl-PL");
  if(s.includes("2018 górny mokotów")) return 100;
  if(s.includes("powołania 2018")) return 98;
  if(s.includes("górny mokotów")) return 95;
  if(s.includes("drużyna: 2018") || s.includes("drużyny: 2018") || s.includes("roczniki): 2017, 2018")) return 92;
  if(s.includes("2018") && (s.includes("trening") || s.includes("mecz") || s.includes("turniej") || s.includes("grafik") || s.includes("obóz") || s.includes("zgrupowanie"))) return 90;
  if(s.includes("grafik") || s.includes("trening") || s.includes("dni wolne") || s.includes("aktualizacja") || s.includes("zajęcia")) return 70;
  // General club messages visible on this team page are useful to parents too.
  return 50;
}

function badHeadline(x:string){
  const s=x.toLocaleLowerCase("pl-PL");
  return !x || x.length<3 || x.length>180 ||
    /^kolejka\b/i.test(x) || /^sezon \d{4}/i.test(x) ||
    / - .*_\s*:_/.test(x) ||
    ["seniorzy","trener","asystent","praktykant","trener bramkarzy"].includes(s) ||
    /^\d{1,2}:\d{2}$/.test(x);
}

function parseDeltaUpdates(html:string){
  const tokens=htmlToTokens(html);
  const candidates:{source_key:string;title:string;body:string;published_at:string;priority:number;source_url:string}[]=[];
  const dateRx=/\b(\d{2}-\d{2}-\d{4})\b/;

  for(let i=0;i<tokens.length;i++){
    const dm=tokens[i].match(dateRx);
    if(!dm) continue;
    const date=dm[1];

    // Publication dates are standalone (or directly appended to a headline).
    // Dates occurring inside article bodies, match times and ranges must not
    // create extra fake news cards.
    const before=tokens[i].slice(0,dm.index||0).trim();
    const after=tokens[i].slice((dm.index||0)+date.length).trim();
    if(after) continue;

    let title=before.replace(/[-–—|]+$/g,"").trim();
    if(!title){
      const candidate=(tokens[i-1]||"").trim();
      if(!badHeadline(candidate) && !dateRx.test(candidate)) title=candidate;
    }
    if(badHeadline(title)) continue;

    // Skip fixture rows and date-only schedule fragments. News headlines on
    // DELTA are short phrases such as “Powołania…”, “Grafik…”, etc.
    if(/K\.S\. Delta Warszawa .* - |FC Vizja|MUKS Julianów|RKS Ursus|Alfa Przymierze Rodzin/.test(title)) continue;

    const bodyParts:string[]=[];
    for(let j=i+1;j<Math.min(tokens.length,i+70);j++){
      // Next headline/date begins a new news item.
      if(dateRx.test(tokens[j]) && bodyParts.length>0) break;
      if(bodyParts.join(" ").length>4200) break;
      bodyParts.push(tokens[j]);
    }
    const body=bodyParts.join(" ").replace(/\s+/g," ").trim();
    const priority=relevance(title,body);
    const [dd,mm,yyyy]=date.split("-");
    const published_at=`${yyyy}-${mm}-${dd}T12:00:00+02:00`;

    candidates.push({
      source_key:stableId(title,date,body),
      title,body,published_at,priority,source_url:DELTA_URL
    });
  }

  const unique=new Map<string,(typeof candidates)[number]>();
  for(const item of candidates){
    const prev=unique.get(item.source_key);
    if(!prev || item.priority>prev.priority) unique.set(item.source_key,item);
  }

  return [...unique.values()]
    .filter(x=>x.priority>=50)
    .sort((a,b)=>b.published_at.localeCompare(a.published_at))
    .slice(0,60);
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
