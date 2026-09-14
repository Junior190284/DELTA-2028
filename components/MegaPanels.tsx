"use client";

import { CalendarDays, Check, ChevronRight, Crown, Flame, Goal, Medal, Star, Trophy, UserCheck, Users, Zap } from "lucide-react";
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

export function MyChildCenter(props:{
  players:Player[];parentPlayerIds:string[];stats:Record<string,Stat>;trainingStats:Record<string,TrainingStat>;
  matches:Match[];attendance:Attendance[];events:Event[];trainingSessions:TrainingSession[];trainingAttendance:TrainingAttendance[];
  chemistry:Pair[];onOpenMatch:(m:Match,tab:"summary"|"attendance")=>void;onOpenPlayer:(p:Player)=>void;
}){
  const children=props.players.filter(p=>props.parentPlayerIds.includes(p.id));
  const next=props.matches.filter(m=>m.status==="scheduled").slice().sort((a,b)=>a.match_date.localeCompare(b.match_date))[0]||null;
  if(!children.length)return <section className="section v10-my-child"><div className="v10-empty devil-card"><UserCheck size={32}/><h2>Moje dziecko</h2><p>Administrator nie przypisał jeszcze zawodnika do tego konta.</p></div></section>;

  return <section className="section v10-my-child">
    <div className="v10-page-hero devil-card"><div><span className="eyebrow gold">STREFA RODZICA</span><h2>MOJE <em>DZIECKO</em></h2><p>Najważniejsze informacje, obecność, forma, treningi i osiągnięcia w jednym miejscu.</p></div><UserCheck size={54}/></div>
    {children.map(p=>{
      const s=props.stats[p.id]||{m:0,starts:0,captain:0,g:0,a:0,mvp:0};
      const t=props.trainingStats[p.id]||{sessions:0,goals:0,assists:0,ga:0,attendanceStreak:0,games:0,wins:0};
      const pair=props.chemistry.find(x=>x.a.id===p.id||x.b.id===p.id);
      const partner=pair?(pair.a.id===p.id?pair.b:pair.a):null;
      const rsvp=next?props.attendance.find(a=>a.match_id===next.id&&a.player_id===p.id)?.status||"":null;
      return <article className="v10-child-card devil-card" key={p.id}>
        <button className="v10-child-id" onClick={()=>props.onOpenPlayer(p)}><Avatar p={p}/><div><small>DELTA 2018 GM</small><h3>{p.display_name}</h3><span>{p.position||"Zawodnik"}</span></div><ChevronRight/></button>
        <div className="v10-child-kpis">
          <div><b>{s.m}</b><span>MECZE</span></div><div><b>{s.g+s.a}</b><span>G+A</span></div><div><b>{s.mvp}</b><span>MVP</span></div><div><b>{t.sessions}</b><span>TRENINGI</span></div><div><b>{t.ga}</b><span>G+A TRENING</span></div><div><b>{t.attendanceStreak}</b><span>SERIA OBECNOŚCI</span></div>
        </div>
        <div className="v10-player-form">
          <span>FORMA — OSTATNIE MECZE</span>
          <div>{props.matches.filter(m=>m.status==="played").slice().sort((a,b)=>b.match_date.localeCompare(a.match_date)).slice(0,5).map(m=>{
            const g=props.events.filter(e=>e.match_id===m.id&&e.event_type==="goal"&&e.player_id===p.id).length;
            const result=ours(m)>opp(m)?"W":ours(m)===opp(m)?"R":"P";
            return <i key={m.id} className={`form-${result.toLowerCase()}`}>{g?`⚽${g}`:result}</i>;
          })}</div>
          <div className="v10-training-challenges"><b>Wyzwania treningowe:</b><span className={t.sessions>=5?"done":""}>5 treningów</span><span className={t.sessions>=10?"done":""}>10 treningów</span><span className={t.ga>=5?"done":""}>5 G+A</span><span className={t.attendanceStreak>=3?"done":""}>3 z rzędu</span></div>
        </div>
        <div className="v10-child-bottom">
          <div className="v10-next-rsvp"><CalendarDays size={18}/><div><small>NAJBLIŻSZY MECZ</small><b>{next?`${fmt(next.match_date)} • ${opponent(next)}`:"Brak zaplanowanego meczu"}</b><span>{next?(rsvp==="yes"?"✓ Potwierdzono obecność":rsvp==="no"?"Nieobecny":rsvp==="maybe"?"Do potwierdzenia":"Brak odpowiedzi"):"—"}</span></div>{next&&<button onClick={()=>props.onOpenMatch(next,"attendance")}>POTWIERDŹ <ChevronRight size={12}/></button>}</div>
          <div className="v10-chem-mini"><Zap size={18}/><div><small>NAJLEPSZA CHEMIA TRENINGOWA</small><b>{partner?partner.display_name:"Jeszcze brak danych"}</b><span>{pair?`${pair.score}% • ${pair.games} wspólnych gier`:"Pojawi się po grach kontrolnych"}</span></div></div>
        </div>
      </article>;
    })}
  </section>;
}

export function MatchDayMode(props:{match:Match|null;players:Player[];attendance:Attendance[];lineup:Lineup[];events:Event[];canManage:boolean;canEvents:boolean;onOpen:(m:Match,tab:"summary"|"attendance"|"lineup"|"events"|"mvp")=>void}){
  if(!props.match)return <section className="section v10-matchday"><div className="v10-empty devil-card"><CalendarDays size={32}/><h2>Match Day</h2><p>Brak zaplanowanego meczu.</p></div></section>;
  const match:Match=props.match;
  const att=props.attendance.filter(a=>a.match_id===match.id&&(a.status==="present"||a.status==="yes")).length;
  const starters=props.lineup.filter(x=>x.match_id===match.id&&x.is_starter).length;
  const goals=props.events.filter(e=>e.match_id===match.id&&e.event_type==="goal");
  const captain=props.players.find(p=>p.id===props.lineup.find(x=>x.match_id===match.id&&x.is_captain)?.player_id);
  const mvp=props.players.find(p=>p.id===props.events.find(e=>e.match_id===match.id&&e.event_type==="mvp")?.player_id);
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
  return <section className="section v10-matchday">
    <div className="v10-matchday-hero devil-card"><span className="eyebrow gold">MATCH DAY MODE</span><h2>{match.home_team}<em> VS </em>{match.away_team}</h2><p>{fmt(match.match_date)} • {match.match_time||"godzina do ustalenia"} • {match.venue||"miejsce do ustalenia"}</p><div className="v10-matchday-score">{match.status==="played"?`${match.home_score??0}:${match.away_score??0}`:"VS"}</div></div>
    <div className="v10-matchday-grid">
      <button onClick={()=>props.onOpen(match,"attendance")}><UserCheck/><span>OBECNOŚĆ</span><b>{att}/{props.players.length}</b><small>Potwierdzenia i obecni</small></button>
      {props.canManage&&<button onClick={()=>props.onOpen(match,"lineup")}><Users/><span>WYJŚCIOWA 6</span><b>{starters}/6</b><small>{captain?`Kapitan: ${captain.display_name}`:"Wybierz kapitana"}</small></button>}
      {props.canEvents&&<button onClick={()=>props.onOpen(match,"events")}><Goal/><span>GOLE / ASYSTY</span><b>{goals.length}</b><small>Szybkie zdarzenia</small></button>}
      {props.canEvents&&<button onClick={()=>props.onOpen(match,"mvp")}><Star/><span>MVP</span><b>{mvp?"✓":"—"}</b><small>{mvp?.display_name||"Wybierz po meczu"}</small></button>}
      {props.canManage&&<button onClick={()=>props.onOpen(match,"summary")}><Trophy/><span>WYNIK / DANE</span><b>{match.status==="played"?`${match.home_score??0}:${match.away_score??0}`:"–:–"}</b><small>Godzina, miejsce, wynik</small></button>}
      <button onClick={copySummary}><ChevronRight/><span>PODSUMOWANIE</span><b>TXT</b><small>Kopiuj gotową wiadomość</small></button>
      <button onClick={generateMatchGraphic}><Trophy/><span>GRAFIKA PO MECZU</span><b>PNG</b><small>Gotowa karta wyniku</small></button>
      <button onClick={generateCallupGraphic}><Users/><span>GRAFIKA POWOŁANI</span><b>PNG</b><small>Lista potwierdzonych</small></button>
    </div>
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
  return <section className="section v10-hof">
    <div className="v10-page-hero v102-hof-hero devil-card"><div><span className="eyebrow gold">REKORDY DRUŻYNY</span><h2>HALL OF <em>FAME</em></h2><p>Liderzy sezonu, treningów i najlepsza chemia zespołu. Ci, którzy tworzą historię DELTA 2018 GM.</p></div><Trophy size={56}/><blockquote>„Wielcy zawodnicy nie rodzą się sami — tworzy ich drużyna.”</blockquote></div>
    <div className="v10-hof-team"><article><b>{played.length}</b><span>MECZE</span></article><article><b>{wins}</b><span>WYGRANE</span></article><article><b>{goals}</b><span>GOLE</span></article><article><b>{props.chemistry[0]?.score||0}%</b><span>TOP CHEMIA</span></article></div>
    <div className="v10-hof-grid">{records.map(([title,p,value,unit,Icon])=><button key={title} onClick={()=>p&&props.onOpenPlayer(p)} className="devil-card"><Icon size={22}/><small>{title}</small>{p?<><Avatar p={p}/><h3>{p.display_name}</h3><b>{value(p)}</b><span>{unit}</span></>:<p>Brak danych</p>}</button>)}</div>
    <article className="v10-seasons devil-card"><div className="v8-panel-title"><CalendarDays size={18}/> PORÓWNANIE SEZONÓW</div><div>{seasonSummaries.length?seasonSummaries.map(x=><div key={x.label}><b>{x.label}</b><span>{x.matches} meczów</span><span>{x.wins} wygranych</span><strong>{x.goals} goli</strong></div>):<p className="muted">Dane pojawią się po rozegranych meczach.</p>}</div></article>
    <article className="v10-month devil-card"><div><small>AUTOMATYCZNE PODSUMOWANIE MIESIĄCA</small><h3>{latestMonth}</h3><p>{monthMatches.length} meczów • {monthWins} wygranych • {monthGoals} goli • {monthTrainings} treningów</p></div><button onClick={copyMonth}>KOPIUJ PODSUMOWANIE</button></article>
    <article className="v10-duos devil-card"><div className="v8-panel-title"><Zap size={18}/> NAJLEPSZE DUETY — CHEMIA</div><div>{props.chemistry.slice(0,5).map((x,i)=><div key={`${x.a.id}-${x.b.id}`}><strong>#{i+1}</strong><span>{x.a.display_name} + {x.b.display_name}</span><b>{x.score}%</b><small>{x.games} gier • {x.wins} wygranych • {x.combinedGA} akcji G/A</small></div>)}</div></article>
  </section>;
}
