"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Media={id:string;match_id:string;storage_path:string;caption:string|null;created_at:string};

export default function MatchGallery({matchId,media}:{matchId:string;media:Media[]}){
  const supabase=createClient();
  const rows=media.filter(x=>x.match_id===matchId);
  const [urls,setUrls]=useState<Record<string,string>>({});
  useEffect(()=>{
    let alive=true;
    async function run(){
      const next:Record<string,string>={};
      for(const row of rows){
        const {data}=await supabase.storage.from("match-media").createSignedUrl(row.storage_path,60*30);
        if(data?.signedUrl)next[row.id]=data.signedUrl;
      }
      if(alive)setUrls(next);
    }
    if(rows.length)run(); else setUrls({});
    return ()=>{alive=false};
  },[matchId,rows.map(x=>x.id).join("|")]);
  if(!rows.length)return null;
  return <div className="v10-match-gallery">{rows.map(row=><figure key={row.id}>{urls[row.id]?<img src={urls[row.id]} alt={row.caption||"Zdjęcie z meczu"}/>:<div className="v10-photo-loading">Ładowanie…</div>}{row.caption&&<figcaption>{row.caption}</figcaption>}</figure>)}</div>;
}
