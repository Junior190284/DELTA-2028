"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import StadiumFX from "./StadiumFX";
import {
  Activity, ArrowUpRight, CalendarDays, ChevronRight, Clock3, Flame, Goal,
  LockKeyhole, MapPin, Newspaper, Radio, Shield, Sparkles, Star, Target,
  Trophy, Users, Zap
} from "lucide-react";

type Match={
  id:string;round_no:number|null;match_date:string;match_time:string|null;venue:string|null;
  home_team:string;away_team:string;home_score:number|null;away_score:number|null;status:string
};
type News={id:string;type:string;title:string;body:string|null;published_at:string};
type ClubUpdate={id:string;source_key:string;source_name:string;source_url:string;title:string;body:string|null;priority:number;published_at:string};
type TeamEvent={id:string;title:string;event_type:string;event_date:string;start_time:string|null;end_time:string|null;location:string|null;details:string|null;important:boolean};
type AttendanceSummary={match_id:string;responses:number;present:number};

const CLUB="K.S. Delta Warszawa GM";
const GOAL_TARGET=50;
const teamLogos:Record<string,string>={
  "K.S. Delta Warszawa GM":"/teamlogos/gm.png",
  "Alfa Przymierze Rodzin":"/teamlogos/alfa.png",
  "FC Vizja Warszawa":"/teamlogos/vizja.png",
  "RKS Ursus Warszawa":"/teamlogos/ursus.png",
  "MUKS Julianów":"/teamlogos/julianow.png",
};

function datePL(v:string){
  try{return new Date(`${v}T12:00:00`).toLocaleDateString("pl-PL",{day:"2-digit",month:"2-digit",year:"numeric"});}catch{return v}
}
function opponent(m:Match){return m.home_team===CLUB?m.away_team:m.home_team}
function ours(m:Match){return m.home_team===CLUB?(m.home_score??0):(m.away_score??0)}
function theirs(m:Match){return m.home_team===CLUB?(m.away_score??0):(m.home_score??0)}
function result(m:Match){return ours(m)>theirs(m)?"W":ours(m)===theirs(m)?"R":"P"}
function localDate(date:string,time?:string|null){return new Date(`${date}T${time?.slice(0,5)||"12:00"}:00`)}
function countdown(target:Date,now:number){
  const ms=target.getTime()-now;
  if(ms<=0)return "TERAZ";
  const mins=Math.floor(ms/60000),days=Math.floor(mins/1440),hours=Math.floor((mins%1440)/60),m=mins%60;
  if(days>0)return `${days}D ${hours}H`;
  if(hours>0)return `${hours}H ${m}M`;
  return `${Math.max(1,m)} MIN`;
}
function Logo({team,size=72}:{team:string,size?:number}){
  const src=teamLogos[team];
  if(src)return <img src={src} alt={team} style={{width:size,height:size,objectFit:"contain"}}/>;
  return <span className="v101-public-fallback-logo" style={{width:size,height:size}}>{team.split(" ").filter(Boolean)[0]?.slice(0,2).toUpperCase()}</span>;
}

export default function PublicTeamSite(props:{
  matches:Match[];
  news:News[];
  clubUpdates:ClubUpdate[];
  teamEvents:TeamEvent[];
  attendanceSummary:AttendanceSummary[];
  rosterCount:number;
}){
  const [now,setNow]=useState(()=>Date.now());
  useEffect(()=>{const t=window.setInterval(()=>setNow(Date.now()),30000);return()=>window.clearInterval(t)},[]);

  const scheduled=useMemo(()=>props.matches.filter(m=>m.status==="scheduled").slice().sort((a,b)=>localDate(a.match_date,a.match_time).getTime()-localDate(b.match_date,b.match_time).getTime()),[props.matches]);
  const nextMatch=scheduled.find(m=>localDate(m.match_date,m.match_time).getTime()>=now-2*60*60*1000)||scheduled[0]||null;
  const recent=props.matches.filter(m=>m.status==="played").slice().sort((a,b)=>b.match_date.localeCompare(a.match_date)).slice(0,5);
  const recentThree=recent.slice(0,3);
  const played=props.matches.filter(m=>m.status==="played");
  const wins=played.filter(m=>ours(m)>theirs(m)).length;
  const draws=played.filter(m=>ours(m)===theirs(m)).length;
  const losses=played.filter(m=>ours(m)<theirs(m)).length;
  const goals=played.reduce((sum,m)=>sum+ours(m),0);
  const goalsPerMatch=played.length?goals/played.length:0;
  const winRate=played.length?Math.round(wins/played.length*100):0;
  const nextAttendance=nextMatch?props.attendanceSummary.find(x=>x.match_id===nextMatch.id):null;
  const lastMatch=recent[0]||null;

  const eventCandidates=useMemo(()=>{
    const events=props.teamEvents.map(e=>({
      id:`event-${e.id}`,title:e.title,subtitle:[e.start_time?.slice(0,5),e.location].filter(Boolean).join(" • "),date:localDate(e.event_date,e.start_time),kind:e.event_type
    }));
    const matches=scheduled.map(m=>({
      id:`match-${m.id}`,title:`Mecz: ${opponent(m)}`,subtitle:[m.match_time?.slice(0,5),m.venue].filter(Boolean).join(" • "),date:localDate(m.match_date,m.match_time),kind:"match"
    }));
    return [...events,...matches].filter(x=>x.date.getTime()>=now-90*60*1000).sort((a,b)=>a.date.getTime()-b.date.getTime());
  },[props.teamEvents,scheduled,now]);
  const nextEvent=eventCandidates[0]||null;

  const biggestWin=played.map(m=>({m,diff:ours(m)-theirs(m)})).filter(x=>x.diff>0).sort((a,b)=>b.diff-a.diff)[0]?.m||null;
  const highestGoals=played.slice().sort((a,b)=>ours(b)-ours(a))[0]||null;
  const currentWinStreak=(()=>{let n=0;for(const m of recent){if(result(m)!=="W")break;n++;}return n})();
  const goalProgress=Math.min(100,Math.round(goals/GOAL_TARGET*100));
  const latestClub=props.clubUpdates[0]||null;
  const isMatchDay=nextMatch?localDate(nextMatch.match_date,nextMatch.match_time).getTime()-now<=24*60*60*1000&&localDate(nextMatch.match_date,nextMatch.match_time).getTime()>now-3*60*60*1000:false;

  const publicCalendar=[
    ...scheduled.slice(0,4).map(m=>({id:`m-${m.id}`,date:m.match_date,time:m.match_time,title:`${m.home_team} — ${m.away_team}`,type:"MECZ",location:m.venue})),
    ...props.teamEvents.slice(0,8).map(e=>({id:`e-${e.id}`,date:e.event_date,time:e.start_time,title:e.title,type:e.event_type.toUpperCase(),location:e.location}))
  ].sort((a,b)=>`${a.date} ${a.time||""}`.localeCompare(`${b.date} ${b.time||""}`)).slice(0,6);

  return <main className="public-team-site v101-public-home">
    <StadiumFX intro/>

    <header className="public-topbar v101-public-topbar">
      <a href="/" className="public-brand" aria-label="Strona główna DELTA 2018 GM">
        <img src="/teamlogos/gm.png" alt="DELTA 2018 GM"/>
        <div><b>DELTA 2018 GM</b><span>Górny Mokotów • Team Hub</span></div>
      </a>
      <nav className="v101-public-nav">
        <a href="#mecz">MECZ</a><a href="#statystyki">STATYSTYKI</a><a href="#kalendarz">KALENDARZ</a><a href="#klub">Z KLUBU</a>
      </nav>
      <Link href="/login" className="public-login"><LockKeyhole size={15}/> STREFA RODZICA</Link>
    </header>

    <section id="top" className="public-hero v101-public-hero">
      <div className="public-hero-overlay"/>
      <div className="v101-hero-lights"/>
      <div className="v101-hero-flare"/>
      <div className="public-hero-copy">
        <span className="v101-live-eyebrow"><Radio size={13}/> K.S. DELTA WARSZAWA • GÓRNY MOKOTÓW</span>
        <h1>DELTA <em>2018</em> GM</h1>
        <p>Mecze, wyniki, wydarzenia i oficjalne informacje drużyny. Stadionowy Team Hub Diabełków.</p>
        <div className="public-hero-actions">
          <a href="#mecz">NAJBLIŻSZY MECZ <ChevronRight size={15}/></a>
          <a href="#kalendarz">KALENDARZ</a>
          <a href="#klub">Z KLUBU</a>
          <Link href="/login"><LockKeyhole size={14}/> STREFA RODZICA</Link>
        </div>
      </div>
      <div className="v101-hero-side-panel">
        <span>DZIEJE SIĘ TERAZ</span>
        <b>{nextEvent?.title||"Czekamy na kolejne wydarzenie"}</b>
        <small>{nextEvent?`${countdown(nextEvent.date,now)} • ${nextEvent.subtitle||datePL(nextEvent.date.toISOString().slice(0,10))}`:"Aktualności pojawią się tutaj automatycznie."}</small>
      </div>
    </section>

    <div className="v101-live-ticker" aria-label="Najważniejsze informacje">
      <span><Flame size={14}/> LIVE INFO</span>
      <div className="v101-ticker-track">
        <b>{nextMatch?`NAJBLIŻSZY MECZ: ${datePL(nextMatch.match_date)} • ${opponent(nextMatch)}`:"TERMINARZ: do synchronizacji"}</b>
        <i>•</i>
        <b>{lastMatch?`OSTATNI WYNIK: ${ours(lastMatch)}:${theirs(lastMatch)} z ${opponent(lastMatch)}`:"SEZON 2026/27"}</b>
        <i>•</i>
        <b>{latestClub?`Z KLUBU: ${latestClub.title}`:"DELTA 2018 GM"}</b>
      </div>
    </div>

    <section id="mecz" className={`v101-public-match-hub devil-card ${isMatchDay?"match-day":""}`}>
      <div className="v101-match-topline">
        <div><CalendarDays size={17}/><span>{isMatchDay?"MATCH DAY":"NAJBLIŻSZY MECZ"}</span></div>
        <b>{nextMatch?`KOLEJKA ${nextMatch.round_no||"—"}`:"TERMIN DO USTALENIA"}</b>
      </div>
      {nextMatch?<>
        <div className="v101-match-stage">
          <div className="v101-match-team"><Logo team={nextMatch.home_team}/><small>GOSPODARZ</small><b>{nextMatch.home_team}</b></div>
          <div className="v101-match-center">
            <span>DO MECZU</span><strong>{countdown(localDate(nextMatch.match_date,nextMatch.match_time),now)}</strong><em>VS</em>
            <small>{datePL(nextMatch.match_date)} • {nextMatch.match_time?.slice(0,5)||"—"}</small>
            <p><MapPin size={12}/>{nextMatch.venue||"Miejsce do ustalenia"}</p>
          </div>
          <div className="v101-match-team right"><Logo team={nextMatch.away_team}/><small>GOŚĆ</small><b>{nextMatch.away_team}</b></div>
        </div>
        <div className="v101-match-tools-public">
          <div className="v101-public-attendance">
            <span><Users size={15}/> POTWIERDZENIA</span>
            <strong>{nextAttendance?.responses||0}<em>/ {props.rosterCount||"—"}</em></strong>
            <div><i style={{width:`${props.rosterCount?Math.min(100,(nextAttendance?.responses||0)/props.rosterCount*100):0}%`}}/></div>
            <small>Po zalogowaniu rodzic może potwierdzić udział dziecka.</small>
          </div>
          <Link href="/login" className="v101-match-cta"><LockKeyhole size={14}/> POTWIERDŹ OBECNOŚĆ <ChevronRight size={14}/></Link>
        </div>
      </>:<div className="v101-empty-stage"><Trophy size={34}/><b>Najbliższy mecz pojawi się po synchronizacji terminarza.</b></div>}
    </section>

    <section className="v101-public-smart-row">
      <article className="v101-smart-clock devil-card">
        <div className="v101-smart-icon"><Clock3 size={24}/></div>
        <div><span>SMART TEAM CLOCK</span><h3>{nextEvent?.title||"Brak wydarzeń"}</h3><p>{nextEvent?.subtitle||"Kalendarz drużyny jest aktualizowany na bieżąco."}</p></div>
        <strong>{nextEvent?countdown(nextEvent.date,now):"—"}</strong>
      </article>
      <article className="v101-season-goal devil-card">
        <div><Target size={20}/><span>CEL SEZONU</span></div><b>{goals}<em>/ {GOAL_TARGET}</em></b>
        <div className="v101-goal-progress"><i style={{width:`${goalProgress}%`}}/></div><small>{goalProgress}% drogi do 50 bramek</small>
      </article>
    </section>

    <section id="statystyki" className="v101-public-stats-zone">
      <div className="v101-zone-head"><div><span className="v101-zone-eyebrow">SEASON DATA • 2026/27</span><h2>CENTRUM <em>STATYSTYK</em></h2></div><div className="v101-form-line"><span>FORMA</span>{recent.map(m=><i key={m.id} className={`r-${result(m).toLowerCase()}`}>{result(m)}</i>)}</div></div>
      <div className="v101-stat-tiles">
        <article><Trophy/><b>{played.length}</b><span>MECZE</span></article>
        <article><Zap/><b>{wins}</b><span>WYGRANE</span></article>
        <article><Goal/><b>{goals}</b><span>BRAMKI</span></article>
        <article><Activity/><b>{goalsPerMatch.toFixed(1)}</b><span>GOLI / MECZ</span></article>
        <article><Star/><b>{winRate}%</b><span>WIN RATE</span></article>
        <article><Shield/><b>{wins}-{draws}-{losses}</b><span>W-R-P</span></article>
      </div>
      <div className="v101-stat-lower">
        <article className="v101-recent-matches devil-card">
          <div className="v101-card-title"><Trophy size={17}/> OSTATNIE MECZE</div>
          {recentThree.length?recentThree.map(m=><div className="v101-result-row" key={m.id}>
            <span className={`badge r-${result(m).toLowerCase()}`}>{result(m)}</span><Logo team={opponent(m)} size={38}/>
            <div><b>{opponent(m)}</b><small>{datePL(m.match_date)}</small></div><strong>{ours(m)}:{theirs(m)}</strong>
          </div>):<p className="v101-public-muted">Pierwsze wyniki sezonu pojawią się tutaj.</p>}
        </article>
        <article className="v101-record-wall devil-card">
          <div className="v101-card-title"><Sparkles size={17}/> MINI HALL OF FAME</div>
          <div><span>NAJWIĘKSZA WYGRANA</span><b>{biggestWin?`${ours(biggestWin)}:${theirs(biggestWin)} • ${opponent(biggestWin)}`:"—"}</b></div>
          <div><span>NAJWIĘCEJ GOLI W MECZU</span><b>{highestGoals?`${ours(highestGoals)} • ${opponent(highestGoals)}`:"—"}</b></div>
          <div><span>AKTUALNA SERIA WYGRANYCH</span><b>{currentWinStreak}</b></div>
          <div><span>CEL BRAMKOWY</span><b>{goals}/{GOAL_TARGET}</b></div>
        </article>
      </div>
    </section>

    <section id="kalendarz" className="v101-public-content-grid">
      <article className="v101-calendar-card devil-card">
        <div className="v101-card-title"><CalendarDays size={17}/> KALENDARZ DRUŻYNY <span>NAJBLIŻSZE</span></div>
        <div className="v101-calendar-list">
          {publicCalendar.map(e=><div key={e.id}>
            <span className="date"><b>{new Date(`${e.date}T12:00:00`).getDate()}</b><small>{new Date(`${e.date}T12:00:00`).toLocaleDateString("pl-PL",{month:"short"}).toUpperCase()}</small></span>
            <div><span>{e.type}</span><b>{e.title}</b><small>{[e.time?.slice(0,5),e.location].filter(Boolean).join(" • ")}</small></div>
            <ChevronRight size={15}/>
          </div>)}
          {!publicCalendar.length&&<p className="v101-public-muted">Brak publicznych wydarzeń.</p>}
        </div>
      </article>
      <article className="v101-today-card devil-card">
        <div className="v101-card-title"><Radio size={17}/> DZIŚ W DRUŻYNIE</div>
        <div className="v101-today-visual"><span className="pulse"/><Flame size={34}/></div>
        <span>NAJBLIŻSZE WYDARZENIE</span><h3>{nextEvent?.title||"Spokojny dzień"}</h3>
        <p>{nextEvent?.subtitle||"Kolejne wydarzenia pojawią się automatycznie z kalendarza."}</p>
        {nextEvent&&<b>{countdown(nextEvent.date,now)}</b>}
      </article>
    </section>

    <section id="klub" className="v101-public-content-grid v101-news-grid">
      <article className="v101-club-feed devil-card">
        <div className="v101-card-title"><Shield size={17}/> Z KLUBU <span>OFICJALNE INFORMACJE</span></div>
        <div className="v101-news-list">
          {props.clubUpdates.slice(0,4).map((x,index)=><article key={x.id}>
            <div><span>{index===0?"NOWE":"DELTA"}</span><small>{new Date(x.published_at).toLocaleDateString("pl-PL")}</small></div>
            <h3>{x.title}</h3>{x.body&&<p>{x.body.slice(0,250)}{x.body.length>250?"…":""}</p>}
            {x.source_url&&<a href={x.source_url} target="_blank" rel="noreferrer">ŹRÓDŁO <ArrowUpRight size={12}/></a>}
          </article>)}
          {!props.clubUpdates.length&&<p className="v101-public-muted">Brak nowych informacji z klubu.</p>}
        </div>
      </article>
      <article className="v101-team-life devil-card">
        <div className="v101-card-title"><Sparkles size={17}/> ŻYCIE DRUŻYNY</div>
        <div className="v101-life-mosaic">
          <figure className="large"><img src="/assets/stadium3.png" alt="Stadion"/><figcaption>MATCH DAY</figcaption></figure>
          <figure><img src="/assets/stadium.png" alt="Trybuny"/><figcaption>DIABEŁKI</figcaption></figure>
          <figure><img src="/assets/stadium2.png" alt="Światła stadionu"/><figcaption>GÓRNY MOKOTÓW</figcaption></figure>
        </div>
        <small>Galeria meczowa i zdjęcia dzieci pozostają dostępne wyłącznie po zalogowaniu.</small>
      </article>
    </section>

    <section className="v101-featured-lock devil-card">
      <div className="v101-featured-art"><div className="v101-player-silhouette"><Users size={48}/></div><span>PREMIUM PLAYER CARD</span></div>
      <div><span className="v101-zone-eyebrow">WYRÓŻNIENIA ZAWODNIKÓW</span><h2>Profile, osiągnięcia i liderzy — po zalogowaniu</h2><p>Chronimy dane i zdjęcia młodych zawodników. W Strefie Rodzica dostępne są profile, statystyki, MVP, kapitan, osiągnięcia i pełne rankingi.</p></div>
      <Link href="/login"><LockKeyhole size={15}/> ZOBACZ STREFĘ DRUŻYNY <ChevronRight size={15}/></Link>
    </section>

    <section className="public-private-zone v101-parent-zone devil-card">
      <div><LockKeyhole size={28}/><span>STREFA RODZICA</span><h2>Pełna aplikacja po zalogowaniu</h2><p>Każdy zalogowany rodzic ma dostęp do całej części drużynowej. Uprawnienia dodatkowe dotyczą tylko edycji danych.</p></div>
      <div className="public-private-list">
        <span>✓ Mecze i pełny kalendarz</span><span>✓ Centrum Treningowe</span><span>✓ Profile i statystyki zawodników</span>
        <span>✓ Team Chemistry</span><span>✓ Osiągnięcia i Hall of Fame</span><span>✓ Potwierdzanie obecności dziecka</span>
      </div>
      <Link href="/login">WEJDŹ DO STREFY RODZICA <ChevronRight size={15}/></Link>
    </section>

    <footer className="public-footer v101-footer">
      <img src="/teamlogos/gm.png" alt=""/><div><b>DELTA 2018 GM</b><span>Górny Mokotów • Premium Stadium Team Hub</span></div><small>2026/27</small>
    </footer>
  </main>;
}
