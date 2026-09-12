"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import PlayerPhoto from "./PlayerPhoto";
import MatchCenterModal from "./MatchCenterModal";
import {
  Bell, CalendarDays, Trophy, Users, Newspaper, History, Shield, Star,
  Check, X, Crown, Target, ChevronRight, Flame, Award, UserCheck, Goal, Home, UserRound, TrendingUp, Medal, Zap
} from "lucide-react";

type Profile={id:string;role:"admin"|"coach"|"parent"|string;display_name:string|null};
type Player={id:string;display_name:string;shirt_number:string|null;position:string|null;photo_path:string|null;active:boolean};
type Match={id:string;round_no:number|null;match_date:string;match_time:string|null;venue:string|null;home_team:string;away_team:string;home_score:number|null;away_score:number|null;status:"scheduled"|"played"|"cancelled"|string};
type Attendance={match_id:string;player_id:string;status:string};
type Lineup={match_id:string;player_id:string;is_starter:boolean;is_captain:boolean};
type Event={id:string;match_id:string;event_type:string;player_id:string|null;assist_player_id:string|null;minute:number|null;created_at:string};
type News={id:string;type:string;title:string;body:string|null;published_at:string};

const CLUB="K.S. Delta Warszawa GM";
const teamLogos:Record<string,string>={
  "K.S. Delta Warszawa GM":"/teamlogos/gm.png",
  "Alfa Przymierze Rodzin":"/teamlogos/alfa.png",
  "FC Vizja Warszawa":"/teamlogos/vizja.png",
  "RKS Ursus Warszawa":"/teamlogos/ursus.png",
  "MUKS Julianów":"/teamlogos/julianow.png",
};

function datePL(x:string){return new Date(`${x}T12:00:00`).toLocaleDateString("pl-PL",{day:"2-digit",month:"2-digit",year:"numeric"});}


function formatCountdown(ms:number){
  if(ms<=0)return "teraz";
  const totalMinutes=Math.floor(ms/60000);
  const days=Math.floor(totalMinutes/1440);
  const hours=Math.floor((totalMinutes%1440)/60);
  const minutes=totalMinutes%60;
  if(days>0)return `${days} d ${hours} godz. ${minutes} min`;
  if(hours>0)return `${hours} godz. ${minutes} min`;
  return `${Math.max(1,minutes)} min`;
}

function parseLocalMatchDate(date:string,time?:string|null){
  const safeTime=(time&&time.length>=5)?time.slice(0,5):"00:00";
  return new Date(`${date}T${safeTime}:00`);
}

function getNextTraining(now:Date){
  // Wednesday = 3, Friday = 5. Training: 17:00–18:30.
  for(let add=0;add<=7;add++){
    const start=new Date(now);
    start.setDate(now.getDate()+add);
    start.setHours(17,0,0,0);

    const day=start.getDay();
    if(day!==3&&day!==5)continue;

    const end=new Date(start);
    end.setHours(18,30,0,0);

    if(add===0&&now>=start&&now<end){
      return {start,end,isLive:true};
    }

    if(start>now){
      return {start,end,isLive:false};
    }
  }

  // Safety fallback; normal loop above should always return.
  const start=new Date(now);
  start.setDate(now.getDate()+7);
  start.setHours(17,0,0,0);
  const end=new Date(start);
  end.setHours(18,30,0,0);
  return {start,end,isLive:false};
}

function Logo({team,size=58}:{team:string,size?:number}){
  const src=teamLogos[team];
  if(src) return <img src={src} alt="" style={{width:size,height:size,objectFit:"contain"}}/>;
  const short=team.includes(" WI")?"WI":team.includes(" WA")?"WA":team.includes(" GM")?"GM":team.split(" ").filter(Boolean)[0]?.slice(0,2).toUpperCase();
  return <div className="fallback-logo" style={{width:size,height:size}}>{short}</div>;
}

export default function TeamHub(props:{
  profile:Profile;
  initialPlayers:Player[];
  initialMatches:Match[];
  initialAttendance:Attendance[];
  initialLineup:Lineup[];
  initialEvents:Event[];
  initialNews:News[];
  parentPlayerIds:string[];
}){
  const supabase=createClient();
  const [tab,setTab]=useState<"home"|"matches"|"players"|"achievements"|"chronicle"|"news">("home");
  const [players,setPlayers]=useState(props.initialPlayers);
  const [matches,setMatches]=useState(props.initialMatches);
  const [attendance,setAttendance]=useState(props.initialAttendance);
  const [lineup,setLineup]=useState(props.initialLineup);
  const [events,setEvents]=useState(props.initialEvents);
  const [news,setNews]=useState(props.initialNews);
  const [selectedPlayer,setSelectedPlayer]=useState<Player|null>(null);
  const [selectedMatch,setSelectedMatch]=useState<Match|null>(null);
  const [accountOpen,setAccountOpen]=useState(false);
  const [now,setNow]=useState(()=>new Date());

  useEffect(()=>{
    const tick=window.setInterval(()=>setNow(new Date()),30000);
    return ()=>window.clearInterval(tick);
  },[]);
  const staff=props.profile.role==="admin"||props.profile.role==="coach";

  useEffect(()=>{
    setPlayers(props.initialPlayers);setMatches(props.initialMatches);setAttendance(props.initialAttendance);
    setLineup(props.initialLineup);setEvents(props.initialEvents);setNews(props.initialNews);
  },[props.initialPlayers,props.initialMatches,props.initialAttendance,props.initialLineup,props.initialEvents,props.initialNews]);

  const stats=useMemo(()=>{
    const map:Record<string,{m:number;starts:number;captain:number;g:number;a:number;mvp:number}>={};
    players.forEach(p=>map[p.id]={m:0,starts:0,captain:0,g:0,a:0,mvp:0});
    matches.filter(m=>m.status==="played").forEach(m=>{
      attendance.filter(a=>a.match_id===m.id&&(a.status==="present"||a.status==="yes")).forEach(a=>{if(map[a.player_id])map[a.player_id].m++});
      lineup.filter(l=>l.match_id===m.id).forEach(l=>{if(map[l.player_id]){if(l.is_starter)map[l.player_id].starts++;if(l.is_captain)map[l.player_id].captain++;}});
      events.filter(e=>e.match_id===m.id).forEach(e=>{
        if(e.event_type==="goal"&&e.player_id&&map[e.player_id])map[e.player_id].g++;
        if(e.event_type==="goal"&&e.assist_player_id&&map[e.assist_player_id])map[e.assist_player_id].a++;
        if(e.event_type==="mvp"&&e.player_id&&map[e.player_id])map[e.player_id].mvp++;
      });
    });
    return map;
  },[players,matches,attendance,lineup,events]);

  const teamSummary=useMemo(()=>{
    let played=0,wins=0,draws=0,losses=0,goals=0,assists=0;
    matches.filter(m=>m.status==="played").forEach(m=>{
      played++;
      const ours=m.home_team===CLUB?(m.home_score||0):(m.away_score||0);
      const opp=m.home_team===CLUB?(m.away_score||0):(m.home_score||0);
      goals+=ours;
      if(ours>opp)wins++; else if(ours===opp)draws++; else losses++;
      assists+=events.filter(e=>e.match_id===m.id&&e.event_type==="goal"&&e.assist_player_id).length;
    });
    return {played,wins,draws,losses,goals,assists};
  },[matches,events]);

  const nextMatch=matches.find(m=>m.status==="scheduled");
  const nextMatchAt=nextMatch?parseLocalMatchDate(nextMatch.match_date,nextMatch.match_time):null;
  const nextMatchCountdown=nextMatchAt?formatCountdown(nextMatchAt.getTime()-now.getTime()):"—";
  const nextTraining=getNextTraining(now);
  const trainingCountdown=nextTraining.isLive
    ? `Trening trwa • do ${nextTraining.end.toLocaleTimeString("pl-PL",{hour:"2-digit",minute:"2-digit"})}`
    : formatCountdown(nextTraining.start.getTime()-now.getTime());
  const nextTrainingLabel=nextTraining.start.toLocaleDateString("pl-PL",{weekday:"long",day:"2-digit",month:"2-digit"})+
    " • "+nextTraining.start.toLocaleTimeString("pl-PL",{hour:"2-digit",minute:"2-digit"})+"–18:30";
  const nextPresent=nextMatch?attendance.filter(a=>a.match_id===nextMatch.id&&(a.status==="present"||a.status==="yes")).length:0;
  const nextResponses=nextMatch?attendance.filter(a=>a.match_id===nextMatch.id&&["yes","no","maybe"].includes(a.status)):[];
  const nextResponseCount=new Set(nextResponses.map(a=>a.player_id)).size;
  const parentPlayers=players.filter(p=>props.parentPlayerIds.includes(p.id));
  const attendanceStatus=(playerId:string)=>nextResponses.find(a=>a.player_id===playerId)?.status||"";
  const topScorer=players.slice().sort((a,b)=>(stats[b.id]?.g||0)-(stats[a.id]?.g||0))[0];
  const topAssister=players.slice().sort((a,b)=>(stats[b.id]?.a||0)-(stats[a.id]?.a||0))[0];
  const topMvp=players.slice().sort((a,b)=>(stats[b.id]?.mvp||0)-(stats[a.id]?.mvp||0))[0];
  const captainLeader=players.slice().sort((a,b)=>(stats[b.id]?.captain||0)-(stats[a.id]?.captain||0))[0];
  const recentMatches=matches
    .filter(m=>m.status==="played")
    .slice()
    .sort((a,b)=>new Date(b.match_date).getTime()-new Date(a.match_date).getTime())
    .slice(0,5);

  const recentResult=(m:Match)=>{
    const ours=m.home_team===CLUB?(m.home_score||0):(m.away_score||0);
    const opp=m.home_team===CLUB?(m.away_score||0):(m.home_score||0);
    if(ours>opp)return "W";
    if(ours===opp)return "R";
    return "P";
  };

  const recentOpponent=(m:Match)=>m.home_team===CLUB?m.away_team:m.home_team;

  const currentUnbeatenStreak=(()=>{
    let count=0;
    for(const m of recentMatches){
      if(recentResult(m)==="P")break;
      count++;
    }
    return count;
  })();

  const currentWinStreak=(()=>{
    let count=0;
    for(const m of recentMatches){
      if(recentResult(m)!=="W")break;
      count++;
    }
    return count;
  })();

  const teamGoalTarget=50;
  const teamGoalProgress=Math.min(100,Math.round((teamSummary.goals/teamGoalTarget)*100));

  const unlockedCount=(p:Player)=>playerAchievements(p).filter(([,ok])=>ok).length;

  const playerAchievements=(p:Player)=>{
    const s=stats[p.id]||{m:0,starts:0,captain:0,g:0,a:0,mvp:0};
    return [
      ["Debiut",s.m>=1,`${s.m}/1`],["5 meczów",s.m>=5,`${s.m}/5`],["Wyjściowa 6",s.starts>=1,`${s.starts}/1`],
      ["Stały starter",s.starts>=5,`${s.starts}/5`],["Kapitan",s.captain>=1,`${s.captain}/1`],["Lider zespołu",s.captain>=5,`${s.captain}/5`],
      ["Pierwszy gol",s.g>=1,`${s.g}/1`],["5 goli",s.g>=5,`${s.g}/5`],["Pierwsza asysta",s.a>=1,`${s.a}/1`],
      ["Kreator",s.a>=5,`${s.a}/5`],["MVP",s.mvp>=1,`${s.mvp}/1`],["Gwiazda",s.mvp>=3,`${s.mvp}/3`],
    ];
  };

  async function setParentAttendance(matchId:string,playerId:string,status:"yes"|"no"|"maybe"){
    const {error}=await supabase.from("match_attendance").upsert({match_id:matchId,player_id:playerId,status,updated_by:props.profile.id},{onConflict:"match_id,player_id"});
    if(!error)setAttendance(prev=>[...prev.filter(a=>!(a.match_id===matchId&&a.player_id===playerId)),{match_id:matchId,player_id:playerId,status}]);
  }
  async function saveNewsItem(){
    const title=prompt("Tytuł aktualności");if(!title)return;const body=prompt("Treść")||"";const type=prompt("Typ: organizacja / mecz / wynik","organizacja")||"organizacja";
    const {data,error}=await supabase.from("news").insert({title,body,type,created_by:props.profile.id}).select("id,type,title,body,published_at").single();
    if(!error&&data)setNews(prev=>[data,...prev]);
  }
  async function enablePush(){
    if(!("serviceWorker" in navigator)||!("PushManager" in window))return alert("Push nie jest wspierany w tej przeglądarce.");
    const permission=await Notification.requestPermission();if(permission!=="granted")return;await navigator.serviceWorker.register("/sw.js");
    alert("Zgoda na powiadomienia jest aktywna.");
  }

  const navItems:[string,string,any][]=[
    ["home","Start",Home],["matches","Mecze",CalendarDays],["players","Drużyna",Users],
    ["achievements","Osiągnięcia",Trophy],["chronicle","Kronika",History],["news","Aktualności",Newspaper],
  ];

  return <div className="hub v8-hub">
    <aside className="v8-side-nav">
      <div className="v8-side-brand"><img src="/teamlogos/gm.png" alt=""/><span>GM</span></div>
      {navItems.map(([id,label,Icon])=><button key={id} className={tab===id?"active":""} onClick={()=>setTab(id as any)}><Icon size={21}/><span>{label}</span></button>)}
      <div className="v8-side-devil"><Flame size={22}/><span>DIABEŁKI</span></div>
    </aside>

    <header className="hub-top v8-topbar">
      <div className="v8-mini-brand"><img src="/teamlogos/gm.png" alt=""/><div><b>DELTA 2018 GM</b><span>Górny Mokotów</span></div></div>
      <div className="v8-top-spacer"/>
      {staff&&<a href="/admin" className="admin-link v8-admin-chip">ADMIN</a>}
      <div className="v8-account-wrap">
        <button className="v8-account-btn" onClick={()=>setAccountOpen(v=>!v)} aria-label="Konto użytkownika"><UserRound size={17}/></button>
        {accountOpen&&<div className="v8-account-popover">
          <small>KONTO</small>
          <b>{props.profile.display_name||"Użytkownik"}</b>
          <span>{props.profile.role}</span>
        </div>}
      </div>
      <button className="icon-btn v8-bell" onClick={enablePush}><Bell size={18}/></button>
    </header>

    <main className="hub-main v8-main">
      {tab==="home"&&<>
        <section className="v8-hero v82-hero-clean" aria-label="DELTA 2018 GM — Górny Mokotów">
          <div className="v82-hero-vignette"/>
        </section>

        {nextMatch&&<section className="v82-match-rsvp-grid">
          <article className="v8-match-card devil-card">
            <div className="v8-section-label"><CalendarDays size={17}/> NAJBLIŻSZY MECZ <span>Kolejka {nextMatch.round_no||"—"}</span></div>
            <div className="v8-match-stage">
              <div className="v8-team">
                <Logo team={nextMatch.home_team} size={76}/>
                <b>{nextMatch.home_team}</b>
                <small>GOSPODARZ</small>
              </div>
              <div className="v8-vs">
                <strong>VS</strong>
                <span>{datePL(nextMatch.match_date)} • {nextMatch.match_time||"—"}</span>
                <small>{nextMatch.venue||"Miejsce do ustalenia"}</small>
              </div>
              <div className="v8-team">
                <Logo team={nextMatch.away_team} size={76}/>
                <b>{nextMatch.away_team}</b>
                <small>GOŚĆ</small>
              </div>
            </div>

            <div className="v84-countdown-row">
              <div className="v84-countdown v84-match-countdown">
                <span>DO MECZU</span>
                <b>{nextMatchCountdown}</b>
                <small>{datePL(nextMatch.match_date)} • {nextMatch.match_time||"godzina do ustalenia"}</small>
              </div>
              <div className={`v84-countdown v84-training-countdown ${nextTraining.isLive?"live":""}`}>
                <span>{nextTraining.isLive?"TRENING TERAZ":"DO TRENINGU"}</span>
                <b>{trainingCountdown}</b>
                <small>{nextTrainingLabel}</small>
              </div>
            </div>

            <button className="v8-red-cta" onClick={()=>setSelectedMatch(nextMatch)}>CENTRUM MECZU <ChevronRight size={17}/></button>
          </article>

          <article className="v85-home-attendance devil-card">
            <div className="v8-panel-title"><UserCheck size={18}/> OBECNOŚĆ NA MECZU</div>
            <div className="v85-home-attendance-number"><b>{nextResponseCount}</b><span>/ {players.length}</span></div>
            <p>{staff?"Rodzice potwierdzili udział zawodników.":"Potwierdź udział swojego zawodnika w Centrum Meczu."}</p>
            <div className="v8-progress"><i style={{width:`${players.length?Math.min(100,nextResponseCount/players.length*100):0}%`}}/></div>
            <button onClick={()=>setSelectedMatch(nextMatch)}>
              {staff?"ZOBACZ LISTĘ OBECNOŚCI":"POTWIERDŹ OBECNOŚĆ"} <ChevronRight size={15}/>
            </button>
          </article>
        </section>}

        <section className="v8-stats-row">
          {[
            ["MECZE",teamSummary.played,Target],["WYGRANE",teamSummary.wins,Trophy],["REMISY",teamSummary.draws,Shield],
            ["PORAŻKI",teamSummary.losses,X],["BRAMKI",teamSummary.goals,Goal],["ASYSTY",teamSummary.assists,Star]
          ].map(([label,val,Icon]:any)=><div className="v8-stat devil-tile" key={label}><Icon size={25}/><b>{val}</b><span>{label}</span></div>)}
        </section>

        <section className="v8-dashboard-grid">
          <article className="v8-panel v8-captain devil-card">
            <div className="v8-panel-title"><Crown size={18}/> KAPITAN DRUŻYNY</div>
            {captainLeader?<div className="v8-captain-body"><div className="v8-captain-photo"><PlayerPhoto playerId={captainLeader.id}/></div><div><span>#{captainLeader.shirt_number||"—"}</span><h3>{captainLeader.display_name}</h3><p>{stats[captainLeader.id]?.captain||0} × kapitan</p><button onClick={()=>setSelectedPlayer(captainLeader)}>PROFIL ZAWODNIKA <ChevronRight size={15}/></button></div></div>:<p className="muted">Brak danych kapitana.</p>}
          </article>

          <article className="v8-panel v86-recent-matches devil-card">
            <div className="v8-panel-title"><History size={18}/> OSTATNIE MECZE <button onClick={()=>setTab("matches")}>WSZYSTKIE</button></div>
            <div className="v86-form-strip">
              {recentMatches.length>0?recentMatches.map(m=>{
                const result=recentResult(m);
                const opponent=recentOpponent(m);
                const ours=m.home_team===CLUB?(m.home_score??0):(m.away_score??0);
                const opp=m.home_team===CLUB?(m.away_score??0):(m.home_score??0);
                return <button className={`v86-match-chip result-${result.toLowerCase()}`} key={m.id} onClick={()=>setSelectedMatch(m)}>
                  <span className="v86-result-badge">{result}</span>
                  <div className="v86-match-logo"><Logo team={opponent} size={42}/></div>
                  <b>{ours}:{opp}</b>
                  <span>{opponent}</span>
                  <small>{datePL(m.match_date)}</small>
                </button>
              }):<div className="v86-no-matches"><History size={28}/><b>Sezon dopiero się zaczyna</b><span>Ostatnie wyniki pojawią się tutaj po rozegranych meczach.</span></div>}
            </div>
            {recentMatches.length>0&&<div className="v86-form-summary">
              <span>FORMA</span>
              <div>{recentMatches.map(m=><i key={m.id} className={`form-${recentResult(m).toLowerCase()}`}>{recentResult(m)}</i>)}</div>
              <small>ostatnie {recentMatches.length} {recentMatches.length===1?"spotkanie":"spotkania"}</small>
            </div>}
          </article>

          <article className="v8-panel v8-squad devil-card">
            <div className="v8-panel-title"><UserCheck size={18}/> SKŁAD MECZOWY</div>
            <div className="v8-progress-item"><div><b>Obecność</b><span>{nextPresent}/{players.length}</span></div><div className="v8-progress"><i style={{width:`${players.length?Math.min(100,nextPresent/players.length*100):0}%`}}/></div></div>
            <div className="v8-progress-item"><div><b>Potwierdzenia rodziców</b><span>{nextResponseCount}/{players.length}</span></div><div className="v8-progress"><i style={{width:`${players.length?Math.min(100,nextResponseCount/players.length*100):0}%`}}/></div></div>
            <button className="v86-squad-btn" onClick={()=>nextMatch&&setSelectedMatch(nextMatch)}>OTWÓRZ LISTĘ OBECNOŚCI <ChevronRight size={14}/></button>
            <div className="v8-devil-note"><Flame size={18}/> Gotowi walczyć razem.</div>
          </article>
        </section>

        <section className="v8-lower-grid">
          <article className="v8-panel devil-card"><div className="v8-panel-title"><Target size={18}/> STRZELCY BRAMEK</div>{topScorer&&stats[topScorer.id]?.g>0?<div className="v8-leader-row"><b>{topScorer.display_name}</b><span>{stats[topScorer.id].g} goli</span></div>:<p className="muted">Brak danych • pierwszy gol jeszcze przed nami.</p>}</article>
          <article className="v8-panel devil-card"><div className="v8-panel-title"><Star size={18}/> ASYSTY</div>{topAssister&&stats[topAssister.id]?.a>0?<div className="v8-leader-row"><b>{topAssister.display_name}</b><span>{stats[topAssister.id].a} asyst</span></div>:<p className="muted">Brak danych • pierwsza asysta jeszcze przed nami.</p>}</article>
          <article className="v8-quote devil-card"><span>„</span><p>Drużyna to nie tylko zawodnicy. To rodzina.</p></article>
          <article className="v8-banner-small devil-card"><div>JEDEN ZESPÓŁ</div><b>WIELE MOŻLIWOŚCI</b></article>
        </section>


        <section className="v87-season-grid">
          <article className="v87-leaders devil-card">
            <div className="v8-panel-title"><Medal size={18}/> NAJLEPSI W SEZONIE</div>
            <div className="v87-leaders-grid">
              <button onClick={()=>topScorer&&setSelectedPlayer(topScorer)} className="v87-leader-card">
                <div className="v87-leader-icon"><Goal size={20}/></div>
                <span>BRAMKI</span>
                <b>{topScorer&&stats[topScorer.id]?.g>0?topScorer.display_name:"—"}</b>
                <strong>{topScorer?stats[topScorer.id]?.g||0:0}</strong>
              </button>
              <button onClick={()=>topAssister&&setSelectedPlayer(topAssister)} className="v87-leader-card">
                <div className="v87-leader-icon"><Star size={20}/></div>
                <span>ASYSTY</span>
                <b>{topAssister&&stats[topAssister.id]?.a>0?topAssister.display_name:"—"}</b>
                <strong>{topAssister?stats[topAssister.id]?.a||0:0}</strong>
              </button>
              <button onClick={()=>topMvp&&setSelectedPlayer(topMvp)} className="v87-leader-card">
                <div className="v87-leader-icon"><Trophy size={20}/></div>
                <span>MVP</span>
                <b>{topMvp&&stats[topMvp.id]?.mvp>0?topMvp.display_name:"—"}</b>
                <strong>{topMvp?stats[topMvp.id]?.mvp||0:0}</strong>
              </button>
            </div>
          </article>

          <article className="v87-team-goal devil-card">
            <div className="v8-panel-title"><Target size={18}/> CEL DRUŻYNY</div>
            <div className="v87-goal-number"><b>{teamSummary.goals}</b><span>/ {teamGoalTarget}</span></div>
            <h3>50 BRAMEK W SEZONIE</h3>
            <p>Każdy gol przybliża Diabełki do wspólnego celu.</p>
            <div className="v87-goal-track"><i style={{width:`${teamGoalProgress}%`}}><em>{teamGoalProgress}%</em></i></div>
            <small>Do celu pozostało {Math.max(0,teamGoalTarget-teamSummary.goals)} bramek</small>
          </article>

          <article className="v87-streak devil-card">
            <div className="v8-panel-title"><TrendingUp size={18}/> SERIA DRUŻYNY</div>
            <div className="v87-streak-main">
              <Zap size={30}/>
              <div>
                <b>{currentWinStreak>0?currentWinStreak:currentUnbeatenStreak}</b>
                <span>{currentWinStreak>0?(currentWinStreak===1?"WYGRANA Z RZĘDU":"WYGRANE Z RZĘDU"):(currentUnbeatenStreak>0?"MECZE BEZ PORAŻKI":"NOWA SERIA CZEKA")}</span>
              </div>
            </div>
            <div className="v87-form-dots">
              {recentMatches.map(m=><i key={m.id} className={`form-${recentResult(m).toLowerCase()}`}>{recentResult(m)}</i>)}
              {recentMatches.length===0&&<small>Pierwszy wynik uruchomi serię.</small>}
            </div>
          </article>
        </section>

        <section className="v8-bottom-grid">
          <article className="v8-panel devil-card"><div className="v8-panel-title"><Award size={18}/> OSIĄGNIĘCIA</div><div className="v8-achievement-preview"><Trophy/><div><b>{teamSummary.wins>=1?"Pierwsze sukcesy zapisane":"Pierwsze trofea czekają"}</b><span>{teamSummary.wins} zwycięstw • {teamSummary.goals} bramek</span></div></div><button className="v8-link-btn" onClick={()=>setTab("achievements")}>ZOBACZ WSZYSTKIE <ChevronRight size={14}/></button></article>
          <article className="v8-panel devil-card"><div className="v8-panel-title"><Newspaper size={18}/> AKTUALNOŚCI {staff&&<button onClick={saveNewsItem}>DODAJ</button>}</div><div className="v8-news-list">{news.slice(0,3).map(n=><div key={n.id}><i/><div><b>{n.title}</b><span>{new Date(n.published_at).toLocaleDateString("pl-PL")}</span></div></div>)}{news.length===0&&<p className="muted">Brak aktualności.</p>}</div></article>
          <article className="v8-panel devil-card"><div className="v8-panel-title"><History size={18}/> KRONIKA</div><div className="v8-chronicle-preview">{matches.filter(m=>m.status==="played").slice(-2).reverse().map(m=><div key={m.id}><b>{datePL(m.match_date)}</b><span>{m.home_team} {m.home_score}:{m.away_score} {m.away_team}</span></div>)}{matches.filter(m=>m.status==="played").length===0&&<p className="muted">Historia sezonu dopiero się zaczyna.</p>}</div></article>
        </section>
      </>}

      {tab==="matches"&&<section className="section v8-section-page"><div className="section-title"><h2>Mecze</h2></div><div className="list">{matches.map(m=><article className="match-row devil-card" key={m.id}><div className="teamline"><Logo team={m.home_team} size={38}/><strong>{m.home_team}</strong></div><div className="score">{m.status==="played"?`${m.home_score}:${m.away_score}`:"–:–"}</div><div className="teamline right"><strong>{m.away_team}</strong><Logo team={m.away_team} size={38}/></div><div className="match-meta">{datePL(m.match_date)} {m.match_time||""} • {m.venue||"—"}</div><div className="match-actions-row"><button className="open-match-btn" onClick={()=>setSelectedMatch(m)}>{staff?"EDYTUJ MECZ / CENTRUM MECZU":"SZCZEGÓŁY MECZU"}</button></div></article>)}</div></section>}

      {tab==="players"&&<section className="section v8-section-page v87-players-page">
        <div className="section-title"><div><span className="eyebrow gold">DELTA 2018 GM</span><h2>Drużyna</h2></div><span>{players.length} zawodników</span></div>
        <div className="v87-player-grid">{players.map(p=>{
          const s=stats[p.id]||{m:0,starts:0,captain:0,g:0,a:0,mvp:0};
          const achievements=unlockedCount(p);
          return <article className="v87-player-card" key={p.id} onClick={()=>setSelectedPlayer(p)}>
            <div className="v87-player-card-bg"/>
            <div className="v87-player-top">
              <span className="v87-player-number">#{p.shirt_number||"—"}</span>
              <span className="v87-player-position">{p.position||"ZAWODNIK"}</span>
            </div>
            <div className="v87-player-photo">
              <PlayerPhoto playerId={p.id} className="v87-player-photo-img"/>
              <div className="v87-player-smoke"/>
            </div>
            <div className="v87-player-content">
              <h3>{p.display_name}</h3>
              <div className="v87-player-primary">
                <div><b>{s.g+s.a}</b><span>G+A</span></div>
                <div><b>{s.g}</b><span>GOLE</span></div>
                <div><b>{s.a}</b><span>ASYSTY</span></div>
              </div>
              <div className="v87-player-secondary">
                <span><b>{s.m}</b> mecze</span>
                <span><b>{s.captain}</b> kapitan</span>
                <span><b>{s.mvp}</b> MVP</span>
              </div>
              <div className="v87-player-achievements"><Award size={13}/><span>{achievements} odblokowanych osiągnięć</span></div>
              <button>PROFIL ZAWODNIKA <ChevronRight size={14}/></button>
            </div>
          </article>
        })}</div>
      </section>}

      {tab==="achievements"&&<section className="section v8-section-page"><div className="section-title"><h2>Osiągnięcia</h2></div><div className="achievement-grid">{[["Start sezonu",teamSummary.played>=1,teamSummary.played,1],["3 zwycięstwa",teamSummary.wins>=3,teamSummary.wins,3],["10 bramek",teamSummary.goals>=10,teamSummary.goals,10],["25 bramek",teamSummary.goals>=25,teamSummary.goals,25],["50 bramek",teamSummary.goals>=50,teamSummary.goals,50],["10 asyst",teamSummary.assists>=10,teamSummary.assists,10]].map(([name,ok,current,target])=><div className={`achievement devil-card ${ok?"unlocked":""}`} key={name as string}><Trophy size={24}/><h3>{name}</h3><p>{ok?"ZDOBYTE":`${current}/${target}`}</p></div>)}</div></section>}

      {tab==="chronicle"&&<section className="section v8-section-page"><div className="section-title"><h2>Kronika sezonu</h2></div><div className="list">{matches.filter(m=>m.status==="played").slice().reverse().map(m=>{const matchEvents=events.filter(e=>e.match_id===m.id);const starters=lineup.filter(l=>l.match_id===m.id&&l.is_starter).map(l=>players.find(p=>p.id===l.player_id)?.display_name).filter(Boolean);const captain=lineup.find(l=>l.match_id===m.id&&l.is_captain);const captainName=players.find(p=>p.id===captain?.player_id)?.display_name;return <article className="chronicle-card devil-card" key={m.id}><div className="chronicle-head"><span>Kolejka {m.round_no||"—"}</span><span>{datePL(m.match_date)}</span></div><div className="chronicle-score"><span>{m.home_team}</span><b>{m.home_score}:{m.away_score}</b><span>{m.away_team}</span></div><div className="chronicle-columns"><div><h4>Bramki i asysty</h4>{matchEvents.filter(e=>e.event_type==="goal").map(e=>{const scorer=players.find(p=>p.id===e.player_id)?.display_name||"?";const assist=players.find(p=>p.id===e.assist_player_id)?.display_name;return <p key={e.id}>{scorer}{assist?` • asysta ${assist}`:""}</p>})}</div><div><h4>Kadra</h4><p>Kapitan: {captainName||"—"}</p><p>Wyjściowa 6: {starters.join(", ")||"—"}</p></div><div><h4>MVP</h4><p>{players.find(p=>p.id===matchEvents.find(e=>e.event_type==="mvp")?.player_id)?.display_name||"—"}</p></div></div></article>})}</div></section>}

      {tab==="news"&&<section className="section v8-section-page"><div className="section-title"><h2>Aktualności</h2>{staff&&<button className="btn gold-btn" onClick={saveNewsItem}>Dodaj aktualność</button>}</div><div className="news-grid">{news.map(n=><article className="news-card devil-card" key={n.id}><span className="tag">{n.type}</span><h3>{n.title}</h3><p>{n.body}</p><small>{new Date(n.published_at).toLocaleString("pl-PL")}</small></article>)}</div></section>}
    </main>

    <nav className="bottom-nav v8-bottom-nav">{navItems.map(([id,label,Icon])=><button key={id} className={tab===id?"active":""} onClick={()=>setTab(id as any)}><Icon size={18}/><span>{label}</span></button>)}</nav>

    {selectedPlayer&&<div className="modal-backdrop" onClick={()=>setSelectedPlayer(null)}><div className="modal-sheet devil-card" onClick={e=>e.stopPropagation()}><button className="close" onClick={()=>setSelectedPlayer(null)}>×</button><div className="premium-profile"><div className="premium-photo"><PlayerPhoto playerId={selectedPlayer.id} className="premium-photo-img"/></div><div className="premium-info"><span className="eyebrow gold">PREMIUM PLAYER PROFILE</span><h2>{selectedPlayer.display_name}</h2><p>{selectedPlayer.position||"Zawodnik"} {selectedPlayer.shirt_number?`#${selectedPlayer.shirt_number}`:""}</p>{(()=>{const s=stats[selectedPlayer.id]||{m:0,starts:0,captain:0,g:0,a:0,mvp:0};return <div className="profile-stats"><div><b>{s.m}</b><span>Mecze</span></div><div><b>{s.starts}</b><span>Wyjściowa 6</span></div><div><b>{s.captain}</b><span>Kapitan</span></div><div><b>{s.g}</b><span>Gole</span></div><div><b>{s.a}</b><span>Asysty</span></div><div><b>{s.g+s.a}</b><span>G+A</span></div><div><b>{s.mvp}</b><span>MVP</span></div></div>})()}</div></div><h3>Osiągnięcia zawodnika</h3><div className="achievement-grid">{playerAchievements(selectedPlayer).map(([name,ok,progress])=><div key={name as string} className={`achievement ${ok?"unlocked":""}`}><Star size={20}/><h3>{name}</h3><p>{ok?"ZDOBYTE":progress}</p></div>)}</div></div></div>}

    {selectedMatch&&<MatchCenterModal
      match={selectedMatch}
      players={players}
      attendance={attendance}
      lineup={lineup}
      events={events}
      currentUserId={props.profile.id}
      currentUserRole={props.profile.role}
      parentPlayerIds={props.parentPlayerIds}
      onClose={()=>setSelectedMatch(null)}
      onDataChange={(d)=>{
        if(d.match){setMatches(prev=>prev.map(m=>m.id===d.match!.id?d.match!:m));setSelectedMatch(d.match);}
        if(d.attendance)setAttendance(d.attendance);
        if(d.lineup)setLineup(d.lineup);
        if(d.events)setEvents(d.events);
      }}
    />}
  </div>;
}
