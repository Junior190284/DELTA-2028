"use client";

import { useEffect, useState } from "react";

type Props={
  intro?:boolean;
  compact?:boolean;
};

export default function StadiumFX({intro=true,compact=false}:Props){
  const [showIntro,setShowIntro]=useState(false);

  useEffect(()=>{
    if(!intro)return;
    try{
      const key="delta-v101-fire-reveal";
      if(sessionStorage.getItem(key)!=="1"){
        setShowIntro(true);
        sessionStorage.setItem(key,"1");
        const timer=window.setTimeout(()=>setShowIntro(false),2400);
        return ()=>window.clearTimeout(timer);
      }
    }catch{
      setShowIntro(true);
      const timer=window.setTimeout(()=>setShowIntro(false),2400);
      return ()=>window.clearTimeout(timer);
    }
  },[intro]);

  return <>
    <div className={`v101-atmosphere ${compact?"compact":""}`} aria-hidden="true">
      <span className="v101-stadium-beam beam-a"/>
      <span className="v101-stadium-beam beam-b"/>
      <span className="v101-smoke smoke-a"/>
      <span className="v101-smoke smoke-b"/>
      <span className="v101-smoke smoke-c"/>
      <span className="v101-embers"/>
      <span className="v101-ultras-flare flare-left"/>
      <span className="v101-ultras-flare flare-right"/>
      <span className="v101-terrace-haze"/>
      <span className="v101-floodlight-glow glow-left"/>
      <span className="v101-floodlight-glow glow-right"/>
    </div>
    {showIntro&&<div className="v101-fire-reveal" aria-hidden="true">
      <div className="v101-fire-smoke"/>
      <div className="v101-fire-core fire-left"/>
      <div className="v101-fire-core fire-right"/>
      <div className="v101-fire-core fire-center"/>
      <div className="v101-fire-flare"/>
      <div className="v101-fire-title"><img src="/teamlogos/gm.png" alt=""/><span>DELTA 2018 GM</span><b>GÓRNY MOKOTÓW</b></div>
    </div>}
  </>;
}
