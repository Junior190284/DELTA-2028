"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import PlayerPhoto from "./PlayerPhoto";
import MatchCenterModal from "./MatchCenterModal";
import { PushSetupError, subscribeToPush, resetPushSubscription } from "@/lib/push";
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
type ClubUpdate={id:string;source_key:string;source_name:string;source_url:string;title:string;body:string|null;priority:number;published_at:string;synced_at:string};
type TeamEvent={id:string;title:string;event_type:string;event_date:string;start_time:string|null;end_time:string|null;location:string|null;details:string|null;important:boolean;player_id:string|null;created_at:string};

const CLUB="K.S. Delta Warszawa GM";
const isRyszardPlayer=(p:{display_name:string})=>{const n=(p.display_name||"").toLocaleLowerCase("pl-PL");return n.includes("ryszard")&&n.includes("rybacki");};
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
  initialClubUpdates:ClubUpdate[];
  initialTeamEvents:TeamEvent[];
  parentPlayerIds:string[];
}){
  const supabase=createClient();
  const [tab,setTab]=useState<"home"|"matches"|"calendar"|"players"|"stats"|"achievements"|"chronicle"|"news"|"club">("home");
  const [players,setPlayers]=useState(props.initialPlayers);
  const [matches,setMatches]=useState(props.initialMatches);
  const [attendance,setAttendance]=useState(props.initialAttendance);
  const [lineup,setLineup]=useState(props.initialLineup);
  const [events,setEvents]=useState(props.initialEvents);
  const [news,setNews]=useState(props.initialNews);
  const [clubUpdates,setClubUpdates]=useState(props.initialClubUpdates);
  const [teamEvents,setTeamEvents]=useState(props.initialTeamEvents);
  const [focusedClubKey,setFocusedClubKey]=useState<string|null>(null);
  const [pushState,setPushState]=useState<"idle"|"working"|"enabled"|"error">("idle");
  const [pushMessage,setPushMessage]=useState<string>("");
  const [selectedPlayer,setSelectedPlayer]=useState<Player|null>(null);
  const [selectedMatch,setSelectedMatch]=useState<Match|null>(null);
  const [matchInitialTab,setMatchInitialTab]=useState<"summary"|"attendance"|"lineup"|"events"|"mvp">("summary");
  const [accountOpen,setAccountOpen]=useState(false);
  const [now,setNow]=useState(()=>new Date());
  const [statsMetric,setStatsMetric]=useState<"ga"|"goals"|"assists"|"mvp"|"matches"|"captain">("ga");
  const [compareA,setCompareA]=useState<string>("");
  const [compareB,setCompareB]=useState<string>("");


  useEffect(()=>{
    const tick=window.setInterval(()=>setNow(new Date()),30000);
    return ()=>window.clearInterval(tick);
  },[]);
  const staff=props.profile.role==="admin"||props.profile.role==="coach";

  useEffect(()=>{
    setPlayers(props.initialPlayers);setMatches(props.initialMatches);setAttendance(props.initialAttendance);
    setLineup(props.initialLineup);setEvents(props.initialEvents);setNews(props.initialNews);setClubUpdates(props.initialClubUpdates);setTeamEvents(props.initialTeamEvents);
  },[props.initialPlayers,props.initialMatches,props.initialAttendance,props.initialLineup,props.initialEvents,props.initialNews,props.initialClubUpdates,props.initialTeamEvents]);

  useEffect(()=>{
    let cancelled=false;
    const refreshClub=async()=>{
      const {data}=await supabase
        .from("club_updates")
        .select("id,source_key,source_name,source_url,title,body,priority,published_at,synced_at")
        .order("published_at",{ascending:false})
        .limit(30);
      if(!cancelled&&data)setClubUpdates(data as ClubUpdate[]);
    };
    const timer=window.setInterval(refreshClub,60000);
    return ()=>{cancelled=true;window.clearInterval(timer);};
  },[supabase]);

  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);
    if(params.get("view")==="club"){
      const key=params.get("club");
      setTab("club");
      if(key)setFocusedClubKey(key);
      window.setTimeout(()=>{
        const el=key?document.getElementById(`club-update-${key}`):document.getElementById("club-feed-top");
        el?.scrollIntoView({behavior:"smooth",block:"center"});
      },350);
    }
  },[]);

  async function enableClubPush(){
    setPushState("working");
    setPushMessage("");
    try{
      await subscribeToPush();
      setPushState("enabled");
      setPushMessage("Gotowe. Ten telefon jest zapisany do powiadomień „Z klubu”.");
    }catch(e:any){
      console.error("Push subscribe error",e);
      setPushState("error");
      if(e instanceof PushSetupError){
        const suffix=e.detail?` (${e.detail})`:"";
        setPushMessage(`${e.message}${suffix}`);
      }else{
        setPushMessage(`Nie udało się włączyć powiadomień: ${String(e?.message||e)}`);
      }
    }
  }

  async function repairClubPush(){
    setPushState("working");
    setPushMessage("Ponownie zapisuję ten telefon…");
    try{
      await resetPushSubscription();
      setPushState("enabled");
      setPushMessage("Gotowe. Stara subskrypcja została zastąpiona nową.");
    }catch(e:any){
      console.error("Push repair error",e);
      setPushState("error");
      if(e instanceof PushSetupError){
        const suffix=e.detail?` (${e.detail})`:"";
        setPushMessage(`${e.message}${suffix}`);
      }else{
        setPushMessage(`Nie udało się ponownie zapisać telefonu: ${String(e?.message||e)}`);
      }
    }
  }

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

  const futureTeamEvents=teamEvents
    .map(e=>{
      const tm=e.start_time?.slice(0,5)||"00:00";
      return {...e,at:new Date(`${e.event_date}T${tm}:00`)};
    })
    .filter(e=>e.at.getTime()>=now.getTime()-60000)
    .sort((a,b)=>a.at.getTime()-b.at.getTime());

  const smartCandidates:{kind:string;title:string;subtitle:string;at:Date;important?:boolean}[]=[
    ...(nextMatchAt&&nextMatchAt>now?[{
      kind:"match",
      title:`Mecz • ${nextMatch?recentOpponent(nextMatch):""}`,
      subtitle:nextMatch?`${datePL(nextMatch.match_date)} • ${nextMatch.match_time||"godzina do ustalenia"}`:"",
      at:nextMatchAt
    }]:[]),
    ...(!nextTraining.isLive?[{
      kind:"training",
      title:"Trening drużyny",
      subtitle:nextTrainingLabel,
      at:nextTraining.start
    }]:[]),
    ...futureTeamEvents.map(e=>({
      kind:e.event_type,
      title:e.title,
      subtitle:[e.event_date,e.start_time?.slice(0,5),e.location].filter(Boolean).join(" • "),
      at:e.at,
      important:e.important
    }))
  ].sort((a,b)=>a.at.getTime()-b.at.getTime());

  const nextTeamEvent=smartCandidates[0]||null;
  const teamClockCountdown=nextTeamEvent?formatCountdown(nextTeamEvent.at.getTime()-now.getTime()):"Brak wydarzeń";
  const importantTeamEvent=futureTeamEvents.find(e=>e.important)||futureTeamEvents.find(e=>e.event_type==="birthday")||null;
  const nextPresent=nextMatch?attendance.filter(a=>a.match_id===nextMatch.id&&(a.status==="present"||a.status==="yes")).length:0;
  const nextResponses=nextMatch?attendance.filter(a=>a.match_id===nextMatch.id&&["yes","no","maybe"].includes(a.status)):[];
  const nextResponseCount=new Set(nextResponses.map(a=>a.player_id)).size;
  const parentPlayers=players.filter(p=>props.parentPlayerIds.includes(p.id));
  const attendanceStatus=(playerId:string)=>nextResponses.find(a=>a.player_id===playerId)?.status||"";
  const topScorer=players.slice().sort((a,b)=>(stats[b.id]?.g||0)-(stats[a.id]?.g||0))[0];
  const topAssister=players.slice().sort((a,b)=>(stats[b.id]?.a||0)-(stats[a.id]?.a||0))[0];
  const topMvp=players.slice().sort((a,b)=>(stats[b.id]?.mvp||0)-(stats[a.id]?.mvp||0))[0];
  const captainLeader=players.slice().sort((a,b)=>(stats[b.id]?.captain||0)-(stats[a.id]?.captain||0))[0];
  const scorersRanking=players
    .slice()
    .filter(p=>(stats[p.id]?.g||0)>0)
    .sort((a,b)=>{
      const dg=(stats[b.id]?.g||0)-(stats[a.id]?.g||0);
      if(dg!==0)return dg;
      const da=(stats[b.id]?.a||0)-(stats[a.id]?.a||0);
      if(da!==0)return da;
      return a.display_name.localeCompare(b.display_name,"pl");
    });

  const assistsRanking=players
    .slice()
    .filter(p=>(stats[p.id]?.a||0)>0)
    .sort((a,b)=>{
      const da=(stats[b.id]?.a||0)-(stats[a.id]?.a||0);
      if(da!==0)return da;
      const dg=(stats[b.id]?.g||0)-(stats[a.id]?.g||0);
      if(dg!==0)return dg;
      return a.display_name.localeCompare(b.display_name,"pl");
    });

  const topGoals=(stats[topScorer?.id]?.g||0);
  const topAssists=(stats[topAssister?.id]?.a||0);
  const topMvpCount=(stats[topMvp?.id]?.mvp||0);

  const seasonTopScorers=topGoals>0 ? players.filter(p=>(stats[p.id]?.g||0)===topGoals) : [];
  const seasonTopAssisters=topAssists>0 ? players.filter(p=>(stats[p.id]?.a||0)===topAssists) : [];
  const seasonTopMvp=topMvpCount>0 ? players.filter(p=>(stats[p.id]?.mvp||0)===topMvpCount) : [];


  const statsRanking=players.slice().sort((a,b)=>{
    const sa=stats[a.id]||{m:0,starts:0,captain:0,g:0,a:0,mvp:0};
    const sb=stats[b.id]||{m:0,starts:0,captain:0,g:0,a:0,mvp:0};
    const value=(s:any)=>{
      if(statsMetric==="goals")return s.g;
      if(statsMetric==="assists")return s.a;
      if(statsMetric==="mvp")return s.mvp;
      if(statsMetric==="matches")return s.m;
      if(statsMetric==="captain")return s.captain;
      return s.g+s.a;
    };
    const diff=value(sb)-value(sa);
    if(diff!==0)return diff;
    return ((stats[b.id]?.g||0)+(stats[b.id]?.a||0))-((stats[a.id]?.g||0)+(stats[a.id]?.a||0)) || a.display_name.localeCompare(b.display_name,"pl");
  });

  const statsMetricLabel=
    statsMetric==="goals"?"GOLE":
    statsMetric==="assists"?"ASYSTY":
    statsMetric==="mvp"?"MVP":
    statsMetric==="matches"?"MECZE":
    statsMetric==="captain"?"KAPITAN":
    "G+A";

  const statsMetricValue=(p:Player)=>{
    const s=stats[p.id]||{m:0,starts:0,captain:0,g:0,a:0,mvp:0};
    if(statsMetric==="goals")return s.g;
    if(statsMetric==="assists")return s.a;
    if(statsMetric==="mvp")return s.mvp;
    if(statsMetric==="matches")return s.m;
    if(statsMetric==="captain")return s.captain;
    return s.g+s.a;
  };

  const comparePlayerA=players.find(p=>p.id===compareA) || players[0] || null;
  const comparePlayerB=players.find(p=>p.id===compareB) || players[1] || players[0] || null;

  const statMax={
    g:Math.max(1,...players.map(p=>stats[p.id]?.g||0)),
    a:Math.max(1,...players.map(p=>stats[p.id]?.a||0)),
    ga:Math.max(1,...players.map(p=>(stats[p.id]?.g||0)+(stats[p.id]?.a||0))),
    m:Math.max(1,...players.map(p=>stats[p.id]?.m||0)),
    starts:Math.max(1,...players.map(p=>stats[p.id]?.starts||0)),
    mvp:Math.max(1,...players.map(p=>stats[p.id]?.mvp||0)),
    captain:Math.max(1,...players.map(p=>stats[p.id]?.captain||0))
  };

  const topGA=players.slice().sort((a,b)=>((stats[b.id]?.g||0)+(stats[b.id]?.a||0))-((stats[a.id]?.g||0)+(stats[a.id]?.a||0)))[0];
  const playersWithGoal=players.filter(p=>(stats[p.id]?.g||0)>0).length;
  const playersWithAssist=players.filter(p=>(stats[p.id]?.a||0)>0).length;
  const winRate=teamSummary.played?Math.round((teamSummary.wins/teamSummary.played)*100):0;
  const goalsPerMatch=teamSummary.played?(teamSummary.goals/teamSummary.played):0;
  const assistsPerMatch=teamSummary.played?(teamSummary.assists/teamSummary.played):0;

  const biggestWin=matches
    .filter(m=>m.status==="played")
    .map(m=>{
      const ours=m.home_team===CLUB?(m.home_score||0):(m.away_score||0);
      const opp=m.home_team===CLUB?(m.away_score||0):(m.home_score||0);
      return {match:m,ours,opp,diff:ours-opp};
    })
    .filter(x=>x.diff>0)
    .sort((a,b)=>b.diff-a.diff)[0] || null;

  const highestScoringMatch=matches
    .filter(m=>m.status==="played")
    .map(m=>{
      const ours=m.home_team===CLUB?(m.home_score||0):(m.away_score||0);
      const opp=m.home_team===CLUB?(m.away_score||0):(m.home_score||0);
      return {match:m,ours,opp,total:ours+opp};
    })
    .sort((a,b)=>b.total-a.total)[0] || null;
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

  function openMatch(match:Match,initial:"summary"|"attendance"|"lineup"|"events"|"mvp"="summary"){
    setMatchInitialTab(initial);
    setSelectedMatch(match);
  }

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
    ["home","Start",Home],["matches","Mecze",CalendarDays],["calendar","Kalendarz",CalendarDays],["players","Drużyna",Users],["stats","Statystyki",TrendingUp],
    ["achievements","Osiągnięcia",Trophy],["chronicle","Kronika",History],["news","Aktualności",Newspaper],["club","Z klubu",Shield],
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

        {nextMatch&&<><section className="v82-match-rsvp-grid">
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

            <div className="v891-match-tools">
              <div className="v891-match-clock">
                <span>DO MECZU</span>
                <b>{nextMatchCountdown}</b>
                <small>{datePL(nextMatch.match_date)} • {nextMatch.match_time||"godzina do ustalenia"}</small>
              </div>

              <button type="button" className="v891-attendance-mini" onClick={()=>openMatch(nextMatch,"attendance")}>
                <span><UserCheck size={16}/> OBECNOŚĆ</span>
                <strong>{nextResponseCount}<em>/ {players.length}</em></strong>
                <div className="v891-attendance-progress"><i style={{width:`${players.length?Math.min(100,nextResponseCount/players.length*100):0}%`}}/></div>
                <small>{staff?"Zobacz odpowiedzi":"Potwierdź udział dziecka"} <ChevronRight size={12}/></small>
              </button>
            </div>

            <button className="v8-red-cta" onClick={()=>openMatch(nextMatch,"summary")}>CENTRUM MECZU <ChevronRight size={17}/></button>
          </article>
        </section>

        <section className="v891-team-clock-row">
          <article className="v891-team-clock devil-card" onClick={()=>setTab("calendar")}>
            <div className="v891-clock-icon"><CalendarDays size={22}/></div>
            <div className="v891-clock-copy">
              <span>ZEGAR DRUŻYNY</span>
              <h3>{nextTeamEvent?.title||"Brak zaplanowanych wydarzeń"}</h3>
              <p>{nextTeamEvent?.subtitle||"Dodaj wydarzenia w Kalendarzu drużyny."}</p>
            </div>
            <div className="v891-clock-time">
              <small>DO WYDARZENIA</small>
              <b>{teamClockCountdown}</b>
            </div>
            <ChevronRight size={18}/>
          </article>

          <article className={`v891-important-note devil-card ${importantTeamEvent?"has-event":""}`} onClick={()=>setTab("calendar")}>
            <div className="v8-panel-title"><Bell size={16}/> WAŻNE</div>
            {importantTeamEvent?<>
              <b>{importantTeamEvent.title}</b>
              <span>{[importantTeamEvent.event_date,importantTeamEvent.start_time?.slice(0,5),importantTeamEvent.location].filter(Boolean).join(" • ")}</span>
              {importantTeamEvent.details&&<p>{importantTeamEvent.details}</p>}
            </>:<>
              <b>Spokojny tydzień</b>
              <span>Brak dodatkowych ważnych informacji.</span>
            </>}
          </article>
        </section></>}

        <section className="v8-stats-row">
          {[
            ["MECZE",teamSummary.played,Target],["WYGRANE",teamSummary.wins,Trophy],["REMISY",teamSummary.draws,Shield],
            ["PORAŻKI",teamSummary.losses,X],["BRAMKI",teamSummary.goals,Goal],["ASYSTY",teamSummary.assists,Star]
          ].map(([label,val,Icon]:any)=><div className="v8-stat devil-tile" key={label}><Icon size={25}/><b>{val}</b><span>{label}</span></div>)}
        </section>

        <section className="v8-dashboard-grid">
          <article className="v8-panel v8-captain devil-card">
            <div className="v8-panel-title"><Crown size={18}/> KAPITAN DRUŻYNY</div>
            {captainLeader?<div className="v886-captain-layout">
              <div className="v8-captain-photo v886-captain-photo">
                <span className="v873-flares"/><span className="v873-embers"/>
                <span className="v873-corner tl"/><span className="v873-corner tr"/>
                <span className="v873-corner bl"/><span className="v873-corner br"/>
                <span className="v873-plate">DELTA DEVILS</span>
                {isRyszardPlayer(captainLeader)?
                  <img src="/assets/ryszard-player-card.png" alt={captainLeader.display_name} className="v884-leader-featured-img"/>:
                  <PlayerPhoto playerId={captainLeader.id}/>
                }
              </div>
              <div className="v886-captain-info">
                <span className="v886-captain-team">DELTA 2018 GM</span>
                <h3>{captainLeader.display_name}</h3>
                <p>{stats[captainLeader.id]?.captain||0} × kapitan</p>
                <button type="button" onClick={()=>setSelectedPlayer(captainLeader)}>
                  PROFIL ZAWODNIKA <ChevronRight size={15}/>
                </button>
              </div>
            </div>:<p className="muted">Brak danych kapitana.</p>}
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

        <section className="v8-lower-grid v885-rankings-grid">
          <article className="v8-panel devil-card v885-ranking-panel">
            <div className="v8-panel-title"><Target size={18}/> STRZELCY BRAMEK</div>
            <div className="v885-ranking-list">
              {scorersRanking.length>0?scorersRanking.map((p,index)=>{
                const s=stats[p.id];
                return <button type="button" className={`v885-ranking-row ${index<3?"top-three":""}`} key={p.id} onClick={()=>setSelectedPlayer(p)}>
                  <span className="v885-rank-number">{index+1}</span>
                  <span className="v885-rank-photo">
                    {isRyszardPlayer(p)?<img src="/assets/ryszard-player-card.png" alt={p.display_name}/>:<PlayerPhoto playerId={p.id}/>}
                  </span>
                  <span className="v885-rank-name"><b>{p.display_name}</b><small>{s?.m||0} {s?.m===1?"mecz":"mecze"}</small></span>
                  <span className="v885-rank-value"><b>{s?.g||0}</b><small>GOLE</small></span>
                  <ChevronRight size={15}/>
                </button>
              }):<div className="v885-ranking-empty">Pierwsze gole uruchomią ranking.</div>}
            </div>
          </article>

          <article className="v8-panel devil-card v885-ranking-panel">
            <div className="v8-panel-title"><Star size={18}/> ASYSTY</div>
            <div className="v885-ranking-list">
              {assistsRanking.length>0?assistsRanking.map((p,index)=>{
                const s=stats[p.id];
                return <button type="button" className={`v885-ranking-row ${index<3?"top-three":""}`} key={p.id} onClick={()=>setSelectedPlayer(p)}>
                  <span className="v885-rank-number">{index+1}</span>
                  <span className="v885-rank-photo">
                    {isRyszardPlayer(p)?<img src="/assets/ryszard-player-card.png" alt={p.display_name}/>:<PlayerPhoto playerId={p.id}/>}
                  </span>
                  <span className="v885-rank-name"><b>{p.display_name}</b><small>{s?.m||0} {s?.m===1?"mecz":"mecze"}</small></span>
                  <span className="v885-rank-value"><b>{s?.a||0}</b><small>ASYSTY</small></span>
                  <ChevronRight size={15}/>
                </button>
              }):<div className="v885-ranking-empty">Pierwsza asysta uruchomi ranking.</div>}
            </div>
          </article>

          <article className="v8-quote devil-card"><span>„</span><p>Drużyna to nie tylko zawodnicy. To rodzina.</p></article>
          <article className="v8-banner-small devil-card"><div>JEDEN ZESPÓŁ</div><b>WIELE MOŻLIWOŚCI</b></article>
        </section>


        <section className="v87-season-grid">
          <article className="v87-leaders devil-card v885-season-best">
            <div className="v8-panel-title"><Medal size={18}/> NAJLEPSI W SEZONIE</div>
            <div className="v885-season-podium">
              <div className="v885-season-category">
                <span className="v885-season-icon"><Goal size={17}/></span>
                <small>GOLE</small>
                <div className="v885-season-winners">
                  {seasonTopScorers.length>0?seasonTopScorers.map(p=><button key={p.id} onClick={()=>setSelectedPlayer(p)}><b>{p.display_name}</b><span>{stats[p.id]?.g||0}</span></button>):<em>—</em>}
                </div>
              </div>
              <div className="v885-season-category">
                <span className="v885-season-icon"><Star size={17}/></span>
                <small>ASYSTY</small>
                <div className="v885-season-winners">
                  {seasonTopAssisters.length>0?seasonTopAssisters.map(p=><button key={p.id} onClick={()=>setSelectedPlayer(p)}><b>{p.display_name}</b><span>{stats[p.id]?.a||0}</span></button>):<em>—</em>}
                </div>
              </div>
              <div className="v885-season-category">
                <span className="v885-season-icon"><Trophy size={17}/></span>
                <small>MVP</small>
                <div className="v885-season-winners">
                  {seasonTopMvp.length>0?seasonTopMvp.map(p=><button key={p.id} onClick={()=>setSelectedPlayer(p)}><b>{p.display_name}</b><span>{stats[p.id]?.mvp||0}</span></button>):<em>—</em>}
                </div>
              </div>
            </div>
          </article>

          <article className="v877-club-home devil-card">
            <div className="v8-panel-title"><Shield size={18}/> Z KLUBU <span>DELTA SYNC</span></div>
            {clubUpdates.length>0?<>
              <div className="v877-club-home-list">
                {clubUpdates.slice(0,3).map(item=><button type="button" key={item.id} onClick={()=>{setTab("club");setFocusedClubKey(item.source_key);window.setTimeout(()=>document.getElementById(`club-update-${item.source_key}`)?.scrollIntoView({behavior:"smooth",block:"center"}),250)}}>
                  <span>{new Date(item.published_at).toLocaleDateString("pl-PL")}</span>
                  <b>{item.title}</b>
                  <ChevronRight size={14}/>
                </button>)}
              </div>
              <button className="v877-club-all" type="button" onClick={()=>setTab("club")}>WSZYSTKIE INFORMACJE Z KLUBU <ChevronRight size={14}/></button>
            </>:<div className="v877-club-home-empty"><Shield size={24}/><div><b>DELTA Sync</b><span>Uruchom synchronizację w panelu Admin.</span></div></div>}
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

      {tab==="matches"&&<section className="section v8-section-page"><div className="section-title"><h2>Mecze</h2></div><div className="list">{matches.map(m=><article className="match-row devil-card" key={m.id}><div className="teamline"><Logo team={m.home_team} size={38}/><strong>{m.home_team}</strong></div><div className="score">{m.status==="played"?`${m.home_score}:${m.away_score}`:"–:–"}</div><div className="teamline right"><strong>{m.away_team}</strong><Logo team={m.away_team} size={38}/></div><div className="match-meta">{datePL(m.match_date)} {m.match_time||""} • {m.venue||"—"}</div><div className="match-actions-row"><button className="open-match-btn" onClick={()=>openMatch(m,"summary")}>{staff?"EDYTUJ MECZ / CENTRUM MECZU":"SZCZEGÓŁY MECZU"}</button></div></article>)}</div></section>}

      {tab==="calendar"&&<section className="section v8-section-page v891-calendar-page">
        <div className="v891-calendar-hero devil-card">
          <div>
            <span className="eyebrow gold">DELTA 2018 GM • PLAN DRUŻYNY</span>
            <h2>Kalendarz drużyny</h2>
            <p>Mecze, treningi, turnieje, urodziny i ważne informacje w jednym miejscu.</p>
          </div>
          <div className="v891-calendar-next">
            <span>NAJBLIŻSZE</span>
            <b>{nextTeamEvent?.title||"Brak wydarzeń"}</b>
            <strong>{teamClockCountdown}</strong>
          </div>
        </div>

        <div className="v891-calendar-grid">
          {(()=>{
            const items=[
              ...matches.filter(m=>m.status==="scheduled").map(m=>({
                id:`match-${m.id}`,kind:"match",date:m.match_date,time:m.match_time||"",title:`Mecz • ${recentOpponent(m)}`,
                location:m.venue||"",details:`${m.home_team} — ${m.away_team}`,important:true,match:m
              })),
              ...teamEvents.map(e=>({
                id:e.id,kind:e.event_type,date:e.event_date,time:e.start_time?.slice(0,5)||"",title:e.title,
                location:e.location||"",details:e.details||"",important:e.important,match:null as Match|null
              }))
            ].sort((a,b)=>`${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
            return items.length?items.map(item=><article key={item.id} className={`v891-calendar-event devil-card type-${item.kind} ${item.important?"important":""}`}>
              <div className="v891-event-date">
                <b>{new Date(`${item.date}T12:00:00`).toLocaleDateString("pl-PL",{day:"2-digit"})}</b>
                <span>{new Date(`${item.date}T12:00:00`).toLocaleDateString("pl-PL",{month:"short"}).replace(".","").toUpperCase()}</span>
              </div>
              <div className="v891-event-main">
                <span className="v891-event-type">{item.kind==="match"?"MECZ":item.kind==="training"?"TRENING":item.kind==="birthday"?"URODZINY":item.kind==="tournament"?"TURNIEJ":"WYDARZENIE"}</span>
                <h3>{item.title}</h3>
                <p>{[item.time,item.location].filter(Boolean).join(" • ")||"Szczegóły do ustalenia"}</p>
                {item.details&&<small>{item.details}</small>}
              </div>
              {item.match?<button onClick={()=>openMatch(item.match!,"summary")}>CENTRUM MECZU <ChevronRight size={13}/></button>:null}
            </article>):<div className="v891-calendar-empty devil-card"><CalendarDays size={34}/><h3>Kalendarz jest pusty</h3><p>Administrator może zaplanować treningi, turnieje, urodziny i inne wydarzenia.</p></div>
          })()}
        </div>
      </section>}

      {tab==="players"&&<section className="section v8-section-page v87-players-page v871-team-page">
        <div className="v871-team-hero devil-card">
          <div className="v871-team-hero-overlay"/>
          <div className="v871-team-crest"><img src="/teamlogos/gm.png" alt="DELTA 2018 GM"/></div>
          <div className="v871-team-copy">
            <span className="eyebrow gold">GÓRNY MOKOTÓW • TEAM HUB</span>
            <h2>DELTA <span>2018</span> GM</h2>
            <p>Diabełki z Mokotowa • jedna drużyna, wspólna historia.</p>
            <div className="v871-team-pills">
              <span><Users size={14}/>{players.length} zawodników</span>
              <span><Goal size={14}/>{teamSummary.goals} bramek</span>
              <span><Star size={14}/>{teamSummary.assists} asyst</span>
              <span><Trophy size={14}/>{teamSummary.wins} zwycięstw</span>
            </div>
          </div>
        </div>

        <div className="v871-team-dashboard">
          <article className="v871-team-leader devil-card">
            <div className="v8-panel-title"><Crown size={18}/> LIDER KAPITAŃSKI</div>
            {captainLeader?<button onClick={()=>setSelectedPlayer(captainLeader)}>
              <div className="v871-team-leader-photo"><span className="v873-flares"/><span className="v873-embers"/><span className="v873-corner tl"/><span className="v873-corner tr"/><span className="v873-plate">CAPTAIN</span>{isRyszardPlayer(captainLeader)?
      <img src="/assets/ryszard-player-card.png" alt={captainLeader.display_name} className="v884-leader-featured-img"/>:
      <PlayerPhoto playerId={captainLeader.id}/>
    }</div>
              <div><span>DELTA 2018 GM</span><b>{captainLeader.display_name}</b><small>{stats[captainLeader.id]?.captain||0} × kapitan</small></div>
              <ChevronRight size={16}/>
            </button>:<p className="muted">Brak danych.</p>}
          </article>

          <article className="v871-team-leader devil-card v876-clickable-leader" role="button" tabIndex={0}
            onClick={()=>topScorer&&stats[topScorer.id]?.g>0&&setSelectedPlayer(topScorer)}
            onKeyDown={e=>{if((e.key==="Enter"||e.key===" ")&&topScorer&&stats[topScorer.id]?.g>0)setSelectedPlayer(topScorer)}}>
            <div className="v8-panel-title"><Goal size={18}/> NAJLEPSZY STRZELEC</div>
            {topScorer&&stats[topScorer.id]?.g>0?<button type="button" onClick={e=>{e.stopPropagation();setSelectedPlayer(topScorer)}}>
              <div className="v871-team-leader-photo"><span className="v873-flares"/><span className="v873-embers"/><span className="v873-corner tl"/><span className="v873-corner tr"/><span className="v873-plate">TOP SCORER</span>{isRyszardPlayer(topScorer)?
      <img src="/assets/ryszard-player-card.png" alt={topScorer.display_name} className="v884-leader-featured-img"/>:
      <PlayerPhoto playerId={topScorer.id}/>
    }</div>
              <div><span>DELTA 2018 GM</span><b>{topScorer.display_name}</b><small>{stats[topScorer.id]?.g||0} goli</small></div>
              <ChevronRight size={16}/>
            </button>:<p className="muted">Pierwszy lider strzelców jeszcze przed nami.</p>}
          </article>

          <article className="v871-team-leader devil-card v876-clickable-leader" role="button" tabIndex={0}
            onClick={()=>topAssister&&stats[topAssister.id]?.a>0&&setSelectedPlayer(topAssister)}
            onKeyDown={e=>{if((e.key==="Enter"||e.key===" ")&&topAssister&&stats[topAssister.id]?.a>0)setSelectedPlayer(topAssister)}}>
            <div className="v8-panel-title"><Star size={18}/> LIDER ASYST</div>
            {topAssister&&stats[topAssister.id]?.a>0?<button type="button" onClick={e=>{e.stopPropagation();setSelectedPlayer(topAssister)}}>
              <div className="v871-team-leader-photo"><span className="v873-flares"/><span className="v873-embers"/><span className="v873-corner tl"/><span className="v873-corner tr"/><span className="v873-plate">TOP ASSIST</span>{isRyszardPlayer(topAssister)?
      <img src="/assets/ryszard-player-card.png" alt={topAssister.display_name} className="v884-leader-featured-img"/>:
      <PlayerPhoto playerId={topAssister.id}/>
    }</div>
              <div><span>DELTA 2018 GM</span><b>{topAssister.display_name}</b><small>{stats[topAssister.id]?.a||0} asyst</small></div>
              <ChevronRight size={16}/>
            </button>:<p className="muted">Pierwsza asysta uruchomi ranking.</p>}
          </article>

          <article className="v871-team-form devil-card">
            <div className="v8-panel-title"><TrendingUp size={18}/> FORMA DRUŻYNY</div>
            <div className="v871-team-form-dots">
              {recentMatches.map(m=><i key={m.id} className={`form-${recentResult(m).toLowerCase()}`}>{recentResult(m)}</i>)}
              {recentMatches.length===0&&<span>Brak rozegranych meczów</span>}
            </div>
            <small>{currentWinStreak>0?`${currentWinStreak} zwycięstw z rzędu`:currentUnbeatenStreak>0?`${currentUnbeatenStreak} mecz(e) bez porażki`:"Nowa seria czeka"}</small>
          </article>
        </div>

        <div className="v871-roster-title">
          <div><span className="eyebrow gold">KADRA</span><h2>Zawodnicy</h2></div>
          <span>{players.length} kart zawodników</span>
        </div>

        <div className="v87-player-grid">{players.map(p=>{
          const s=stats[p.id]||{m:0,starts:0,captain:0,g:0,a:0,mvp:0};
          const achievements=unlockedCount(p);
          return <article className="v87-player-card" key={p.id} onClick={()=>setSelectedPlayer(p)}>
            <div className="v87-player-card-bg"/>
            <div className="v87-player-top">
              <span className="v874-club-mark"><img src="/teamlogos/gm.png" alt=""/></span>
              <span className="v87-player-position">{p.position||"ZAWODNIK"}</span>
            </div>
            {isRyszardPlayer(p)?
              <div className="v874-featured-card-image"><img src="/assets/players/ryszard-card.png" alt={`Karta zawodnika ${p.display_name}`}/><span className="v874-featured-badge">FEATURED PLAYER</span></div>
              :<div className={`v87-player-photo ${isRyszardPlayer(p)?"v883-home-featured-media":""}`}>
              {isRyszardPlayer(p)
                ? <img src="/assets/ryszard-player-card.png" alt={p.display_name} className="v883-home-featured-img"/>
                : <PlayerPhoto playerId={p.id}/>
              }
            </div>}
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

      {tab==="stats"&&<section className="section v8-section-page v890-stats-center">
        <div className="v890-stats-hero devil-card">
          <div className="v890-stats-hero-bg"/>
          <div className="v890-stats-copy">
            <span className="eyebrow gold">DELTA 2018 GM • DATA STUDIO</span>
            <h2>CENTRUM <span>STATYSTYK</span></h2>
            <p>Sezon 2026/27 • liczby, liderzy, rekordy i forma drużyny w jednym miejscu.</p>
          </div>
          <div className="v890-stats-hero-metrics">
            <div><strong>{teamSummary.played}</strong><span>MECZE</span></div>
            <div><strong>{teamSummary.goals}</strong><span>GOLE</span></div>
            <div><strong>{teamSummary.assists}</strong><span>ASYSTY</span></div>
            <div><strong>{winRate}%</strong><span>WYGRANE</span></div>
          </div>
          <div className="v890-form-strip">
            <span>FORMA</span>
            <div>{recentMatches.length?recentMatches.map(m=><i key={m.id} className={`form-${recentResult(m).toLowerCase()}`}>{recentResult(m)}</i>):<em>—</em>}</div>
          </div>
        </div>

        <div className="v890-kpi-grid">
          <article className="v890-kpi devil-card"><Goal size={22}/><span>ŚREDNIA GOLI / MECZ</span><b>{goalsPerMatch.toFixed(1)}</b></article>
          <article className="v890-kpi devil-card"><Star size={22}/><span>ŚREDNIA ASYST / MECZ</span><b>{assistsPerMatch.toFixed(1)}</b></article>
          <article className="v890-kpi devil-card"><Users size={22}/><span>ZAWODNICY Z GOLEM</span><b>{playersWithGoal}</b></article>
          <article className="v890-kpi devil-card"><Zap size={22}/><span>ZAWODNICY Z ASYSTĄ</span><b>{playersWithAssist}</b></article>
        </div>

        <div className="v890-main-grid">
          <article className="v890-podium devil-card">
            <div className="v8-panel-title"><Trophy size={18}/> PODIUM SEZONU <span>G+A</span></div>
            <div className="v890-podium-stage">
              {statsRanking.slice(0,3).map((p,index)=>{
                const s=stats[p.id]||{m:0,starts:0,captain:0,g:0,a:0,mvp:0};
                const order=index===0?1:index===1?2:3;
                return <button key={p.id} className={`v890-podium-player place-${order}`} onClick={()=>setSelectedPlayer(p)}>
                  <span className="v890-podium-rank">{order}</span>
                  <div className="v890-podium-photo">
                    {isRyszardPlayer(p)?<img src="/assets/ryszard-player-card.png" alt={p.display_name}/>:<PlayerPhoto playerId={p.id}/>}
                  </div>
                  <b>{p.display_name}</b>
                  <strong>{s.g+s.a}</strong>
                  <small>{s.g}G • {s.a}A</small>
                </button>
              })}
            </div>
          </article>

          <article className="v890-records devil-card">
            <div className="v8-panel-title"><Award size={18}/> REKORDY SEZONU</div>
            <div className="v890-record-list">
              <div><span>Najwięcej G+A</span><b>{topGA?topGA.display_name:"—"}</b><strong>{topGA?(stats[topGA.id]?.g||0)+(stats[topGA.id]?.a||0):0}</strong></div>
              <div><span>Najwięcej MVP</span><b>{topMvp&&stats[topMvp.id]?.mvp>0?topMvp.display_name:"—"}</b><strong>{topMvp?stats[topMvp.id]?.mvp||0:0}</strong></div>
              <div><span>Najwięcej razy kapitan</span><b>{captainLeader&&stats[captainLeader.id]?.captain>0?captainLeader.display_name:"—"}</b><strong>{captainLeader?stats[captainLeader.id]?.captain||0:0}</strong></div>
              <div><span>Największe zwycięstwo</span><b>{biggestWin?recentOpponent(biggestWin.match):"—"}</b><strong>{biggestWin?`${biggestWin.ours}:${biggestWin.opp}`:"—"}</strong></div>
              <div><span>Najwięcej goli w meczu</span><b>{highestScoringMatch?recentOpponent(highestScoringMatch.match):"—"}</b><strong>{highestScoringMatch?highestScoringMatch.ours:0}</strong></div>
              <div><span>Seria zwycięstw</span><b>DELTA 2018 GM</b><strong>{currentWinStreak}</strong></div>
            </div>
          </article>
        </div>

        <article className="v890-ranking-hub devil-card">
          <div className="v890-ranking-head">
            <div>
              <span className="eyebrow gold">RANKING ZAWODNIKÓW</span>
              <h3>{statsMetricLabel}</h3>
            </div>
            <div className="v890-metric-tabs">
              {[
                ["ga","G+A"],["goals","Gole"],["assists","Asysty"],["mvp","MVP"],["matches","Mecze"],["captain","Kapitan"]
              ].map(([id,label])=><button key={id} className={statsMetric===id?"active":""} onClick={()=>setStatsMetric(id as any)}>{label}</button>)}
            </div>
          </div>

          <div className="v890-ranking-table">
            {statsRanking.map((p,index)=>{
              const s=stats[p.id]||{m:0,starts:0,captain:0,g:0,a:0,mvp:0};
              const value=statsMetricValue(p);
              const maxValue=Math.max(1,...statsRanking.map(statsMetricValue));
              return <button key={p.id} className="v890-ranking-entry" onClick={()=>setSelectedPlayer(p)}>
                <span className={`v890-pos p-${index+1}`}>{index+1}</span>
                <span className="v890-entry-photo">
                  {isRyszardPlayer(p)?<img src="/assets/ryszard-player-card.png" alt={p.display_name}/>:<PlayerPhoto playerId={p.id}/>}
                </span>
                <span className="v890-entry-name"><b>{p.display_name}</b><small>{s.m} mecze • {s.starts} start</small></span>
                <span className="v890-entry-bar"><i style={{width:`${Math.max(4,(value/maxValue)*100)}%`}}/></span>
                <strong>{value}</strong>
                <ChevronRight size={15}/>
              </button>
            })}
          </div>
        </article>

        <div className="v890-compare-record-grid">
          <article className="v890-compare devil-card">
            <div className="v8-panel-title"><Users size={18}/> PORÓWNAJ ZAWODNIKÓW</div>
            <div className="v890-compare-selects">
              <select value={comparePlayerA?.id||""} onChange={e=>setCompareA(e.target.value)}>
                {players.map(p=><option value={p.id} key={p.id}>{p.display_name}</option>)}
              </select>
              <span>VS</span>
              <select value={comparePlayerB?.id||""} onChange={e=>setCompareB(e.target.value)}>
                {players.map(p=><option value={p.id} key={p.id}>{p.display_name}</option>)}
              </select>
            </div>

            {comparePlayerA&&comparePlayerB&&<div className="v890-compare-board">
              {[["GOLE","g"],["ASYSTY","a"],["G+A","ga"],["MECZE","m"],["STARTY","starts"],["MVP","mvp"],["KAPITAN","captain"]].map(([label,key])=>{
                const sa=stats[comparePlayerA.id]||{m:0,starts:0,captain:0,g:0,a:0,mvp:0};
                const sb=stats[comparePlayerB.id]||{m:0,starts:0,captain:0,g:0,a:0,mvp:0};
                const va=key==="ga"?sa.g+sa.a:(sa as any)[key];
                const vb=key==="ga"?sb.g+sb.a:(sb as any)[key];
                const max=(statMax as any)[key]||1;
                return <div className="v890-compare-row" key={key}>
                  <span className="left"><b>{va}</b><i style={{width:`${(va/max)*100}%`}}/></span>
                  <small>{label}</small>
                  <span className="right"><i style={{width:`${(vb/max)*100}%`}}/><b>{vb}</b></span>
                </div>
              })}
            </div>}

            <div className="v890-compare-names">
              <button onClick={()=>comparePlayerA&&setSelectedPlayer(comparePlayerA)}>{comparePlayerA?.display_name||"—"}</button>
              <button onClick={()=>comparePlayerB&&setSelectedPlayer(comparePlayerB)}>{comparePlayerB?.display_name||"—"}</button>
            </div>
          </article>

          <article className="v890-team-form devil-card">
            <div className="v8-panel-title"><TrendingUp size={18}/> FORMA DRUŻYNY</div>
            <div className="v890-form-timeline">
              {recentMatches.length?recentMatches.map(m=>{
                const result=recentResult(m);
                const ours=m.home_team===CLUB?(m.home_score??0):(m.away_score??0);
                const opp=m.home_team===CLUB?(m.away_score??0):(m.home_score??0);
                return <button key={m.id} onClick={()=>setSelectedMatch(m)}>
                  <span className={`result result-${result.toLowerCase()}`}>{result}</span>
                  <div><b>{recentOpponent(m)}</b><small>{datePL(m.match_date)}</small></div>
                  <strong>{ours}:{opp}</strong>
                </button>
              }):<p className="muted">Pierwsze wyniki pojawią się tutaj po rozegranym meczu.</p>}
            </div>
            <div className="v890-streaks">
              <div><span>Bez porażki</span><b>{currentUnbeatenStreak}</b></div>
              <div><span>Zwycięstwa z rzędu</span><b>{currentWinStreak}</b></div>
              <div><span>Bilans bramek</span><b>{teamSummary.goals}</b></div>
            </div>
          </article>
        </div>
      </section>}

      {tab==="achievements"&&<section className="section v8-section-page"><div className="section-title"><h2>Osiągnięcia</h2></div><div className="achievement-grid">{[["Start sezonu",teamSummary.played>=1,teamSummary.played,1],["3 zwycięstwa",teamSummary.wins>=3,teamSummary.wins,3],["10 bramek",teamSummary.goals>=10,teamSummary.goals,10],["25 bramek",teamSummary.goals>=25,teamSummary.goals,25],["50 bramek",teamSummary.goals>=50,teamSummary.goals,50],["10 asyst",teamSummary.assists>=10,teamSummary.assists,10]].map(([name,ok,current,target])=><div className={`achievement devil-card ${ok?"unlocked":""}`} key={name as string}><Trophy size={24}/><h3>{name}</h3><p>{ok?"ZDOBYTE":`${current}/${target}`}</p></div>)}</div></section>}

      {tab==="chronicle"&&<section className="section v8-section-page"><div className="section-title"><h2>Kronika sezonu</h2></div><div className="list">{matches.filter(m=>m.status==="played").slice().reverse().map(m=>{const matchEvents=events.filter(e=>e.match_id===m.id);const starters=lineup.filter(l=>l.match_id===m.id&&l.is_starter).map(l=>players.find(p=>p.id===l.player_id)?.display_name).filter(Boolean);const captain=lineup.find(l=>l.match_id===m.id&&l.is_captain);const captainName=players.find(p=>p.id===captain?.player_id)?.display_name;return <article className="chronicle-card devil-card" key={m.id}><div className="chronicle-head"><span>Kolejka {m.round_no||"—"}</span><span>{datePL(m.match_date)}</span></div><div className="chronicle-score"><span>{m.home_team}</span><b>{m.home_score}:{m.away_score}</b><span>{m.away_team}</span></div><div className="chronicle-columns"><div><h4>Bramki i asysty</h4>{matchEvents.filter(e=>e.event_type==="goal").map(e=>{const scorer=players.find(p=>p.id===e.player_id)?.display_name||"?";const assist=players.find(p=>p.id===e.assist_player_id)?.display_name;return <p key={e.id}>{scorer}{assist?` • asysta ${assist}`:""}</p>})}</div><div><h4>Kadra</h4><p>Kapitan: {captainName||"—"}</p><p>Wyjściowa 6: {starters.join(", ")||"—"}</p></div><div><h4>MVP</h4><p>{players.find(p=>p.id===matchEvents.find(e=>e.event_type==="mvp")?.player_id)?.display_name||"—"}</p></div></div></article>})}</div></section>}

      {tab==="club"&&<section className="section v8-section-page v876-club-page">
        <div className="v876-club-hero devil-card">
          <div>
            <span className="eyebrow gold">OFICJALNE INFORMACJE</span>
            <h2>Z klubu</h2>
            <p>Aktualności pobierane automatycznie z oficjalnej strony K.S. Delta Warszawa.</p>
          </div>
          <div className="v879-club-actions">
            <button type="button" className="v879-push-btn" onClick={enableClubPush} disabled={pushState==="working"||pushState==="enabled"}>
              <Bell size={17}/>
              {pushState==="working"?"Włączanie…":pushState==="enabled"?"Powiadomienia włączone":"Włącz powiadomienia na tym urządzeniu"}
            </button>
            {pushMessage&&<span className={pushState==="enabled"?"v880-push-ok":"v879-push-error"}>{pushMessage}</span>}
            <button type="button" className="v882-repair-push" disabled={pushState==="working"} onClick={repairClubPush}>
              NAPRAW / ZAPISZ TELEFON PONOWNIE
            </button>
          </div>
          <div className="v876-sync-status">
            <Shield size={22}/>
            <div><b>DELTA Sync</b><span>{clubUpdates[0]?.synced_at?`Ostatnia synchronizacja ${new Date(clubUpdates[0].synced_at).toLocaleString("pl-PL")}`:"Oczekiwanie na pierwszą synchronizację"}</span></div>
          </div>
        </div>

        <div className="v876-club-feed" id="club-feed-top">
          {clubUpdates.length===0&&<article className="v876-club-empty devil-card">
            <Shield size={32}/><h3>Brak zsynchronizowanych wiadomości</h3><p>Po uruchomieniu DELTA Sync informacje z klubu pojawią się tutaj automatycznie.</p>
          </article>}
          {clubUpdates.map(item=><article id={`club-update-${item.source_key}`} className={`v876-club-card devil-card ${focusedClubKey===item.source_key?"v881-club-focus":""}`} key={item.id}>
            <div className="v876-club-meta">
              <span>K.S. DELTA WARSZAWA</span>
              <time>{new Date(item.published_at).toLocaleDateString("pl-PL")}</time>
            </div>
            {item.title.includes("2018 Górny Mokotów")&&<div className="v878-direct-badge">2018 GÓRNY MOKOTÓW</div>}
            <h3>{item.title}</h3>
            {item.body&&<p>{item.body}</p>}
            <a href={item.source_url} target="_blank" rel="noreferrer">ŹRÓDŁO: DELTA.WARSZAWA.PL <ChevronRight size={13}/></a>
          </article>)}
        </div>
      </section>}

      {tab==="news"&&<section className="section v8-section-page"><div className="section-title"><h2>Aktualności</h2>{staff&&<button className="btn gold-btn" onClick={saveNewsItem}>Dodaj aktualność</button>}</div><div className="news-grid">{news.map(n=><article className="news-card devil-card" key={n.id}><span className="tag">{n.type}</span><h3>{n.title}</h3><p>{n.body}</p><small>{new Date(n.published_at).toLocaleString("pl-PL")}</small></article>)}</div></section>}
    </main>

    <nav className="bottom-nav v8-bottom-nav">{navItems.map(([id,label,Icon])=><button key={id} className={tab===id?"active":""} onClick={()=>setTab(id as any)}><Icon size={18}/><span>{label}</span></button>)}</nav>

    {selectedPlayer&&<div className="modal-backdrop" onClick={()=>setSelectedPlayer(null)}><div className={`modal-sheet devil-card ${isRyszardPlayer(selectedPlayer)?"v874-featured-profile-sheet":""}`} onClick={e=>e.stopPropagation()}><button className="close" onClick={()=>setSelectedPlayer(null)}>×</button>
      {isRyszardPlayer(selectedPlayer)&&<div className="v874-profile-hero"><img src="/assets/players/ryszard-hero.png" alt={`Profil ${selectedPlayer.display_name}`}/><div className="v874-profile-hero-shade"/><div className="v874-profile-hero-label"><img src="/teamlogos/gm.png" alt=""/><div><span>DELTA 2018 GM</span><b>{selectedPlayer.display_name}</b></div></div></div>}
      <div className={`premium-profile ${isRyszardPlayer(selectedPlayer)?"v874-profile-stats-layout":""}`}>
        {!isRyszardPlayer(selectedPlayer)&&<div className="premium-photo"><span className="v873-flares"/><span className="v873-embers"/><span className="v873-corner tl"/><span className="v873-corner tr"/><span className="v873-corner bl"/><span className="v873-corner br"/><span className="v873-plate">PLAYER PROFILE</span><PlayerPhoto playerId={selectedPlayer.id} className="premium-photo-img"/></div>}
        <div className="premium-info"><span className="eyebrow gold">PREMIUM PLAYER PROFILE</span><h2>{selectedPlayer.display_name}</h2><p>{selectedPlayer.position||"Zawodnik"}</p>{(()=>{const s=stats[selectedPlayer.id]||{m:0,starts:0,captain:0,g:0,a:0,mvp:0};return <div className="profile-stats"><div><b>{s.m}</b><span>Mecze</span></div><div><b>{s.starts}</b><span>Wyjściowa 6</span></div><div><b>{s.captain}</b><span>Kapitan</span></div><div><b>{s.g}</b><span>Gole</span></div><div><b>{s.a}</b><span>Asysty</span></div><div><b>{s.g+s.a}</b><span>G+A</span></div><div><b>{s.mvp}</b><span>MVP</span></div></div>})()}</div>
      </div><h3>Osiągnięcia zawodnika</h3><div className="achievement-grid">{playerAchievements(selectedPlayer).map(([name,ok,progress])=><div key={name as string} className={`achievement ${ok?"unlocked":""}`}><Star size={20}/><h3>{name}</h3><p>{ok?"ZDOBYTE":progress}</p></div>)}</div></div></div>}

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
