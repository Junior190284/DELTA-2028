"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import PlayerPhoto from "./PlayerPhoto";
import MatchGallery from "./MatchGallery";
import MatchCenterModal from "./MatchCenterModal";
import StadiumFX from "./StadiumFX";
import { MyChildCenter, MatchDayMode, HallOfFame } from "./MegaPanels";
import type { UserPermissions } from "@/lib/permissions";
import { hasDelegatedAccess } from "@/lib/permissions";
import { PushSetupError, subscribeToPush, resetPushSubscription } from "@/lib/push";
import { decodeHtmlEntities } from "@/lib/text";
import {
  Bell, CalendarDays, Trophy, Users, Newspaper, History, Shield, Star,
  Check, X, Crown, Target, ChevronLeft, ChevronRight, Flame, Award, UserCheck, Goal, Home, UserRound, TrendingUp, Medal, Zap, List, Grid3X3
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
type TrainingSession={id:string;training_date:string;start_time:string|null;end_time:string|null;location:string|null;title:string;notes:string|null;created_at:string};
type TrainingAttendance={training_id:string;player_id:string;status:string};
type TrainingGame={id:string;training_id:string;team_a_name:string;team_b_name:string;team_a_score:number;team_b_score:number;created_at:string};
type TrainingGamePlayer={game_id:string;player_id:string;team:"A"|"B"|string};
type TrainingEvent={id:string;game_id:string;event_type:string;player_id:string|null;assist_player_id:string|null;created_at:string};
type MatchMedia={id:string;match_id:string;storage_path:string;caption:string|null;created_at:string};
type CalendarItem={id:string;kind:string;date:string;time:string;title:string;location:string;details:string;important:boolean;match:Match|null};

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

function calendarKindLabel(kind:string){
  return ({
    match:"MECZ",training:"TRENING",meeting:"ZBIÓRKA",gathering:"ZBIÓRKA",
    tournament:"TURNIEJ",birthday:"URODZINY",info:"WAŻNE",club:"KLUBOWE"
  } as Record<string,string>)[kind]||"WYDARZENIE";
}


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

function seasonLabel(date?:string){
  const value=date?new Date(`${date}T12:00:00`):new Date();
  const start=value.getMonth()>=6?value.getFullYear():value.getFullYear()-1;
  return `${start}/${String(start+1).slice(-2)}`;
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
  initialTrainingSessions:TrainingSession[];
  initialTrainingAttendance:TrainingAttendance[];
  initialTrainingGames:TrainingGame[];
  initialTrainingGamePlayers:TrainingGamePlayer[];
  initialTrainingEvents:TrainingEvent[];
  initialMatchMedia:MatchMedia[];
  parentPlayerIds:string[];
  userPermissions:UserPermissions;
}){
  const supabase=createClient();
  const [tab,setTab]=useState<"home"|"mychild"|"matchday"|"matches"|"calendar"|"training"|"players"|"stats"|"hall"|"achievements"|"chronicle"|"news"|"club">("home");
  const [viewFx,setViewFx]=useState(false);
  const [players,setPlayers]=useState(props.initialPlayers);
  const [matches,setMatches]=useState(props.initialMatches);
  const [attendance,setAttendance]=useState(props.initialAttendance);
  const [lineup,setLineup]=useState(props.initialLineup);
  const [events,setEvents]=useState(props.initialEvents);
  const [news,setNews]=useState(props.initialNews);
  const [clubUpdates,setClubUpdates]=useState(props.initialClubUpdates);
  const [teamEvents,setTeamEvents]=useState(props.initialTeamEvents);
  const [trainingSessions,setTrainingSessions]=useState(props.initialTrainingSessions);
  const [trainingAttendance,setTrainingAttendance]=useState(props.initialTrainingAttendance);
  const [trainingGames,setTrainingGames]=useState(props.initialTrainingGames);
  const [trainingGamePlayers,setTrainingGamePlayers]=useState(props.initialTrainingGamePlayers);
  const [trainingEvents,setTrainingEvents]=useState(props.initialTrainingEvents);
  const [matchMedia]=useState(props.initialMatchMedia);
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
  const [calendarView,setCalendarView]=useState<"month"|"list">("month");
  const [calendarMonth,setCalendarMonth]=useState(()=>new Date(new Date().getFullYear(),new Date().getMonth(),1));


  useEffect(()=>{
    setViewFx(true);
    const timer=window.setTimeout(()=>setViewFx(false),520);
    return ()=>window.clearTimeout(timer);
  },[tab]);

  useEffect(()=>{
    const tick=window.setInterval(()=>setNow(new Date()),30000);
    return ()=>window.clearInterval(tick);
  },[]);
  const staff=props.profile.role==="admin"||props.profile.role==="coach";
  const canManageMatches=staff||props.userPermissions.can_manage_matches;
  const canEditMatchEvents=canManageMatches||props.userPermissions.can_edit_match_events;
  const canManageTraining=staff||props.userPermissions.can_manage_training;
  const canManageTrainingAttendance=canManageTraining||props.userPermissions.can_manage_training_attendance;
  const canOpenAdmin=staff||hasDelegatedAccess(props.userPermissions);

  useEffect(()=>{
    setPlayers(props.initialPlayers);setMatches(props.initialMatches);setAttendance(props.initialAttendance);
    setLineup(props.initialLineup);setEvents(props.initialEvents);setNews(props.initialNews);setClubUpdates(props.initialClubUpdates);setTeamEvents(props.initialTeamEvents);
    setTrainingSessions(props.initialTrainingSessions);setTrainingAttendance(props.initialTrainingAttendance);
    setTrainingGames(props.initialTrainingGames);setTrainingGamePlayers(props.initialTrainingGamePlayers);setTrainingEvents(props.initialTrainingEvents);
  },[props.initialPlayers,props.initialMatches,props.initialAttendance,props.initialLineup,props.initialEvents,props.initialNews,props.initialClubUpdates,props.initialTeamEvents,props.initialTrainingSessions,props.initialTrainingAttendance,props.initialTrainingGames,props.initialTrainingGamePlayers,props.initialTrainingEvents]);

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
    const view=params.get("view");
    if(view==="club"){
      const key=params.get("club");
      setTab("club");
      if(key)setFocusedClubKey(key);
      window.setTimeout(()=>{
        const el=key?document.getElementById(`club-update-${key}`):document.getElementById("club-feed-top");
        el?.scrollIntoView({behavior:"smooth",block:"center"});
      },350);
    }else if(view==="matchday"&&(canManageMatches||canEditMatchEvents)){
      setTab("matchday");
    }else if(view==="training"){
      setTab("training");
    }else if(view==="calendar"){
      setTab("calendar");
    }else if(view==="mychild"&&props.parentPlayerIds.length){
      setTab("mychild");
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
  const currentSeason=seasonLabel(nextMatch?.match_date||matches[0]?.match_date);
  const nextMatchAt=nextMatch?parseLocalMatchDate(nextMatch.match_date,nextMatch.match_time):null;
  const isMatchDay=nextMatch?(()=>{
    const ms=new Date(`${nextMatch.match_date}T${(nextMatch.match_time||"12:00").slice(0,5)}:00`).getTime()-Date.now();
    return ms>=-3*60*60*1000&&ms<=24*60*60*1000;
  })():false;
  const nextMatchCountdown=nextMatchAt?formatCountdown(nextMatchAt.getTime()-now.getTime()):"—";
  const nextTraining=trainingSessions
    .map(session=>{
      const start=parseLocalMatchDate(session.training_date,session.start_time||"17:00");
      const end=session.end_time
        ? parseLocalMatchDate(session.training_date,session.end_time)
        : new Date(start.getTime()+90*60*1000);
      return {session,start,end,isLive:now>=start&&now<end};
    })
    .filter(item=>item.end.getTime()>=now.getTime())
    .sort((a,b)=>a.start.getTime()-b.start.getTime())[0]||null;
  const nextTrainingLabel=nextTraining
    ? [
        nextTraining.start.toLocaleDateString("pl-PL",{weekday:"long",day:"2-digit",month:"2-digit"}),
        `${nextTraining.start.toLocaleTimeString("pl-PL",{hour:"2-digit",minute:"2-digit"})}–${nextTraining.end.toLocaleTimeString("pl-PL",{hour:"2-digit",minute:"2-digit"})}`,
        nextTraining.session.location
      ].filter(Boolean).join(" • ")
    : "";

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
      title:`Mecz • ${nextMatch?(nextMatch.home_team===CLUB?nextMatch.away_team:nextMatch.home_team):""}`,
      subtitle:nextMatch?`${datePL(nextMatch.match_date)} • ${nextMatch.match_time||"godzina do ustalenia"}`:"",
      at:nextMatchAt
    }]:[]),
    ...(nextTraining?[{
      kind:"training",
      title:nextTraining.isLive?`${nextTraining.session.title||"Trening"} trwa`:nextTraining.session.title||"Trening drużyny",
      subtitle:nextTrainingLabel,
      at:nextTraining.isLive?now:nextTraining.start
    }]:[]),
    ...futureTeamEvents.map(e=>({
      kind:e.event_type,
      title:e.title,
      subtitle:[e.event_date,e.start_time?.slice(0,5),e.location].filter(Boolean).join(" • "),
      at:e.at,
      important:e.important
    }))
  ].sort((a,b)=>a.at.getTime()-b.at.getTime());

  const homeAgendaItems=smartCandidates.filter(item=>item.kind!=="match").slice(0,3);
  const nextTeamEvent=homeAgendaItems[0]||smartCandidates[0]||null;
  const teamClockCountdown=nextTeamEvent?formatCountdown(nextTeamEvent.at.getTime()-now.getTime()):"Brak wydarzeń";
  const isTeamLive=!!nextTeamEvent&&nextTeamEvent.at.getTime()-now.getTime()<=30*60*1000&&nextTeamEvent.at.getTime()-now.getTime()>=-2*60*60*1000;
  const importantTeamEvent=futureTeamEvents.find(e=>e.important)||futureTeamEvents.find(e=>e.event_type==="birthday")||null;
  const calendarItems=useMemo<CalendarItem[]>(()=>[
    ...matches.filter(m=>m.status!=="cancelled").map(m=>({
      id:`match-${m.id}`,kind:"match",date:m.match_date,time:m.match_time?.slice(0,5)||"",title:`Mecz • ${m.home_team===CLUB?m.away_team:m.home_team}`,
      location:m.venue||"",details:`${m.home_team} — ${m.away_team}`,important:m.status==="scheduled",match:m
    })),
    ...trainingSessions.map(session=>({
      id:`training-${session.id}`,kind:"training",date:session.training_date,time:session.start_time?.slice(0,5)||"",title:session.title||"Trening",
      location:session.location||"",details:session.notes||"",important:false,match:null
    })),
    ...teamEvents.map(event=>({
      id:`event-${event.id}`,kind:event.event_type,date:event.event_date,time:event.start_time?.slice(0,5)||"",title:event.title,
      location:event.location||"",details:event.details||"",important:event.important,match:null
    }))
  ].sort((a,b)=>`${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)),[matches,trainingSessions,teamEvents]);
  const calendarDays=useMemo(()=>{
    const first=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth(),1);
    const gridStart=new Date(first);
    gridStart.setDate(first.getDate()-((first.getDay()+6)%7));
    return Array.from({length:42},(_,index)=>{
      const date=new Date(gridStart);
      date.setDate(gridStart.getDate()+index);
      const key=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
      return {date,key,inMonth:date.getMonth()===calendarMonth.getMonth(),items:calendarItems.filter(item=>item.date===key)};
    });
  },[calendarItems,calendarMonth]);
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

  const playedMatchesChrono=matches
    .filter(m=>m.status==="played")
    .slice()
    .sort((a,b)=>new Date(a.match_date).getTime()-new Date(b.match_date).getTime());

  const advancedPlayerStats=useMemo(()=>{
    const result:Record<string,{
      goalGames:number;
      assistGames:number;
      contributionGames:number;
      doubles:number;
      hatTricks:number;
      bestMatchGA:number;
      bestMatchId:string|null;
      currentGoalStreak:number;
      currentGAStreak:number;
      attendanceStreak:number;
      starterStreak:number;
      winsPlayed:number;
      gaPerMatch:number;
      goalsPerMatch:number;
      assistsPerMatch:number;
    }>={};

    players.forEach(p=>{
      let goalGames=0,assistGames=0,contributionGames=0,doubles=0,hatTricks=0;
      let bestMatchGA=0,bestMatchId:string|null=null,winsPlayed=0;

      for(const m of playedMatchesChrono){
        const present=attendance.some(a=>a.match_id===m.id&&a.player_id===p.id&&(a.status==="present"||a.status==="yes"));
        const goals=events.filter(e=>e.match_id===m.id&&e.event_type==="goal"&&e.player_id===p.id).length;
        const assists=events.filter(e=>e.match_id===m.id&&e.event_type==="goal"&&e.assist_player_id===p.id).length;
        const ga=goals+assists;

        if(goals>0)goalGames++;
        if(assists>0)assistGames++;
        if(ga>0)contributionGames++;
        if(goals===2)doubles++;
        if(goals>=3)hatTricks++;
        if(ga>bestMatchGA){bestMatchGA=ga;bestMatchId=m.id;}

        const ours=m.home_team===CLUB?(m.home_score||0):(m.away_score||0);
        const opp=m.home_team===CLUB?(m.away_score||0):(m.home_score||0);
        if(present&&ours>opp)winsPlayed++;
      }

      let currentGoalStreak=0,currentGAStreak=0,attendanceStreak=0,starterStreak=0;
      for(let i=playedMatchesChrono.length-1;i>=0;i--){
        const m=playedMatchesChrono[i];
        const goals=events.filter(e=>e.match_id===m.id&&e.event_type==="goal"&&e.player_id===p.id).length;
        if(goals>0)currentGoalStreak++; else break;
      }
      for(let i=playedMatchesChrono.length-1;i>=0;i--){
        const m=playedMatchesChrono[i];
        const goals=events.filter(e=>e.match_id===m.id&&e.event_type==="goal"&&e.player_id===p.id).length;
        const assists=events.filter(e=>e.match_id===m.id&&e.event_type==="goal"&&e.assist_player_id===p.id).length;
        if(goals+assists>0)currentGAStreak++; else break;
      }
      for(let i=playedMatchesChrono.length-1;i>=0;i--){
        const m=playedMatchesChrono[i];
        const present=attendance.some(a=>a.match_id===m.id&&a.player_id===p.id&&(a.status==="present"||a.status==="yes"));
        if(present)attendanceStreak++; else break;
      }
      for(let i=playedMatchesChrono.length-1;i>=0;i--){
        const m=playedMatchesChrono[i];
        const starter=lineup.some(l=>l.match_id===m.id&&l.player_id===p.id&&l.is_starter);
        if(starter)starterStreak++; else break;
      }

      const base=stats[p.id]||{m:0,starts:0,captain:0,g:0,a:0,mvp:0};
      result[p.id]={
        goalGames,assistGames,contributionGames,doubles,hatTricks,bestMatchGA,bestMatchId,
        currentGoalStreak,currentGAStreak,attendanceStreak,starterStreak,winsPlayed,
        gaPerMatch:base.m?(base.g+base.a)/base.m:0,
        goalsPerMatch:base.m?base.g/base.m:0,
        assistsPerMatch:base.m?base.a/base.m:0,
      };
    });
    return result;
  },[players,playedMatchesChrono,attendance,events,lineup,stats]);

  const advancedLeaders={
    gaPerMatch:players.slice().sort((a,b)=>(advancedPlayerStats[b.id]?.gaPerMatch||0)-(advancedPlayerStats[a.id]?.gaPerMatch||0))[0]||null,
    contributionGames:players.slice().sort((a,b)=>(advancedPlayerStats[b.id]?.contributionGames||0)-(advancedPlayerStats[a.id]?.contributionGames||0))[0]||null,
    attendanceStreak:players.slice().sort((a,b)=>(advancedPlayerStats[b.id]?.attendanceStreak||0)-(advancedPlayerStats[a.id]?.attendanceStreak||0))[0]||null,
    bestMatchGA:players.slice().sort((a,b)=>(advancedPlayerStats[b.id]?.bestMatchGA||0)-(advancedPlayerStats[a.id]?.bestMatchGA||0))[0]||null,
  };

  const automaticMilestones=(p:Player)=>{
    const a=advancedPlayerStats[p.id];
    const s=stats[p.id]||{m:0,starts:0,captain:0,g:0,a:0,mvp:0};
    if(!a)return [];
    return [
      {label:"DUBLET",ok:a.doubles>0,value:a.doubles,icon:"2×"},
      {label:"HAT-TRICK",ok:a.hatTricks>0,value:a.hatTricks,icon:"3×"},
      {label:"SERIA GOLI",ok:a.currentGoalStreak>=2,value:a.currentGoalStreak,icon:"🔥"},
      {label:"SERIA G+A",ok:a.currentGAStreak>=2,value:a.currentGAStreak,icon:"⚡"},
      {label:"ŻELAZNA OBECNOŚĆ",ok:a.attendanceStreak>=3,value:a.attendanceStreak,icon:"✓"},
      {label:"STAŁY STARTER",ok:a.starterStreak>=3,value:a.starterStreak,icon:"6"},
      {label:"10 G+A",ok:s.g+s.a>=10,value:s.g+s.a,icon:"10"},
      {label:"3 MVP",ok:s.mvp>=3,value:s.mvp,icon:"★"},
    ].filter(x=>x.ok);
  };


  const teamGoalTarget=50;
  const teamGoalProgress=Math.min(100,Math.round((teamSummary.goals/teamGoalTarget)*100));


  const trainingPlayerStats=useMemo(()=>{
    const out:Record<string,{sessions:number;goals:number;assists:number;ga:number;attendanceStreak:number;games:number;wins:number}>={};
    players.forEach(p=>out[p.id]={sessions:0,goals:0,assists:0,ga:0,attendanceStreak:0,games:0,wins:0});

    trainingSessions.forEach(s=>{
      trainingAttendance
        .filter(a=>a.training_id===s.id&&a.status==="present")
        .forEach(a=>{if(out[a.player_id])out[a.player_id].sessions++;});
    });

    trainingEvents.forEach(e=>{
      if(e.event_type==="goal"&&e.player_id&&out[e.player_id])out[e.player_id].goals++;
      if(e.event_type==="goal"&&e.assist_player_id&&out[e.assist_player_id])out[e.assist_player_id].assists++;
    });

    trainingGames.forEach(g=>{
      const teamPlayers=trainingGamePlayers.filter(x=>x.game_id===g.id);
      teamPlayers.forEach(x=>{
        if(!out[x.player_id])return;
        out[x.player_id].games++;
        const won=x.team==="A"?g.team_a_score>g.team_b_score:g.team_b_score>g.team_a_score;
        if(won)out[x.player_id].wins++;
      });
    });

    players.forEach(p=>{
      out[p.id].ga=out[p.id].goals+out[p.id].assists;
      let streak=0;
      const chronological=trainingSessions.slice().sort((a,b)=>a.training_date.localeCompare(b.training_date));
      for(let i=chronological.length-1;i>=0;i--){
        const present=trainingAttendance.some(a=>a.training_id===chronological[i].id&&a.player_id===p.id&&a.status==="present");
        if(present)streak++; else break;
      }
      out[p.id].attendanceStreak=streak;
    });
    return out;
  },[players,trainingSessions,trainingAttendance,trainingGames,trainingGamePlayers,trainingEvents]);

  const trainingScorers=players.slice().sort((a,b)=>(trainingPlayerStats[b.id]?.goals||0)-(trainingPlayerStats[a.id]?.goals||0));
  const trainingAssisters=players.slice().sort((a,b)=>(trainingPlayerStats[b.id]?.assists||0)-(trainingPlayerStats[a.id]?.assists||0));
  const trainingGA=players.slice().sort((a,b)=>(trainingPlayerStats[b.id]?.ga||0)-(trainingPlayerStats[a.id]?.ga||0));
  const trainingAttendanceRank=players.slice().sort((a,b)=>(trainingPlayerStats[b.id]?.sessions||0)-(trainingPlayerStats[a.id]?.sessions||0));

  const trainingChemistry=useMemo(()=>{
    type Pair={a:Player;b:Player;games:number;wins:number;combinedGA:number;score:number};
    const pairs:Pair[]=[];
    for(let i=0;i<players.length;i++){
      for(let j=i+1;j<players.length;j++){
        const pa=players[i],pb=players[j];
        let games=0,wins=0,combinedGA=0;

        trainingGames.forEach(g=>{
          const xa=trainingGamePlayers.find(x=>x.game_id===g.id&&x.player_id===pa.id);
          const xb=trainingGamePlayers.find(x=>x.game_id===g.id&&x.player_id===pb.id);
          if(!xa||!xb||xa.team!==xb.team)return;

          games++;
          const teamWon=xa.team==="A"?g.team_a_score>g.team_b_score:g.team_b_score>g.team_a_score;
          if(teamWon)wins++;

          const eventsInGame=trainingEvents.filter(e=>e.game_id===g.id);
          combinedGA+=eventsInGame.filter(e=>e.player_id===pa.id||e.player_id===pb.id||e.assist_player_id===pa.id||e.assist_player_id===pb.id).length;
        });

        if(games>0){
          const winRate=wins/games;
          const contributionRate=Math.min(1,combinedGA/Math.max(1,games*4));
          const score=Math.round(winRate*70+contributionRate*30);
          pairs.push({a:pa,b:pb,games,wins,combinedGA,score});
        }
      }
    }
    return pairs.sort((x,y)=>y.score-x.score||y.games-x.games||y.combinedGA-x.combinedGA);
  },[players,trainingGames,trainingGamePlayers,trainingEvents]);

  const chemistryNetwork=useMemo(()=>{
    const linkedPlayers=new Map<string,Player>();
    trainingChemistry.slice(0,10).forEach(pair=>{
      if(linkedPlayers.size<6||linkedPlayers.has(pair.a.id))linkedPlayers.set(pair.a.id,pair.a);
      if(linkedPlayers.size<6||linkedPlayers.has(pair.b.id))linkedPlayers.set(pair.b.id,pair.b);
    });
    const networkPlayers=Array.from(linkedPlayers.values()).slice(0,6);
    const nodes=networkPlayers.map((player,index)=>{
      const angle=(Math.PI*2*index/Math.max(1,networkPlayers.length))-Math.PI/2;
      const radius=networkPlayers.length===1?0:36;
      return {player,x:50+Math.cos(angle)*radius,y:50+Math.sin(angle)*radius};
    });
    const positions=new Map(nodes.map(node=>[node.player.id,node]));
    const links=trainingChemistry
      .filter(pair=>positions.has(pair.a.id)&&positions.has(pair.b.id))
      .slice(0,10)
      .map(pair=>({pair,from:positions.get(pair.a.id)!,to:positions.get(pair.b.id)!}));
    return {nodes,links};
  },[trainingChemistry]);

  const totalTrainingAttendance=trainingAttendance.filter(a=>a.status==="present").length;
  const avgTrainingAttendance=trainingSessions.length?totalTrainingAttendance/trainingSessions.length:0;

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

  const teamAchievements=[
    {name:"Pierwszy krok",description:"Rozpoczęcie sezonu i pierwszy oficjalny mecz.",category:"MECZE",current:teamSummary.played,target:1,Icon:Flame},
    {name:"Pierwsza wygrana",description:"Zwycięstwo, które uruchamia drużynową serię.",category:"ZWYCIĘSTWA",current:teamSummary.wins,target:1,Icon:Trophy},
    {name:"Trzy zwycięstwa",description:"Regularność i charakter potwierdzone wynikami.",category:"ZWYCIĘSTWA",current:teamSummary.wins,target:3,Icon:Crown},
    {name:"Dziesięć bramek",description:"Pierwszy ofensywny kamień milowy sezonu.",category:"BRAMKI",current:teamSummary.goals,target:10,Icon:Goal},
    {name:"Dwadzieścia pięć bramek",description:"Drużyna wchodzi na wyższy poziom skuteczności.",category:"BRAMKI",current:teamSummary.goals,target:25,Icon:Target},
    {name:"Pięćdziesiąt bramek",description:"Wielki wspólny cel całego zespołu.",category:"BRAMKI",current:teamSummary.goals,target:50,Icon:Medal},
    {name:"Dziesięć asyst",description:"Współpraca, która zamienia akcje w gole.",category:"DRUŻYNA",current:teamSummary.assists,target:10,Icon:Star},
    {name:"Sezon drużyny",description:"Dziesięć wspólnie rozegranych spotkań.",category:"MECZE",current:teamSummary.played,target:10,Icon:Users},
  ];
  const unlockedTeamAchievements=teamAchievements.filter(item=>item.current>=item.target);
  const nextTeamAchievement=teamAchievements.find(item=>item.current<item.target)||teamAchievements[teamAchievements.length-1];
  const chronicleMatches=matches.filter(m=>m.status==="played").slice().sort((a,b)=>b.match_date.localeCompare(a.match_date));
  const chronicleWins=chronicleMatches.filter(m=>recentResult(m)==="W").length;
  const chronicleGoals=chronicleMatches.reduce((sum,m)=>sum+(m.home_team===CLUB?(m.home_score||0):(m.away_score||0)),0);

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
    ["home","Start",Home],
    ...(props.parentPlayerIds.length?[["mychild","Moje dziecko",UserRound] as [string,string,any]]:[]),
    ...(canManageMatches||canEditMatchEvents?[["matchday","Match Day",Flame] as [string,string,any]]:[]),
    ["matches","Mecze",CalendarDays],["calendar","Kalendarz",CalendarDays],["training","Treningi",Zap],["players","Drużyna",Users],["stats","Statystyki",TrendingUp],["hall","Hall of Fame",Medal],
    ["achievements","Osiągnięcia",Trophy],["chronicle","Kronika",History],["news","Aktualności",Newspaper],["club","Z klubu",Shield],
  ];

  return <div className="hub v8-hub v101-stadium-hub v104-hub">
    <StadiumFX intro/>
    {viewFx&&<div className="v101-cinematic-veil" aria-hidden="true"><span className="v101-cinematic-smoke"/><span className="v101-cinematic-flare"/></div>}
    <aside className="v8-side-nav">
      <button className="v8-side-brand v101-home-logo-btn" onClick={()=>setTab("home")} aria-label="Przejdź na stronę główną"><img src="/teamlogos/gm.png" alt="DELTA 2018 GM"/><span>GM</span></button>
      {navItems.map(([id,label,Icon])=><button key={id} className={tab===id?"active":""} onClick={()=>setTab(id as any)}><Icon size={21}/><span>{label}</span></button>)}
      <div className="v8-side-devil"><Flame size={22}/><span>DIABEŁKI</span></div>
    </aside>

    <header className="hub-top v8-topbar">
      <button className="v8-mini-brand v101-home-logo-btn" onClick={()=>setTab("home")} aria-label="Przejdź na stronę główną"><img src="/teamlogos/gm.png" alt="DELTA 2018 GM"/><div><b>DELTA 2018 GM</b><span>Górny Mokotów</span></div></button>
      <div className="v8-top-spacer"/>
      {canOpenAdmin&&<a href="/admin" className="admin-link v8-admin-chip">{staff?"ADMIN":"POMOCNIK"}</a>}
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

    <main className={`hub-main v8-main ${viewFx?"v101-view-enter":""}`}>
      {tab==="home"&&<>
        <section className="v8-hero v82-hero-clean v101-logged-hero" aria-label="DELTA 2018 GM — Górny Mokotów">
          <div className="v82-hero-vignette"/>
          <img className="v106-logged-players" src="/assets/hero-team-v105.png" alt="Zawodnicy DELTA 2018 GM"/>
          <div className="v104-logged-hero-copy"><span>RAZEM DO WIELKICH RZECZY</span><h1>DELTA 2018 GM</h1><p>GÓRNY MOKOTÓW • OFICJALNY PANEL DRUŻYNY</p></div>
          <div className="v101-hero-club-identity">
            <div className="v101-hero-crest-wrap">
              <span className="v101-hero-crest-fire"/>
              <img src="/teamlogos/gm.png" alt="K.S. Delta Warszawa"/>
            </div>
            <div className="v101-hero-identity-copy">
              <span>K.S. DELTA WARSZAWA</span>
              <strong>GÓRNY MOKOTÓW</strong>
              <b>2018</b>
            </div>
          </div>
        </section>

        {nextMatch&&<><section className="v105-home-command-grid">
          <article className="v8-match-card devil-card v101-logged-match">
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
          <div className="v105-command-side">
          <article className="v891-team-clock devil-card" onClick={()=>setTab("calendar")}>
            <div className="v891-clock-icon"><CalendarDays size={22}/></div>
            <div className="v891-clock-copy">
              <span>PLAN TYGODNIA</span>
              <h3>{nextTeamEvent?.title||"Brak zaplanowanych wydarzeń"}</h3>
              <p>{nextTeamEvent?.subtitle||"Dodaj wydarzenia w Kalendarzu drużyny."}</p>
            </div>
            <div className="v891-clock-time">
              <small>DO WYDARZENIA</small>
              <b>{teamClockCountdown}</b>
            </div>
            <ChevronRight size={18}/>
          </article>

          <article className={`v891-important-note devil-card ${importantTeamEvent?"has-event":"is-empty"}`} onClick={()=>setTab("calendar")}>
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
          </div>
        </section></>}

        <section className="v8-stats-row">
          {[
            ["MECZE",teamSummary.played,Target],["WYGRANE",teamSummary.wins,Trophy],["REMISY",teamSummary.draws,Shield],
            ["PORAŻKI",teamSummary.losses,X],["BRAMKI",teamSummary.goals,Goal],["ASYSTY",teamSummary.assists,Star]
          ].map(([label,val,Icon]:any)=><div className="v8-stat devil-tile" key={label}><Icon size={25}/><b>{val}</b><span>{label}</span></div>)}
        </section>

        <section className="v8-dashboard-grid">
          <article className={`v8-panel v101-now-card v108-week-pulse devil-card ${isTeamLive?"is-live":""}`} onClick={()=>setTab("calendar")}>
            <div className="v8-panel-title"><Flame size={18}/> {isTeamLive?"DZIEJE SIĘ TERAZ":"RYTM TYGODNIA"} {isTeamLive&&<span className="v101-live-dot">LIVE</span>}</div>
            <div className="v108-week-list">
              {homeAgendaItems.length?homeAgendaItems.map((item,index)=><div className="v108-week-row" key={`${item.kind}-${item.at.toISOString()}`}>
                <span className="v108-week-index">0{index+1}</span>
                <div><small>{item.kind==="training"?"TRENING":item.important?"WAŻNE":"WYDARZENIE"}</small><b>{item.title}</b><p>{item.subtitle}</p></div>
                <ChevronRight size={15}/>
              </div>):<div className="v108-week-empty"><CalendarDays size={27}/><div><b>Spokojny tydzień</b><span>Brak dodatkowych wydarzeń poza najbliższym meczem.</span></div></div>}
            </div>
            <div className="v101-now-footer"><span><Bell size={13}/>Następny punkt planu: {teamClockCountdown}</span><ChevronRight size={15}/></div>
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
                  <b>{decodeHtmlEntities(item.title)}</b>
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

      {tab==="mychild"&&<MyChildCenter
        players={players} parentPlayerIds={props.parentPlayerIds} stats={stats} trainingStats={trainingPlayerStats}
        matches={matches} attendance={attendance} events={events} trainingSessions={trainingSessions} trainingAttendance={trainingAttendance}
        chemistry={trainingChemistry} onOpenMatch={(m,t)=>openMatch(m,t)} onOpenPlayer={setSelectedPlayer}
      />}

      {tab==="matchday"&&<MatchDayMode
        match={nextMatch||null} players={players} attendance={attendance} lineup={lineup} events={events}
        canManage={canManageMatches} canEvents={canEditMatchEvents} onOpen={(m,t)=>openMatch(m,t)}
      />}

      {tab==="hall"&&<HallOfFame
        players={players} stats={stats} trainingStats={trainingPlayerStats} chemistry={trainingChemistry} matches={matches} trainingSessions={trainingSessions} onOpenPlayer={setSelectedPlayer}
      />}

      {tab==="matches"&&<section className="section v8-section-page"><div className="section-title"><h2>Mecze</h2></div><div className="list">{matches.map(m=><article className="match-row devil-card" key={m.id}><div className="teamline"><Logo team={m.home_team} size={38}/><strong>{m.home_team}</strong></div><div className="score">{m.status==="played"?`${m.home_score}:${m.away_score}`:"–:–"}</div><div className="teamline right"><strong>{m.away_team}</strong><Logo team={m.away_team} size={38}/></div><div className="match-meta">{datePL(m.match_date)} {m.match_time||""} • {m.venue||"—"}</div><div className="match-actions-row"><button className="open-match-btn" onClick={()=>openMatch(m,"summary")}>{canManageMatches||canEditMatchEvents?"EDYTUJ MECZ / CENTRUM MECZU":"SZCZEGÓŁY MECZU"}</button></div></article>)}</div></section>}

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

        <div className="v103-calendar-toolbar devil-card">
          <div className="v103-calendar-nav">
            <button aria-label="Poprzedni miesiąc" onClick={()=>setCalendarMonth(value=>new Date(value.getFullYear(),value.getMonth()-1,1))}><ChevronLeft size={18}/></button>
            <strong>{calendarMonth.toLocaleDateString("pl-PL",{month:"long",year:"numeric"})}</strong>
            <button aria-label="Następny miesiąc" onClick={()=>setCalendarMonth(value=>new Date(value.getFullYear(),value.getMonth()+1,1))}><ChevronRight size={18}/></button>
            <button className="v103-calendar-today" onClick={()=>setCalendarMonth(new Date(new Date().getFullYear(),new Date().getMonth(),1))}>DZISIAJ</button>
          </div>
          <div className="v103-calendar-views" role="group" aria-label="Widok kalendarza">
            <button className={calendarView==="month"?"active":""} onClick={()=>setCalendarView("month")}><Grid3X3 size={15}/> MIESIĄC</button>
            <button className={calendarView==="list"?"active":""} onClick={()=>setCalendarView("list")}><List size={15}/> LISTA</button>
          </div>
        </div>

        {calendarView==="month"?<div className="v104-calendar-layout"><div className="v103-calendar-month devil-card">
          <div className="v103-calendar-weekdays">{["PN","WT","ŚR","CZ","PT","SOB","ND"].map(day=><span key={day}>{day}</span>)}</div>
          <div className="v103-calendar-days">
            {calendarDays.map(day=>{
              const isToday=day.key===`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
              return <div key={day.key} className={`v103-calendar-day ${day.inMonth?"":"outside"} ${isToday?"today":""}`}>
                <span className="v103-day-number">{day.date.getDate()}</span>
                <div className="v103-day-events">
                  {day.items.slice(0,3).map(item=>item.match
                    ?<button key={item.id} className={`v103-day-event type-${item.kind}`} title={`${item.title} ${item.time}`} onClick={()=>openMatch(item.match!,"summary")}><i/>{item.time&&<time>{item.time}</time>}<b>{item.title}</b></button>
                    :<div key={item.id} className={`v103-day-event type-${item.kind}`} title={`${item.title} ${item.time}`}><i/>{item.time&&<time>{item.time}</time>}<b>{item.title}</b></div>)}
                  {day.items.length>3&&<small>+{day.items.length-3} więcej</small>}
                </div>
              </div>;
            })}
          </div>
        </div><aside className="v104-calendar-agenda devil-card"><span className="eyebrow gold">NADCHODZĄCE WYDARZENIA</span><h3>Najbliższe w drużynie</h3><div>{calendarItems.filter(item=>`${item.date} ${item.time}`>=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`).slice(0,6).map(item=><article key={item.id} className={`type-${item.kind}`}><time><b>{new Date(`${item.date}T12:00:00`).getDate()}</b><span>{new Date(`${item.date}T12:00:00`).toLocaleDateString("pl-PL",{month:"short"}).replace(".","").toUpperCase()}</span></time><div><small>{calendarKindLabel(item.kind)}</small><b>{item.title}</b><span>{[item.time,item.location].filter(Boolean).join(" • ")}</span></div>{item.match&&<button onClick={()=>openMatch(item.match!,"summary")}><ChevronRight size={15}/></button>}</article>)}</div></aside></div>:<div className="v891-calendar-grid v103-calendar-list">
          {calendarItems.length?calendarItems.map(item=><article key={item.id} className={`v891-calendar-event devil-card type-${item.kind} ${item.important?"important":""}`}>
            <div className="v891-event-date">
              <b>{new Date(`${item.date}T12:00:00`).toLocaleDateString("pl-PL",{day:"2-digit"})}</b>
              <span>{new Date(`${item.date}T12:00:00`).toLocaleDateString("pl-PL",{month:"short"}).replace(".","").toUpperCase()}</span>
            </div>
            <div className="v891-event-main">
              <span className="v891-event-type">{calendarKindLabel(item.kind)}</span>
              <h3>{item.title}</h3>
              <p>{[item.time,item.location].filter(Boolean).join(" • ")||"Szczegóły do ustalenia"}</p>
              {item.details&&<small>{item.details}</small>}
            </div>
            {item.match?<button onClick={()=>openMatch(item.match!,"summary")}>CENTRUM MECZU <ChevronRight size={13}/></button>:null}
          </article>):<div className="v891-calendar-empty devil-card"><CalendarDays size={34}/><h3>Kalendarz jest pusty</h3><p>Administrator może zaplanować treningi, turnieje, urodziny i inne wydarzenia.</p></div>}
        </div>}
      </section>}

      {tab==="training"&&<section className="section v8-section-page v900-training-center">
        <div className="v900-training-hero devil-card">
          <div className="v900-training-hero-bg"/>
          <div className="v900-training-copy">
            <span className="eyebrow gold">DELTA 2018 GM • PERFORMANCE LAB</span>
            <h2>CENTRUM <span>TRENINGOWE</span></h2>
            <p>Frekwencja, gry kontrolne, gole treningowe, asysty i chemia zespołu — całkowicie oddzielone od statystyk meczów oficjalnych.</p>
          </div>
          <div className="v900-training-kpis">
            <div><strong>{trainingSessions.length}</strong><span>TRENINGI</span></div>
            <div><strong>{avgTrainingAttendance.toFixed(1)}</strong><span>ŚR. OBECNOŚĆ</span></div>
            <div><strong>{trainingGames.length}</strong><span>GRY KONTROLNE</span></div>
            <div><strong>{trainingEvents.filter(e=>e.event_type==="goal").length}</strong><span>GOLE TRENINGOWE</span></div>
          </div>
        </div>

        <div className="v900-training-grid">
          <article className="v900-training-card devil-card">
            <div className="v8-panel-title"><Users size={18}/> FREKWENCJA TRENINGOWA</div>
            <div className="v900-training-ranking">
              {trainingAttendanceRank.map((p,index)=>{
                const s=trainingPlayerStats[p.id];
                return <button key={p.id} onClick={()=>setSelectedPlayer(p)}>
                  <span className="rank">{index+1}</span>
                  <span className="photo">{isRyszardPlayer(p)?<img src="/assets/ryszard-player-card.png" alt={p.display_name}/>:<PlayerPhoto playerId={p.id}/>}</span>
                  <span className="name"><b>{p.display_name}</b><small>seria: {s?.attendanceStreak||0}</small></span>
                  <strong>{s?.sessions||0}</strong>
                </button>
              })}
            </div>
          </article>

          <article className="v900-training-card devil-card">
            <div className="v8-panel-title"><Goal size={18}/> GOLE TRENINGOWE</div>
            <div className="v900-training-ranking compact">
              {trainingScorers.slice(0,8).map((p,index)=>{
                const s=trainingPlayerStats[p.id];
                return <button key={p.id} onClick={()=>setSelectedPlayer(p)}>
                  <span className="rank">{index+1}</span>
                  <span className="name"><b>{p.display_name}</b><small>{s?.games||0} gier</small></span>
                  <strong>{s?.goals||0}</strong>
                </button>
              })}
            </div>
          </article>

          <article className="v900-training-card devil-card">
            <div className="v8-panel-title"><Star size={18}/> ASYSTY TRENINGOWE</div>
            <div className="v900-training-ranking compact">
              {trainingAssisters.slice(0,8).map((p,index)=>{
                const s=trainingPlayerStats[p.id];
                return <button key={p.id} onClick={()=>setSelectedPlayer(p)}>
                  <span className="rank">{index+1}</span>
                  <span className="name"><b>{p.display_name}</b><small>{s?.ga||0} G+A</small></span>
                  <strong>{s?.assists||0}</strong>
                </button>
              })}
            </div>
          </article>

          <article className="v900-training-card devil-card">
            <div className="v8-panel-title"><Zap size={18}/> G+A TRENINGOWE</div>
            <div className="v900-training-ranking compact">
              {trainingGA.slice(0,8).map((p,index)=>{
                const s=trainingPlayerStats[p.id];
                return <button key={p.id} onClick={()=>setSelectedPlayer(p)}>
                  <span className="rank">{index+1}</span>
                  <span className="name"><b>{p.display_name}</b><small>{s?.goals||0}G • {s?.assists||0}A</small></span>
                  <strong>{s?.ga||0}</strong>
                </button>
              })}
            </div>
          </article>
        </div>

        <article className="v900-chemistry devil-card">
          <div className="v900-chemistry-head">
            <div><span className="eyebrow gold">PAIR PERFORMANCE</span><h3>Chemia zespołu</h3></div>
            <p>Wynik oparty na wspólnych grach kontrolnych: zwycięstwach oraz wspólnym udziale przy golach. To wskaźnik zabawowy, nie ocena zawodnika.</p>
          </div>

          {chemistryNetwork.nodes.length>1&&<div className="v103-chemistry-network" aria-label="Mapa połączeń między zawodnikami">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              {chemistryNetwork.links.map(({pair,from,to})=><line
                key={`${pair.a.id}-${pair.b.id}`}
                x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                className={pair.score>=70?"strong":pair.score>=45?"medium":"developing"}
                style={{strokeWidth:Math.max(1.1,pair.score/28)}}
              />)}
            </svg>
            {chemistryNetwork.nodes.map(node=><button
              key={node.player.id}
              className="v103-chemistry-node"
              style={{left:`${node.x}%`,top:`${node.y}%`}}
              onClick={()=>setSelectedPlayer(node.player)}
              title={`Otwórz profil: ${node.player.display_name}`}
            >
              <span>{isRyszardPlayer(node.player)?<img src="/assets/ryszard-player-card.png" alt=""/>:<PlayerPhoto playerId={node.player.id}/>}</span>
              <b>{node.player.display_name}</b>
            </button>)}
            <div className="v103-chemistry-legend"><span className="strong">silne</span><span className="medium">dobre</span><span className="developing">rozwijane</span></div>
          </div>}

          <div className="v900-chemistry-grid">
            {trainingChemistry.slice(0,10).map((pair,index)=><button className="v900-pair-card" key={`${pair.a.id}-${pair.b.id}`}>
              <span className="v900-pair-rank">#{index+1}</span>
              <div className="v900-pair-players">
                <span>{isRyszardPlayer(pair.a)?<img src="/assets/ryszard-player-card.png" alt={pair.a.display_name}/>:<PlayerPhoto playerId={pair.a.id}/>}</span>
                <i>+</i>
                <span>{isRyszardPlayer(pair.b)?<img src="/assets/ryszard-player-card.png" alt={pair.b.display_name}/>:<PlayerPhoto playerId={pair.b.id}/>}</span>
              </div>
              <b>{pair.a.display_name} + {pair.b.display_name}</b>
              <strong>{pair.score}%</strong>
              <div className="v900-chem-bar"><i style={{width:`${pair.score}%`}}/></div>
              <small>{pair.games} wspólnych gier • {pair.wins} wygranych • {pair.combinedGA} akcji G/A</small>
            </button>)}
            {trainingChemistry.length===0&&<div className="v900-no-chemistry">Chemia pojawi się po zapisaniu pierwszych gier kontrolnych i składów.</div>}
          </div>
        </article>

        <article className="v900-training-history devil-card">
          <div className="v8-panel-title"><History size={18}/> OSTATNIE TRENINGI</div>
          <div className="v900-training-history-list">
            {trainingSessions.slice(0,8).map(s=>{
              const present=trainingAttendance.filter(a=>a.training_id===s.id&&a.status==="present").length;
              const games=trainingGames.filter(g=>g.training_id===s.id);
              return <div key={s.id}>
                <span className="date">{datePL(s.training_date)}</span>
                <div><b>{s.title||"Trening"}</b><small>{[s.start_time?.slice(0,5),s.location].filter(Boolean).join(" • ")}</small></div>
                <strong>{present}/{players.length}</strong>
                <em>{games.length} {games.length===1?"gra":"gry"}</em>
              </div>
            })}
            {trainingSessions.length===0&&<p className="muted">Pierwszy trening dodasz w panelu Admin.</p>}
          </div>
        </article>
      </section>}

      {tab==="players"&&<section className="section v8-section-page v87-players-page v871-team-page">
        <div className="v871-team-hero v108-team-hero devil-card">
          <div className="v871-team-hero-overlay"/>
          <img className="v108-team-players" src="/assets/hero-team-v105.png" alt="Zawodnicy DELTA 2018 GM"/>
          <div className="v871-team-crest"><img src="/teamlogos/gm.png" alt="DELTA 2018 GM"/></div>
          <div className="v871-team-copy">
            <span className="eyebrow gold">POZNAJ DIABEŁKI • GÓRNY MOKOTÓW</span>
            <h2>DELTA <span>2018</span> GM</h2>
            <p>Pasja, charakter i przyjaźń. Jedna drużyna, która rośnie z każdym treningiem.</p>
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
            <p>Sezon {currentSeason} • liczby, liderzy, rekordy i forma drużyny w jednym miejscu.</p>
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

        <section className="v893-advanced-zone">
          <div className="v893-zone-head">
            <div>
              <span className="eyebrow gold">AUTOMATYCZNIE Z MECZÓW</span>
              <h3>Advanced Stats</h3>
            </div>
            <p>Bez dodatkowego wpisywania danych — liczone z obecności, składu, goli, asyst i wyników.</p>
          </div>

          <div className="v893-leader-strip">
            <article className="devil-card">
              <span>G+A / MECZ</span>
              <b>{advancedLeaders.gaPerMatch?.display_name||"—"}</b>
              <strong>{advancedLeaders.gaPerMatch?(advancedPlayerStats[advancedLeaders.gaPerMatch.id]?.gaPerMatch||0).toFixed(2):"0.00"}</strong>
            </article>
            <article className="devil-card">
              <span>MECZE Z G+A</span>
              <b>{advancedLeaders.contributionGames?.display_name||"—"}</b>
              <strong>{advancedLeaders.contributionGames?advancedPlayerStats[advancedLeaders.contributionGames.id]?.contributionGames||0:0}</strong>
            </article>
            <article className="devil-card">
              <span>SERIA OBECNOŚCI</span>
              <b>{advancedLeaders.attendanceStreak?.display_name||"—"}</b>
              <strong>{advancedLeaders.attendanceStreak?advancedPlayerStats[advancedLeaders.attendanceStreak.id]?.attendanceStreak||0:0}</strong>
            </article>
            <article className="devil-card">
              <span>NAJLEPSZY MECZ G+A</span>
              <b>{advancedLeaders.bestMatchGA?.display_name||"—"}</b>
              <strong>{advancedLeaders.bestMatchGA?advancedPlayerStats[advancedLeaders.bestMatchGA.id]?.bestMatchGA||0:0}</strong>
            </article>
          </div>

          <div className="v893-player-advanced-grid">
            {players.map(p=>{
              const s=stats[p.id]||{m:0,starts:0,captain:0,g:0,a:0,mvp:0};
              const a=advancedPlayerStats[p.id];
              const badges=automaticMilestones(p);
              return <article className="v893-player-advanced devil-card" key={p.id}>
                <button className="v893-player-head" onClick={()=>setSelectedPlayer(p)}>
                  <span className="v893-mini-photo">
                    {isRyszardPlayer(p)?<img src="/assets/ryszard-player-card.png" alt={p.display_name}/>:<PlayerPhoto playerId={p.id}/>}
                  </span>
                  <span><b>{p.display_name}</b><small>{s.m} mecze • {s.g+s.a} G+A</small></span>
                  <ChevronRight size={15}/>
                </button>

                <div className="v893-metrics">
                  <div><strong>{a?.gaPerMatch.toFixed(2)||"0.00"}</strong><span>G+A / MECZ</span></div>
                  <div><strong>{a?.goalGames||0}</strong><span>MECZE Z GOLEM</span></div>
                  <div><strong>{a?.assistGames||0}</strong><span>MECZE Z ASYSTĄ</span></div>
                  <div><strong>{a?.contributionGames||0}</strong><span>MECZE Z G+A</span></div>
                  <div><strong>{a?.doubles||0}</strong><span>DUBLETY</span></div>
                  <div><strong>{a?.hatTricks||0}</strong><span>HAT-TRICKI</span></div>
                  <div><strong>{a?.winsPlayed||0}</strong><span>WYGRANE Z UDZIAŁEM</span></div>
                  <div><strong>{a?.bestMatchGA||0}</strong><span>BEST MATCH G+A</span></div>
                </div>

                <div className="v893-streaks">
                  <span><b>{a?.currentGoalStreak||0}</b> seria goli</span>
                  <span><b>{a?.currentGAStreak||0}</b> seria G+A</span>
                  <span><b>{a?.attendanceStreak||0}</b> obecność</span>
                  <span><b>{a?.starterStreak||0}</b> starter</span>
                </div>

                <div className="v893-auto-badges">
                  {badges.length?badges.map(x=><span key={x.label} title={x.label}><i>{x.icon}</i><b>{x.label}</b><em>{x.value}</em></span>):<small>Pierwsze automatyczne wyróżnienia jeszcze przed nami.</small>}
                </div>

                {a?.bestMatchId&&<button className="v893-best-match" onClick={()=>{
                  const m=matches.find(x=>x.id===a.bestMatchId);
                  if(m)openMatch(m,"summary");
                }}>NAJLEPSZY MECZ <ChevronRight size={12}/></button>}
              </article>
            })}
          </div>
        </section>

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

      {tab==="achievements"&&<section className="section v8-section-page v108-achievements-page">
        <div className="v108-achievements-hero devil-card"><div><span className="eyebrow gold">DROGA DRUŻYNY • SEZON 2026/27</span><h2>MAŁE KROKI.<br/><em>WIELKIE OSIĄGNIĘCIA.</em></h2><p>Każdy mecz, gol i wspólna akcja zapisują kolejny rozdział historii DELTA 2018 GM.</p></div><div className="v108-achievement-orbit"><Trophy size={62}/><b>{unlockedTeamAchievements.length}</b><span>ZDOBYTE TROFEA</span></div></div>
        <div className="v108-achievement-summary">
          <article className="v108-next-trophy devil-card"><div className="v8-panel-title"><Target size={18}/> NAJBLIŻSZY CEL</div><div><span className="v108-trophy-icon"><nextTeamAchievement.Icon size={35}/></span><div><small>{nextTeamAchievement.category}</small><h3>{nextTeamAchievement.name}</h3><p>{nextTeamAchievement.description}</p></div><strong>{Math.min(100,Math.round(nextTeamAchievement.current/nextTeamAchievement.target*100))}%</strong></div><div className="v108-progress"><i style={{width:`${Math.min(100,nextTeamAchievement.current/nextTeamAchievement.target*100)}%`}}/></div><span>{nextTeamAchievement.current} / {nextTeamAchievement.target}</span></article>
          <article className="v108-trophy-stats devil-card"><div><b>{unlockedTeamAchievements.length}</b><span>ZDOBYTE</span></div><div><b>{teamAchievements.length-unlockedTeamAchievements.length}</b><span>PRZED NAMI</span></div><div><b>{Math.round(unlockedTeamAchievements.length/teamAchievements.length*100)}%</b><span>DROGI</span></div></article>
        </div>
        <div className="v108-achievement-road">{teamAchievements.map((item,index)=>{const ok=item.current>=item.target;const progress=Math.min(100,item.current/item.target*100);return <article className={`v108-road-card devil-card ${ok?"unlocked":"locked"}`} key={item.name}><span className="v108-road-number">{String(index+1).padStart(2,"0")}</span><span className="v108-road-icon"><item.Icon size={25}/></span><small>{item.category}</small><h3>{item.name}</h3><p>{item.description}</p><div className="v108-progress"><i style={{width:`${progress}%`}}/></div><b>{ok?"ZDOBYTE":`${item.current} / ${item.target}`}</b></article>})}</div>
      </section>}

      {tab==="chronicle"&&<section className="section v8-section-page v108-chronicle-page">
        <div className="v108-chronicle-hero devil-card"><div><span className="eyebrow gold">KRONIKA SEZONU • 2026/27</span><h2>NASZA HISTORIA<br/><em>PISANA MECZAMI</em></h2><p>Wyniki są ważne. Jeszcze ważniejsze są emocje, bohaterowie i chwile, które budują drużynę.</p></div><div className="v108-season-minute"><span>SEZON W JEDNEJ MINUCIE</span><div><b>{chronicleMatches.length}<small>MECZÓW</small></b><b>{chronicleWins}<small>WYGRANYCH</small></b><b>{chronicleGoals}<small>GOLI</small></b></div></div></div>
        <div className="v108-timeline">{chronicleMatches.length?chronicleMatches.map((m,index)=>{const matchEvents=events.filter(e=>e.match_id===m.id);const starters=lineup.filter(l=>l.match_id===m.id&&l.is_starter).map(l=>players.find(p=>p.id===l.player_id)?.display_name).filter(Boolean);const captain=lineup.find(l=>l.match_id===m.id&&l.is_captain);const captainName=players.find(p=>p.id===captain?.player_id)?.display_name;const mvpName=players.find(p=>p.id===matchEvents.find(e=>e.event_type==="mvp")?.player_id)?.display_name;const result=recentResult(m);return <article className={`v108-story-card devil-card result-${result.toLowerCase()}`} key={m.id}><div className="v108-timeline-marker"><span>{String(chronicleMatches.length-index).padStart(2,"0")}</span></div><div className="v108-story-cover"><div className="v108-story-date"><span>KOLEJKA {m.round_no||"—"}</span><b>{datePL(m.match_date)}</b></div><div className="v108-story-score"><span>{m.home_team}</span><strong>{m.home_score}:{m.away_score}</strong><span>{m.away_team}</span></div><div className="v108-story-result">{result==="W"?"ZWYCIĘSTWO":result==="R"?"REMIS":"LEKCJA NA PRZYSZŁOŚĆ"}</div></div><div className="v108-story-content"><div><small>BOHATER SPOTKANIA</small><h3>{mvpName||captainName||"Cała drużyna"}</h3><p>{result==="W"?"Wspólna praca, odwaga i konsekwencja przyniosły drużynie kolejne zwycięstwo.":"Każdy mecz daje doświadczenie, z którego drużyna buduje kolejny krok."}</p></div><div className="v108-story-details"><span><Goal size={15}/>{matchEvents.filter(e=>e.event_type==="goal").length} akcji bramkowych</span><span><Crown size={15}/>Kapitan: {captainName||"—"}</span><span><Users size={15}/>{starters.length} w wyjściowym składzie</span></div><MatchGallery matchId={m.id} media={matchMedia}/></div></article>}):<div className="v108-chronicle-empty devil-card"><History size={42}/><h3>Pierwszy rozdział jeszcze przed nami</h3><p>Po rozegranym meczu pojawi się tutaj wynik, bohaterowie i historia spotkania.</p></div>}</div>
      </section>}

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
            {decodeHtmlEntities(item.title).includes("2018 Górny Mokotów")&&<div className="v878-direct-badge">2018 GÓRNY MOKOTÓW</div>}
            <h3>{decodeHtmlEntities(item.title)}</h3>
            {item.body&&<p>{decodeHtmlEntities(item.body)}</p>}
            <a href={item.source_url} target="_blank" rel="noreferrer">ŹRÓDŁO: DELTA.WARSZAWA.PL <ChevronRight size={13}/></a>
          </article>)}
        </div>
      </section>}

      {tab==="news"&&<section className="section v8-section-page"><div className="section-title"><h2>Aktualności</h2>{(staff||props.userPermissions.can_manage_news)&&<button className="btn gold-btn" onClick={saveNewsItem}>Dodaj aktualność</button>}</div><div className="news-grid">{news.map(n=><article className="news-card devil-card" key={n.id}><span className="tag">{n.type}</span><h3>{n.title}</h3><p>{n.body}</p><small>{new Date(n.published_at).toLocaleString("pl-PL")}</small></article>)}</div></section>}
    </main>

    <nav className="bottom-nav v8-bottom-nav">{navItems.map(([id,label,Icon])=><button key={id} className={tab===id?"active":""} onClick={()=>setTab(id as any)}><Icon size={18}/><span>{label}</span></button>)}</nav>

    {selectedPlayer&&<div className="modal-backdrop" onClick={()=>setSelectedPlayer(null)}><div className={`modal-sheet devil-card ${isRyszardPlayer(selectedPlayer)?"v874-featured-profile-sheet":""}`} onClick={e=>e.stopPropagation()}><button className="close" onClick={()=>setSelectedPlayer(null)}>×</button>
      {isRyszardPlayer(selectedPlayer)&&<div className="v874-profile-hero"><img src="/assets/players/ryszard-hero.png" alt={`Profil ${selectedPlayer.display_name}`}/><div className="v874-profile-hero-shade"/><div className="v874-profile-hero-label"><img src="/teamlogos/gm.png" alt=""/><div><span>DELTA 2018 GM</span><b>{selectedPlayer.display_name}</b></div></div></div>}
      <div className={`premium-profile ${isRyszardPlayer(selectedPlayer)?"v874-profile-stats-layout":""}`}>
        {!isRyszardPlayer(selectedPlayer)&&<div className="premium-photo"><span className="v873-flares"/><span className="v873-embers"/><span className="v873-corner tl"/><span className="v873-corner tr"/><span className="v873-corner bl"/><span className="v873-corner br"/><span className="v873-plate">PLAYER PROFILE</span><PlayerPhoto playerId={selectedPlayer.id} className="premium-photo-img"/></div>}
        <div className="premium-info"><span className="eyebrow gold">PROFIL ZAWODNIKA</span><h2>{selectedPlayer.display_name}</h2><p>{selectedPlayer.position||"Zawodnik"}</p>{(()=>{const s=stats[selectedPlayer.id]||{m:0,starts:0,captain:0,g:0,a:0,mvp:0};return <div className="profile-stats"><div><b>{s.m}</b><span>Mecze</span></div><div><b>{s.starts}</b><span>Wyjściowa 6</span></div><div><b>{s.captain}</b><span>Kapitan</span></div><div><b>{s.g}</b><span>Gole</span></div><div><b>{s.a}</b><span>Asysty</span></div><div><b>{s.g+s.a}</b><span>G+A</span></div><div><b>{s.mvp}</b><span>MVP</span></div></div>})()}</div>
      </div><h3>Osiągnięcia zawodnika</h3><div className="achievement-grid">{playerAchievements(selectedPlayer).map(([name,ok,progress])=><div key={name as string} className={`achievement ${ok?"unlocked":""}`}><Star size={20}/><h3>{name}</h3><p>{ok?"ZDOBYTE":progress}</p></div>)}</div></div></div>}

    {selectedMatch&&<MatchCenterModal
      match={selectedMatch}
      players={players}
      attendance={attendance}
      lineup={lineup}
      events={events}
      currentUserId={props.profile.id}
      currentUserRole={props.profile.role}
      canManageMatch={canManageMatches}
      canEditEvents={canEditMatchEvents}
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
