"use client";

import { useState } from "react";
import { CalendarDays, Check, ChevronRight, Crown, Flame, Goal, Medal, Shield, Star, Trophy, UserCheck, Users, Zap } from "lucide-react";
import PlayerPhoto from "./PlayerPhoto";

type Player={id:string;display_name:string;shirt_number:string|null;position:string|null;photo_path:string|null;active:boolean};
type Match={id:string;round_no:number|null;match_date:string;match_time:string|null;venue:string|null;home_team:string;away_team:string;home_score:number|null;away_score:number|null;status:string};
type Attendance={match_id:string;player_id:string;status:string};
type Lineup={match_id:string;player_id:string;is_starter:boolean;is_captain:boolean};
type Event={id:string;match_id:string;event_type:string;player_id:string|null;assist_player_id:string|null;minute:number|null;created_at:string};
type TrainingSession={id:string;training_date:string;start_time:string|null;end_time:string|null;location:string|null;title:string;notes:string|null;created_at:string};
type TrainingAttendance={training_id:string;player_id:string;status:string};
type TrainingStat={sessions:number;goals:number;assists:number;ga:number;attendanceStreak:number;games:number;wins:number};
type Stat={m:number;starts:number;captain:number;g:number;a:number;mvp:number};
type Pair={a:Player;b:Player;games:number;wins:number;combinedGA:number;score:number};

const CLUB="K.S. Delta Warszawa GM";
const ryszard=(p:Player)=>p.display_name.toLocaleLowerCase("pl-PL").includes("ryszard")&&p.display_name.toLocaleLowerCase("pl-PL").includes("rybacki");
const fmt=(d:string)=>new Date(`${d}T12:00:00`).toLocaleDateString("pl-PL",{day:"2-digit",month:"2-digit",year:"numeric"});
const ours=(m:Match)=>m.home_team===CLUB?(m.home_score??0):(m.away_score??0);
const opp=(m:Match)=>m.home_team===CLUB?(m.away_score??0):(m.home_score??0);
const opponent=(m:Match)=>m.home_team===CLUB?m.away_team:m.home_team;
const seasonLabel=(date:string)=>{const [y,m]=date.split("-").map(Number);const start=m>=7?y:y-1;return `${start}/${String(start+1).slice(-2)}`;};

function Avatar({p}:{p:Player}){
  return <span className="v10-avatar">{ryszard(p)?<img src="/assets/ryszard-player-card.png" alt={p.display_name}/>:<PlayerPhoto playerId={p.id}/>}</span>;
}

function TeamBadge({team}:{team:string}){
  const key=team.toLocaleLowerCase("pl-PL");
  const src=team===CLUB?"/teamlogos/gm.png":key.includes("alfa")?"/teamlogos/alfa.png":key.includes("vizja")?"/teamlogos/vizja.png":key.includes("ursus")?"/teamlogos/ursus.png":key.includes("julian")?"/teamlogos/julianow.png":"";
  if(src)return <span className="v108-team-badge"><img src={src} alt={team}/></span>;
  return <span className="v108-team-badge v108-team-fallback">{team.split(/\s+/).map(part=>part[0]).join("").slice(0,3)}</span>;
}

export { MyChildCenter } from "./MyChildCenter";

export function MatchDayMode(props:{match:Match|null;players:Player[];attendance:Attendance[];lineup:Lineup[];events:Event[];canManage:boolean;canEvents:boolean;onOpen:(m:Match,tab:"summary"|"attendance"|"lineup"|"events"|"mvp")=>void}){
  if(!props.match)return <section className="section v10-matchday"><div className="v10-empty devil-card"><CalendarDays size={32}/><h2>Match Day</h2><p>Brak zaplanowanego meczu.</p></div></section>;
  const match:Match=props.match;
  const att=props.attendance.filter(a=>a.match_id===match.id&&(a.status==="present"||a.status==="yes")).length;
  const starters=props.lineup.filter(x=>x.match_id===match.id&&x.is_starter).length;
  const goals=props.events.filter(e=>e.match_id===match.id&&e.event_type==="goal");
  const captain=props.players.find(p=>p.id===props.lineup.find(x=>x.match_id===match.id&&x.is_captain)?.player_id);
  const mvp=props.players.find(p=>p.id===props.events.find(e=>e.match_id===match.id&&e.event_type==="mvp")?.player_id);
  const confirmed=props.players.filter(p=>props.attendance.some(a=>a.match_id===match.id&&a.player_id===p.id&&(a.status==="yes"||a.status==="present")));
  const startersList=props.players.filter(p=>props.lineup.some(x=>x.match_id===match.id&&x.player_id===p.id&&x.is_starter)).sort((a,b)=>Number(/bram/i.test(b.position||""))-Number(/bram/i.test(a.position||"")));
  const phase=match.status==="played"?"PO MECZU":goals.length?"NA ŻYWO":"PRZED MECZEM";
  async function copySummary(){
    const goalLines=goals.map(e=>{const g=props.players.find(p=>p.id===e.player_id)?.display_name||"?";const a=props.players.find(p=>p.id===e.assist_player_id)?.display_name;return `⚽ ${g}${a?` (asysta: ${a})`:""}`;}).join("\n");
    const score=match.status==="played"?`${match.home_team} ${match.home_score??0}:${match.away_score??0} ${match.away_team}`:`${match.home_team} vs ${match.away_team}`;
    const text=`DELTA 2018 GM — PODSUMOWANIE MECZU\n${score}\n${fmt(match.match_date)} ${match.match_time||""}\n${goalLines||"Bramki: —"}\n⭐ MVP: ${mvp?.display_name||"—"}`;
    await navigator.clipboard.writeText(text);alert("Podsumowanie meczu skopiowane.");
  }

  function downloadCanvas(canvas:HTMLCanvasElement,name:string){
    const a=document.createElement("a");a.href=canvas.toDataURL("image/png");a.download=name;a.click();
  }
  function baseCanvas(title:string){
    const c=document.createElement("canvas");c.width=1080;c.height=1080;const x=c.getContext("2d")!;
    const grad=x.createLinearGradient(0,0,1080,1080);grad.addColorStop(0,"#05070a");grad.addColorStop(.62,"#17070a");grad.addColorStop(1,"#7b101d");x.fillStyle=grad;x.fillRect(0,0,1080,1080);
    x.strokeStyle="#e2b94f";x.lineWidth=4;x.strokeRect(38,38,1004,1004);x.fillStyle="#e2b94f";x.font="700 28px Arial";x.fillText("DELTA 2018 GM • GÓRNY MOKOTÓW",70,100);x.fillStyle="#ffffff";x.font="900 58px Arial";x.fillText(title,70,185);return {c,x};
  }
  function generateMatchGraphic(){
    const {c,x}=baseCanvas("MATCH RESULT");x.fillStyle="#fff";x.font="800 38px Arial";x.fillText(match.home_team,70,315);x.fillText(match.away_team,70,380);x.fillStyle="#e2b94f";x.font="900 120px Arial";x.fillText(match.status==="played"?`${match.home_score??0}:${match.away_score??0}`:"VS",70,540);x.fillStyle="#aeb7c0";x.font="600 26px Arial";x.fillText(`${fmt(match.match_date)} • ${match.match_time||""} • ${match.venue||""}`,70,610);x.fillStyle="#fff";x.font="700 26px Arial";let y=700;goals.slice(0,8).forEach(e=>{const g=props.players.find(p=>p.id===e.player_id)?.display_name||"?";const a=props.players.find(p=>p.id===e.assist_player_id)?.display_name;x.fillText(`⚽ ${g}${a?`  •  A: ${a}`:""}`,70,y);y+=42;});downloadCanvas(c,`delta-${match.match_date}-wynik.png`);
  }
  function generateCallupGraphic(){
    const {c,x}=baseCanvas("POWOŁANI / POTWIERDZENI");const confirmed=props.players.filter(p=>props.attendance.some(a=>a.match_id===match.id&&a.player_id===p.id&&(a.status==="yes"||a.status==="present")));x.fillStyle="#aeb7c0";x.font="600 27px Arial";x.fillText(`${fmt(match.match_date)} • ${opponent(match)}`,70,260);x.fillStyle="#fff";x.font="700 28px Arial";let y=340;confirmed.forEach((p,i)=>{x.fillText(`${String(i+1).padStart(2,"0")}. ${p.display_name}`,80,y);y+=45;});x.fillStyle="#e2b94f";x.font="800 25px Arial";x.fillText(`Razem: ${confirmed.length} zawodników`,70,990);downloadCanvas(c,`delta-${match.match_date}-powolani.png`);
  }
  return <section className="section v10-matchday v108-matchday">
    <div className="v108-matchday-hero devil-card">
      <div className="v108-broadcast-top"><span><Flame size={14}/>{phase}</span><b>KOLEJKA {match.round_no||"—"}</b><small>DELTA 2018 GM • MATCH CENTER</small></div>
      <div className="v108-score-stage">
        <div className="v108-side-team"><TeamBadge team={match.home_team}/><span>GOSPODARZ</span><h2>{match.home_team}</h2></div>
        <div className="v108-score-core"><small>{fmt(match.match_date)} • {match.match_time||"—"}</small><strong>{match.status==="played"?`${match.home_score??0}:${match.away_score??0}`:"VS"}</strong><p>{match.venue||"Miejsce do ustalenia"}</p></div>
        <div className="v108-side-team"><TeamBadge team={match.away_team}/><span>GOŚĆ</span><h2>{match.away_team}</h2></div>
      </div>
      <div className="v108-matchday-status"><div><UserCheck size={17}/><span>POTWIERDZENI</span><b>{att}/{props.players.length}</b></div><div><Users size={17}/><span>WYJŚCIOWA 6</span><b>{starters}/6</b></div><div><Crown size={17}/><span>KAPITAN</span><b>{captain?.display_name||"Do wyboru"}</b></div><div><Star size={17}/><span>MVP</span><b>{mvp?.display_name||"Po meczu"}</b></div></div>
    </div>

    <div className="v108-matchday-command">
      <article className="v108-matchday-primary devil-card">
        <div className="v8-panel-title"><Users size={18}/> KADRA MECZOWA <button onClick={()=>props.onOpen(match,"lineup")}>ZARZĄDZAJ</button></div>
        <div className="v108-squad-pitch">
          <div className="v108-pitch-lines"/><span className="v124-pitch-end v124-pitch-end-top" aria-hidden="true"/><span className="v124-pitch-end v124-pitch-end-bottom" aria-hidden="true"/>
          {startersList.map((p,index)=><button key={p.id} className={`v108-pitch-player p${index+1}`} onClick={()=>props.onOpen(match,"lineup")}><Avatar p={p}/><span>{p.shirt_number||index+1}</span><b>{p.display_name.split(" ")[0]}</b></button>)}
          {!startersList.length&&<div className="v108-pitch-empty"><Users size={34}/><b>Ustaw wyjściową szóstkę</b><span>Skład pojawi się bezpośrednio na boisku.</span></div>}
        </div>
      </article>
      <div className="v108-matchday-side">
        <article className="v108-live-timeline devil-card"><div className="v8-panel-title"><Goal size={18}/> WYDARZENIA MECZU</div>{goals.length?goals.map((event,index)=>{const scorer=props.players.find(p=>p.id===event.player_id);const assist=props.players.find(p=>p.id===event.assist_player_id);return <div className="v108-event-row" key={event.id}><span>{event.minute?`${event.minute}'`:String(index+1).padStart(2,"0")}</span><Goal size={17}/><div><b>{scorer?.display_name||"Gol drużyny"}</b><small>{assist?`Asysta: ${assist.display_name}`:"DELTA 2018 GM"}</small></div></div>}):<div className="v108-timeline-empty"><Goal size={30}/><b>Pierwszy gwizdek przed nami</b><span>Zdarzenia pojawią się tutaj w trakcie meczu.</span></div>}</article>
        <article className="v108-match-actions devil-card"><div className="v8-panel-title"><Zap size={18}/> SZYBKIE AKCJE</div><button onClick={()=>props.onOpen(match,"attendance")}><UserCheck/><span>OBECNOŚĆ</span><ChevronRight/></button>{props.canEvents&&<button onClick={()=>props.onOpen(match,"events")}><Goal/><span>DODAJ ZDARZENIE</span><ChevronRight/></button>}{props.canEvents&&<button onClick={()=>props.onOpen(match,"mvp")}><Star/><span>WYBIERZ MVP</span><ChevronRight/></button>}{props.canManage&&<button onClick={()=>props.onOpen(match,"summary")}><Trophy/><span>WYNIK I DANE</span><ChevronRight/></button>}</article>
      </div>
    </div>

    <div className="v108-matchday-tools"><button onClick={copySummary}><ChevronRight/><div><b>KOPIUJ PODSUMOWANIE</b><span>Gotowa wiadomość tekstowa</span></div></button><button onClick={generateMatchGraphic}><Trophy/><div><b>GRAFIKA WYNIKU</b><span>Kwadratowa karta PNG</span></div></button><button onClick={generateCallupGraphic}><Users/><div><b>GRAFIKA POWOŁAŃ</b><span>Lista potwierdzonych zawodników</span></div></button></div>
  </section>;
}

export function HallOfFame(props:{players:Player[];stats:Record<string,Stat>;trainingStats:Record<string,TrainingStat>;chemistry:Pair[];matches:Match[];trainingSessions?:TrainingSession[];onOpenPlayer:(p:Player)=>void}){
  const leader=(fn:(p:Player)=>number)=>props.players.slice().sort((a,b)=>fn(b)-fn(a))[0]||null;
  const records=[
    ["KRÓL STRZELCÓW",leader((p:Player)=>props.stats[p.id]?.g||0),(p:Player)=>props.stats[p.id]?.g||0,"goli",Goal],
    ["KRÓL ASYST",leader((p:Player)=>props.stats[p.id]?.a||0),(p:Player)=>props.stats[p.id]?.a||0,"asyst",Star],
    ["MVP",leader((p:Player)=>props.stats[p.id]?.mvp||0),(p:Player)=>props.stats[p.id]?.mvp||0,"MVP",Medal],
    ["KAPITAN",leader((p:Player)=>props.stats[p.id]?.captain||0),(p:Player)=>props.stats[p.id]?.captain||0,"meczów",Crown],
    ["TRENINGI",leader((p:Player)=>props.trainingStats[p.id]?.sessions||0),(p:Player)=>props.trainingStats[p.id]?.sessions||0,"treningów",Flame],
    ["G+A TRENING",leader((p:Player)=>props.trainingStats[p.id]?.ga||0),(p:Player)=>props.trainingStats[p.id]?.ga||0,"G+A",Zap],
  ] as const;
  const played=props.matches.filter(m=>m.status==="played");
  const wins=played.filter(m=>ours(m)>opp(m)).length;
  const goals=played.reduce((n,m)=>n+ours(m),0);
  const latestMonth=played.slice().sort((a,b)=>b.match_date.localeCompare(a.match_date))[0]?.match_date.slice(0,7)||new Date().toISOString().slice(0,7);
  const monthMatches=played.filter(m=>m.match_date.startsWith(latestMonth));
  const monthWins=monthMatches.filter(m=>ours(m)>opp(m)).length;
  const monthGoals=monthMatches.reduce((n,m)=>n+ours(m),0);
  const monthTrainings=(props.trainingSessions||[]).filter(t=>t.training_date.startsWith(latestMonth)).length;
  const seasonLabels=Array.from(new Set(played.map(m=>seasonLabel(m.match_date)))).sort().reverse();
  const seasonSummaries=seasonLabels.map(label=>{const ms=played.filter(m=>seasonLabel(m.match_date)===label);return {label,matches:ms.length,wins:ms.filter(m=>ours(m)>opp(m)).length,goals:ms.reduce((n,m)=>n+ours(m),0)};});
  async function copyMonth(){const text=`DELTA 2018 GM — PODSUMOWANIE ${latestMonth}\nMecze: ${monthMatches.length} • Wygrane: ${monthWins} • Gole: ${monthGoals} • Treningi: ${monthTrainings}`;await navigator.clipboard.writeText(text);alert("Podsumowanie miesiąca skopiowane.");}

  const [hofMetric,setHofMetric]=useState<"g"|"a"|"mvp"|"captain"|"m">("g");
  const value=(p:Player)=>props.stats[p.id]?.[hofMetric]||0;
  const hallLeaders=props.players.filter(p=>value(p)>0).slice().sort((a,b)=>value(b)-value(a)||a.display_name.localeCompare(b.display_name,"pl")).slice(0,3);
  const hallLabel=hofMetric==="g"?"GOLE":hofMetric==="a"?"ASYSTY":hofMetric==="mvp"?"MVP":hofMetric==="captain"?"KAPITAN":"MECZE";

  return <section className="section v10-hof v108-hof">
    <div className="v108-hof-hero v110-hof-hero devil-card"><img className="v110-hof-bg" src="/assets/hall-of-fame-premium-v109.png" alt="Galeria legend DELTA 2018 GM"/><span className="v110-hof-light"/><div className="v108-hof-copy"><span className="eyebrow gold">GALERIA LEGEND • DELTA 2018 GM</span><h2>HALL OF <em>FAME</em></h2><p>Najlepsi z najlepszych. Tu zapisujemy rekordy, charakter i chwile, które budują legendę drużyny.</p><div><span>{played.length} MECZÓW</span><span>{goals} GOLI</span><span>{wins} ZWYCIĘSTW</span></div></div></div>

    <article className="v141-hof-podium v142-hof-gala devil-card">
      <div className="v8-panel-title"><Crown size={18}/> PODIUM HALL OF FAME <span>SEZON {seasonLabels[0]||"2026/27"}</span></div>
      <p className="v141-hof-intro">Wybierz kategorię. Podium pokazuje wyłącznie osiągnięcia zapisane w meczach drużyny.</p>
      <div className="v142-gala-tabs" role="group" aria-label="Kategoria Hall of Fame">
        {([['g','Gole',Goal],['a','Asysty',Star],['mvp','MVP',Medal],['captain','Kapitan',Crown],['m','Występy',Users]] as const).map(([metric,label,Icon])=><button key={metric} type="button" className={hofMetric===metric?'active':''} aria-pressed={hofMetric===metric} onClick={()=>setHofMetric(metric)}><Icon size={17}/>{label}</button>)}
      </div>
      <div className="v113-podium-stage v141-hof-stage v142-gala-stage" aria-label={`Podium Hall of Fame – ${hallLabel}`}>
        <div className="v113-podium-atmosphere" aria-hidden="true"/>
        {[1,2,3].map(place=>{
          const p=hallLeaders[place-1];
          return <div key={place} className={`v113-podium-position v113-place-${place} ${p?"has-player":"is-empty"}`}>
            {p?<button type="button" className="v113-podium-player v141-hof-player" onClick={()=>props.onOpenPlayer(p)} aria-label={`Profil ${p.display_name}, miejsce ${place}, ${value(p)} ${hallLabel}`}>
              <span className="v142-card-crown" aria-hidden="true">{place===1?"👑":"✦"}</span>
              <span className="v113-podium-photo" style={{ border: place===1 ? "2px solid #f59e0b" : place===2 ? "2px solid #94a3b8" : "2px solid #b45309", boxShadow: place===1 ? "0 0 20px rgba(245,158,11,0.4)" : "none" }}>
                {ryszard(p)?<img src="/assets/ryszard-player-card.png" alt=""/>:<PlayerPhoto playerId={p.id}/>}
              </span>
              <span className="v113-podium-name font-bold">{p.display_name}</span>
              <span className="v113-podium-score"><strong>{value(p)}</strong><small>{hallLabel}</small></span>
              <span className="v113-podium-open">PROFIL <ChevronRight size={12}/></span>
            </button>:<div className="v113-podium-empty"><Shield size={24}/><span>Miejsce do zdobycia</span></div>}
            <div className="v113-podium-step" aria-hidden="true"><b>{place}</b></div>
          </div>;
        })}
      </div>
      <div className="v141-hof-strip">
        <div><small>KRÓL STRZELCÓW</small><b>{records[0][1]&&records[0][2](records[0][1])>0?records[0][1].display_name:"Jeszcze przed nami"}</b><span>{records[0][1]?records[0][2](records[0][1]):0} goli</span></div>
        <div><small>KRÓL ASYST</small><b>{records[1][1]&&records[1][2](records[1][1])>0?records[1][1].display_name:"Jeszcze przed nami"}</b><span>{records[1][1]?records[1][2](records[1][1]):0} asyst</span></div>
        <div><small>DRUŻYNA</small><b>DELTA 2018 GM</b><span>{played.length} rozegranych meczów</span></div>
      </div>
    </article>

    <div className="v10-hof-team"><article><b>{played.length}</b><span>MECZE</span></article><article><b>{wins}</b><span>WYGRANE</span></article><article><b>{goals}</b><span>GOLE</span></article><article><b>{props.chemistry[0]?.score||0}%</b><span>TOP CHEMIA</span></article></div>
    <div className="v10-hof-grid">
      {records.map(([title,p,value,unit,Icon])=>(
        <button key={title} onClick={()=>p&&props.onOpenPlayer(p)} className="devil-card relative overflow-hidden group hover:border-amber-400/50 transition">
          <div className="absolute top-2 right-2 text-amber-500/20 group-hover:text-amber-500/40 transition">
            <Icon size={36}/>
          </div>
          <small className="text-amber-400 font-black tracking-wider uppercase text-[10px]">{title}</small>
          {p ? (
            <div className="mt-2 flex flex-col items-center gap-1.5">
              <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-amber-400/40 shadow-lg bg-black/40">
                <PlayerPhoto playerId={p.id} className="w-full h-full object-cover" />
              </div>
              <h3 className="font-black text-xs text-white text-center mt-1">{p.display_name}</h3>
              <div className="flex items-baseline gap-1 text-amber-300">
                <b className="text-lg font-black">{value(p)}</b>
                <span className="text-[10px] uppercase font-bold text-slate-400">{unit}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 mt-3">Brak danych</p>
          )}
        </button>
      ))}
    </div>
    <article className="v10-seasons devil-card"><div className="v8-panel-title"><CalendarDays size={18}/> PORÓWNANIE SEZONÓW</div><div>{seasonSummaries.length?seasonSummaries.map(x=><div key={x.label}><b>{x.label}</b><span>{x.matches} meczów</span><span>{x.wins} wygranych</span><strong>{x.goals} goli</strong></div>):<p className="muted">Dane pojawią się po rozegranych meczach.</p>}</div></article>
    <article className="v10-month devil-card"><div><small>AUTOMATYCZNE PODSUMOWANIE MIESIĄCA</small><h3>{latestMonth}</h3><p>{monthMatches.length} meczów • {monthWins} wygranych • {monthGoals} goli • {monthTrainings} treningów</p></div><button onClick={copyMonth}>KOPIUJ PODSUMOWANIE</button></article>
    <article className="v10-duos devil-card"><div className="v8-panel-title"><Zap size={18}/> NAJLEPSZE DUETY — CHEMIA</div><div>{props.chemistry.slice(0,5).map((x,i)=><div key={`${x.a.id}-${x.b.id}`}><strong>#{i+1}</strong><span>{x.a.display_name} + {x.b.display_name}</span><b>{x.score}%</b><small>{x.games} gier • {x.wins} wygranych • {x.combinedGA} akcji G/A</small></div>)}</div></article>
  </section>;
}
