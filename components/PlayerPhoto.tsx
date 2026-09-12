"use client";
import { useEffect, useState } from "react";

export default function PlayerPhoto({playerId,className}:{playerId:string,className?:string}) {
  const [url,setUrl]=useState<string|null>(null);
  const [loaded,setLoaded]=useState(false);

  useEffect(()=>{
    fetch(`/api/player-photo/${playerId}`)
      .then(r=>r.json())
      .then(d=>{ setUrl(d.url||null); setLoaded(true); })
      .catch(()=>setLoaded(true));
  },[playerId]);

  if(url) return <img src={url} alt="" className={className || "player-photo"} />;

  return (
    <div
      className={(className || "player-photo") + " player-photo-fallback"}
      style={{backgroundImage:"linear-gradient(180deg,rgba(5,7,10,.03),rgba(5,7,10,.22)),url('/assets/player-card.png')"}}
    >
      {!loaded && <span className="photo-loading">…</span>}
    </div>
  );
}
