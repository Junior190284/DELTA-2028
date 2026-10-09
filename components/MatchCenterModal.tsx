"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PlayerPhoto from "./PlayerPhoto";
import MatchPosterModal from "./MatchPosterModal";
import DeltaMatchBriefModal from "./DeltaMatchBriefModal";
import DeltaFanVotingModal from "./DeltaFanVotingModal";
import { formatTeamName } from "@/lib/teams";
import {
  CalendarDays, Check, ChevronRight, Crown, Goal, Save, ShieldCheck,
  Star, Trophy, UserCheck, Users, X, Download, Share2, Sparkles, Send, Heart,
  UserX, HelpCircle, Filter
} from "lucide-react";

type Player={id:string;display_name:string;shirt_number:string|null;position:string|null;photo_path:string|null;active:boolean};
type Match={id:string;round_no:number|null;match_date:string;match_time:string|null;venue:string|null;home_team:string;away_team:string;home_score:number|null;away_score:number|null;status:string};
type Attendance={match_id:string;player_id:string;status:string};
type Lineup={match_id:string;player_id:string;is_starter:boolean;is_captain:boolean};
type Event={id:string;match_id:string;event_type:string;player_id:string|null;assist_player_id:string|null;minute:number|null;created_at:string};

type Tab="summary"|"attendance"|"lineup"|"events"|"mvp";

function datePL(x:string){
  return new Date(`${x}T12:00:00`).toLocaleDateString("pl-PL",{day:"2-digit",month:"2-digit",year:"numeric"});
}

function positionOrder(position:string|null){
  const value=(position||"").toLocaleLowerCase("pl-PL");
  if(value.includes("bram"))return 0;
  if(value.includes("obro"))return 1;
  if(value.includes("pom")||value.includes("środ")||value.includes("srod"))return 2;
  if(value.includes("nap"))return 3;
  return 4;
}

export default function MatchCenterModal(props:{
  match:Match;
  players:Player[];
  attendance:Attendance[];
  lineup:Lineup[];
  events:Event[];
  currentUserId:string;
  currentUserRole:string;
  canManageMatch?:boolean;
  canEditEvents?:boolean;
  parentPlayerIds:string[];
  initialTab?:Tab;
  embedded?:boolean;
  onClose:()=>void;
  onDataChange:(data:{match?:Match;attendance?:Attendance[];lineup?:Lineup[];events?:Event[]})=>void;
}) {
  const supabase=createClient();
  const router=useRouter();
  const {match,players}=props;
  const coreStaff=props.currentUserRole==="admin"||props.currentUserRole==="coach";
  const canManageMatch=coreStaff||!!props.canManageMatch;
  const canEditEvents=canManageMatch||!!props.canEditEvents;
  const staff=canManageMatch||canEditEvents;
  const [tab,setTab]=useState<Tab>(props.initialTab||"summary");

  useEffect(()=>{
    if(props.initialTab) setTab(props.initialTab);
  },[props.initialTab,props.match.id]);

  useEffect(()=>{
    if(props.embedded) return;
    const onKeyDown=(e:KeyboardEvent)=>{
      if(e.key==="Escape") props.onClose();
    };
    window.addEventListener("keydown",onKeyDown);
    return ()=>window.removeEventListener("keydown",onKeyDown);
  },[props.embedded,props.onClose]);
  const [saving,setSaving]=useState(false);
  const [saved,setSaved]=useState("");
  const [celebration,setCelebration]=useState<"goal"|"hattrick"|"mvp"|null>(null);
  const [scorerId,setScorerId]=useState("");
  const [assistId,setAssistId]=useState("");
  const [editingGoalId,setEditingGoalId]=useState<string|null>(null);
  const [eventBusy,setEventBusy]=useState(false);
  const [eventError,setEventError]=useState("");
  const [matchBusy,setMatchBusy]=useState(false);
  const [refreshing,setRefreshing]=useState(false);
  const [lastSync,setLastSync]=useState<string>("");
  const [posterOpen,setPosterOpen]=useState(false);
  const [briefOpen,setBriefOpen]=useState(false);
  const [fanVotingOpen,setFanVotingOpen]=useState(false);
  const [attendanceFilter, setAttendanceFilter] = useState<"all" | "present" | "absent" | "undecided">("all");

  const matchAttendance=props.attendance.filter(a=>a.match_id===match.id);
  const matchLineup=props.lineup.filter(l=>l.match_id===match.id);
  const matchEvents=props.events.filter(e=>e.match_id===match.id);
  const parentPlayers=players.filter(p=>props.parentPlayerIds.includes(p.id));
  const responseRows=matchAttendance.filter(a=>["yes","no","maybe","present"].includes(a.status));
  const responseCount=new Set(responseRows.map(a=>a.player_id)).size;
  const presentCount=matchAttendance.filter(a=>a.status==="present"||a.status==="yes").length;
  const deltaIsHome=match.home_team.toLocaleLowerCase("pl-PL").includes("delta");
  const deltaGoals=matchEvents.filter(e=>e.event_type==="goal");
  const matchStarted=match.status==="scheduled"&&(match.home_score!==null||match.away_score!==null);
  const displayStatus=match.status==="played"?"ZAKOŃCZONY":match.status==="cancelled"?"ODWOŁANY":matchStarted?"TRWA":"PRZED MECZEM";
  const deltaScore=deltaIsHome?match.home_score:match.away_score;
  const opponentScore=deltaIsHome?match.away_score:match.home_score;

  // Obliczenia podsumowania obecności (Obecni, Nieobecni, Niezdecydowani, Razem)
  const attendanceStats = useMemo(() => {
    let present = 0;
    let absent = 0;
    let undecided = 0;

    players.forEach(p => {
      const row = matchAttendance.find(a => a.player_id === p.id);
      const s = row?.status;
      if (s === "present" || s === "yes") {
        present++;
      } else if (s === "no") {
        absent++;
      } else {
        undecided++;
      }
    });

    return {
      present,
      absent,
      undecided,
      total: players.length
    };
  }, [players, matchAttendance]);

  const filteredAttendancePlayers = useMemo(() => {
    if (attendanceFilter === "all") return players;
    return players.filter(p => {
      const row = matchAttendance.find(a => a.player_id === p.id);
      const s = row?.status;
      if (attendanceFilter === "present") return s === "present" || s === "yes";
      if (attendanceFilter === "absent") return s === "no";
      if (attendanceFilter === "undecided") return s !== "present" && s !== "yes" && s !== "no";
      return true;
    });
  }, [players, matchAttendance, attendanceFilter]);

  const selectedStarterIds=useMemo(
    ()=>new Set(matchLineup.filter(l=>l.is_starter).map(l=>l.player_id)),
    [matchLineup]
  );
  const starters=useMemo(()=>matchLineup.filter(l=>l.is_starter).map(l=>players.find(p=>p.id===l.player_id)).filter(Boolean).sort((a,b)=>positionOrder(a!.position)-positionOrder(b!.position)) as Player[],[matchLineup,players]);
  const substitutes=useMemo(()=>matchLineup.filter(l=>!l.is_starter).map(l=>players.find(p=>p.id===l.player_id)).filter(Boolean) as Player[],[matchLineup,players]);

  // Podgląd rodzica odświeża wynik i listę strzelców automatycznie co 15 s
  // w trakcie meczu; przycisk „Odśwież” działa także po zakończeniu spotkania.
  useEffect(()=>{
    if(match.status!=="scheduled"||!matchStarted)return;
    let active=true;
    const timer=window.setInterval(async()=>{
      const [m,e]=await Promise.all([
        supabase.from("matches").select("*").eq("id",match.id).single(),
        supabase.from("match_events").select("*").eq("match_id",match.id).order("created_at",{ascending:true})
      ]);
      if(!active||m.error||e.error)return;
      const currentEvents=(e.data||[]) as Event[];
      const localGoals=props.events.filter(row=>row.match_id===match.id);
      const changed=m.data.status!==match.status||m.data.home_score!==match.home_score||m.data.away_score!==match.away_score||
        currentEvents.length!==localGoals.length||currentEvents.some((row,index)=>row.id!==localGoals[index]?.id||row.player_id!==localGoals[index]?.player_id||row.assist_player_id!==localGoals[index]?.assist_player_id);
      if(changed)props.onDataChange({match:m.data,events:[...props.events.filter(row=>row.match_id!==match.id),...currentEvents]});
    },15000);
    return ()=>{active=false;window.clearInterval(timer);};
  },[match.id,match.status,match.home_score,match.away_score,matchStarted,props.events,props.onDataChange,supabase]);

  function confirmSaved(message="Zapisano"){
    setSaved(message);
    window.setTimeout(()=>setSaved(""),1800);
    router.refresh();
  }

  function triggerCelebration(kind:"goal"|"hattrick"|"mvp"){
    setCelebration(kind);
    window.setTimeout(()=>setCelebration(null),1500);
  }

  function responseStatus(playerId:string){
    return responseRows.find(a=>a.player_id===playerId)?.status||"";
  }

  function actualAttendance(playerId:string){
    const row=matchAttendance.find(a=>a.player_id===playerId);
    return row?.status==="present"||row?.status==="yes"?"present":row?.status==="no"?"no":"maybe";
  }

  async function saveMatchBasics(){
    if(saving||!canManageMatch)return;
    setSaving(true);
    try {
      const status=(document.getElementById("mc-status") as HTMLSelectElement)?.value||match.status;
      const hs=(document.getElementById("mc-hs") as HTMLInputElement)?.value??"";
      const as=(document.getElementById("mc-as") as HTMLInputElement)?.value??"";
      const venue=(document.getElementById("mc-venue") as HTMLInputElement)?.value??"";
      const time=(document.getElementById("mc-time") as HTMLInputElement)?.value??"";
      if((hs!==""&&(!Number.isInteger(Number(hs))||Number(hs)<0))||(as!==""&&(!Number.isInteger(Number(as))||Number(as)<0)))return setEventError("Wynik musi być nieujemną liczbą całkowitą.");
      const next={...match,status,home_score:hs===""?null:Number(hs),away_score:as===""?null:Number(as),venue,match_time:time||null};
      const {error}=await supabase.from("matches").update({status:next.status,home_score:next.home_score,away_score:next.away_score,venue:next.venue,match_time:next.match_time}).eq("id",match.id);
      if(error)return setEventError(error.message);
      setEventError("");props.onDataChange({match:next});confirmSaved("Mecz zapisany");
    } finally {setSaving(false);}
  }

  async function refreshMatch(){
    if(refreshing)return;
    setRefreshing(true);
    try {
      const [m,e]=await Promise.all([
        supabase.from("matches").select("*").eq("id",match.id).single(),
        supabase.from("match_events").select("*").eq("match_id",match.id).order("created_at",{ascending:true})
      ]);
      if(m.error||e.error)return setEventError(m.error?.message||e.error?.message||"Nie udało się odświeżyć meczu.");
      props.onDataChange({match:m.data,events:[...props.events.filter(row=>row.match_id!==match.id),...(e.data||[])]});
      setLastSync(new Date().toLocaleTimeString("pl-PL",{hour:"2-digit",minute:"2-digit",second:"2-digit"}));
    } finally {setRefreshing(false);}
  }

  async function changeMatchStatus(status:"scheduled"|"played"){
    if(matchBusy||!canManageMatch)return;
    setMatchBusy(true);setEventError("");
    try {
      const next={...match,status,home_score:match.home_score??0,away_score:match.away_score??0};
      const {error}=await supabase.from("matches").update({status:next.status,home_score:next.home_score,away_score:next.away_score}).eq("id",match.id);
      if(error)return setEventError(error.message);
      props.onDataChange({match:next});confirmSaved(status==="played"?"Mecz zakończony — można dalej poprawiać wynik i strzelców":"Mecz rozpoczęty");
    } finally {setMatchBusy(false);}
  }

  type ScoreKey="home_score"|"away_score";
  async function updateScoreIfCurrent(key:ScoreKey,expected:number|null,nextScore:number){
    let query=supabase.from("matches").update({[key]:nextScore}).eq("id",match.id);
    query=expected===null?query.is(key,null):query.eq(key,expected);
    const {data,error}=await query
      .select("id,round_no,match_date,match_time,venue,home_team,away_team,home_score,away_score,status")
      .maybeSingle();
    return {data:data as Match|null,error};
  }

  // Warunkowy zapis nie pozwala starszej kopii meczu nadpisać wyniku,
  // który w międzyczasie zmieniła inna osoba lub inne urządzenie.
  async function updateTeamScore(team:"delta"|"opponent",difference:number){
    if(eventBusy||!canEditEvents||match.status==="cancelled")return;
    setEventBusy(true);setEventError("");
    try {
      const key=(team==="delta"?deltaIsHome:!deltaIsHome)?"home_score":"away_score";
      const previousRaw=match[key];
      const previous=previousRaw??0;
      const nextScore=previous+difference;
      if(nextScore<0)return setEventError("Wynik nie może być ujemny.");
      const result=await updateScoreIfCurrent(key,previousRaw,nextScore);
      if(result.error)return setEventError(result.error.message);
      if(!result.data){
        await refreshMatch();
        return setEventError("Wynik zmienił się na innym urządzeniu. Dane zostały odświeżone — sprawdź wynik i spróbuj ponownie.");
      }
      props.onDataChange({match:result.data});confirmSaved(team==="opponent"?"Wynik przeciwnika zapisany":"Wynik DELTY zapisany");
    } finally {setEventBusy(false);}
  }

  async function setAttendance(playerId:string,status:string){
    const row={match_id:match.id,player_id:playerId,status,updated_by:props.currentUserId};
    const {error}=await supabase.from("match_attendance").upsert(row,{onConflict:"match_id,player_id"});
    if(error)return alert(error.message);
    props.onDataChange({attendance:[
      ...props.attendance.filter(a=>!(a.match_id===match.id&&a.player_id===playerId)),
      {match_id:match.id,player_id:playerId,status}
    ]});
    confirmSaved(status==="present"?"Obecność zapisana":status==="no"?"Nieobecność zapisana":status==="maybe"?"Zapisano: brak decyzji":"Odpowiedź zapisana");
  }

  async function toggleStarter(playerId:string){
    const current=matchLineup.find(l=>l.player_id===playerId);
    const starters=matchLineup.filter(l=>l.is_starter);
    if(!current?.is_starter&&starters.length>=6)return alert("Wyjściowa 6 może mieć maksymalnie 6 zawodników.");

    const row={match_id:match.id,player_id:playerId,is_starter:!current?.is_starter,is_captain:current?.is_starter?false:(current?.is_captain||false)};
    const {error}=await supabase.from("match_lineup").upsert(row,{onConflict:"match_id,player_id"});
    if(error)return alert(error.message);
    props.onDataChange({lineup:[
      ...props.lineup.filter(l=>!(l.match_id===match.id&&l.player_id===playerId)),
      row
    ]});
    if(row.is_starter && !["yes","maybe"].includes(responseStatus(playerId))) {
      await setAttendance(playerId,"present");
    } else {
      confirmSaved("Wyjściowa 6 zapisana");
    }
  }

  async function setCaptain(playerId:string){
    const oldCaptain=matchLineup.find(l=>l.is_captain);
    if(oldCaptain){
      await supabase.from("match_lineup").upsert({...oldCaptain,is_captain:false},{onConflict:"match_id,player_id"});
    }
    const current=matchLineup.find(l=>l.player_id===playerId);
    const row={match_id:match.id,player_id:playerId,is_starter:current?.is_starter||false,is_captain:true};
    const {error}=await supabase.from("match_lineup").upsert(row,{onConflict:"match_id,player_id"});
    if(error)return alert(error.message);

    const next=props.lineup
      .map(l=>l.match_id===match.id?{...l,is_captain:false}:l)
      .filter(l=>!(l.match_id===match.id&&l.player_id===playerId));
    props.onDataChange({lineup:[...next,row]});
    confirmSaved("Kapitan zapisany");
  }

  async function setPlayerPosition(playerId:string,position:string){
    const {error}=await supabase.from("players").update({position}).eq("id",playerId);
    if(error)return alert(error.message);
    confirmSaved("Pozycja zawodnika zapisana");
  }

  async function addGoal(){
    if(eventBusy||!canEditEvents||match.status==="cancelled")return;
    if(!scorerId)return setEventError("Wybierz strzelca bramki DELTY.");
    if(assistId&&assistId===scorerId)return setEventError("Strzelec nie może być jednocześnie asystentem tej bramki.");
    setEventBusy(true);setEventError("");
    try {
      if(editingGoalId){
        const {error}=await supabase.from("match_events").update({player_id:scorerId,assist_player_id:assistId||null}).eq("id",editingGoalId);
        if(error)return setEventError(error.message);
        props.onDataChange({events:props.events.map(e=>e.id===editingGoalId?{...e,player_id:scorerId,assist_player_id:assistId||null}:e)});
        setEditingGoalId(null);setScorerId("");setAssistId("");confirmSaved("Strzelec i asysta poprawieni");return;
      }
      const {data,error}=await supabase.from("match_events").insert({match_id:match.id,event_type:"goal",player_id:scorerId,assist_player_id:assistId||null}).select("*").single();
      if(error)return setEventError(error.message);
      const key=deltaIsHome?"home_score":"away_score";
      const previousRaw=match[key];
      const result=await updateScoreIfCurrent(key,previousRaw,(previousRaw??0)+1);
      if(result.error||!result.data){
        const rollback=await supabase.from("match_events").delete().eq("id",data.id);
        if(!result.error)await refreshMatch();
        setEventError(rollback.error
          ?"Bramka została zapisana, ale wynik nie został zaktualizowany. Sprawdź wynik i skoryguj go ręcznie."
          :result.error?`Nie zapisano wyniku: ${result.error.message}`
          :"Wynik zmienił się na innym urządzeniu. Cofnięto dodanie bramki i odświeżono dane — spróbuj ponownie.");
        if(rollback.error)props.onDataChange({events:[...props.events,data]});
        return;
      }
      props.onDataChange({events:[...props.events,data],match:result.data});
      const scorerGoals=deltaGoals.filter(e=>e.player_id===scorerId).length+1;
      setScorerId("");setAssistId("");triggerCelebration(scorerGoals>=3?"hattrick":"goal");confirmSaved("Bramka DELTY i wynik zapisane");
    } finally {setEventBusy(false);}
  }

  async function removeGoal(id:string){
    if(eventBusy||!canEditEvents)return;
    if(!window.confirm("Usunąć tę bramkę DELTY? Wynik zostanie pomniejszony o 1."))return;
    setEventBusy(true);setEventError("");
    try {
      const key=deltaIsHome?"home_score":"away_score";
      const previousRaw=match[key];
      const previous=previousRaw??0;
      if(previous<=0)return setEventError("Nie można odjąć bramki, gdy wynik DELTY wynosi 0.");
      const scoreResult=await updateScoreIfCurrent(key,previousRaw,previous-1);
      if(scoreResult.error)return setEventError(scoreResult.error.message);
      if(!scoreResult.data){
        await refreshMatch();
        return setEventError("Wynik zmienił się na innym urządzeniu. Niczego nie usunięto; dane zostały odświeżone.");
      }
      const {error}=await supabase.from("match_events").delete().eq("id",id);
      if(error){
        await updateScoreIfCurrent(key,previous-1,previous);
        await refreshMatch();
        return setEventError("Nie udało się usunąć bramki. Wynik został przywrócony: "+error.message);
      }
      props.onDataChange({events:props.events.filter(e=>e.id!==id),match:scoreResult.data});
      confirmSaved("Bramka usunięta — wynik i statystyki skorygowane");
    } finally {setEventBusy(false);}
  }

  function beginGoalEdit(e:Event){setEditingGoalId(e.id);setScorerId(e.player_id||"");setAssistId(e.assist_player_id||"");setTab("events");setEventError("");}

  async function setMvp(){
    const playerId=(document.getElementById("mc-mvp") as HTMLSelectElement)?.value;
    if(!playerId)return;
    const old=matchEvents.find(e=>e.event_type==="mvp");
    if(old)await supabase.from("match_events").delete().eq("id",old.id);
    const {data,error}=await supabase.from("match_events").insert({
      match_id:match.id,event_type:"mvp",player_id:playerId
    }).select("*").single();
    if(error)return alert(error.message);
    props.onDataChange({events:[
      ...props.events.filter(e=>!(e.match_id===match.id&&e.event_type==="mvp")),
      data
    ]});
    triggerCelebration("mvp");
    confirmSaved("MVP zapisany");
  }

  async function deleteEvent(id:string){
    const {error}=await supabase.from("match_events").delete().eq("id",id);
    if(error)return alert(error.message);
    props.onDataChange({events:props.events.filter(e=>e.id!==id)});
    confirmSaved("Zdarzenie usunięte");
  }

  const tabs:{id:Tab;label:string;icon:any;allowed?:boolean}[]=[
    {id:"summary",label:"Podsumowanie",icon:CalendarDays,allowed:true},
    {id:"attendance",label:"Obecność",icon:UserCheck,allowed:true},
    {id:"lineup",label:"Skład",icon:Users,allowed:canManageMatch},
    {id:"events",label:"Zdarzenia",icon:Goal,allowed:canEditEvents},
    {id:"mvp",label:"MVP",icon:Star,allowed:canEditEvents},
  ];

  const content = (
    <div className={props.embedded?"match-center-embedded":"match-center-overlay"} onClick={props.embedded?undefined:props.onClose}>
      {celebration&&<div className={`v101-celebration ${celebration}`} aria-hidden="true">
        <div className="v101-celebration-smoke"/><div className="v101-celebration-flare"/>
        <span>{celebration==="goal"?"GOOOL!":celebration==="hattrick"?"HAT-TRICK!":"MVP"}</span>
        <b>{celebration==="mvp"?"MOST VALUABLE PLAYER":"DELTA 2018 GM"}</b>
      </div>}
      <div className="match-center-sheet v85-match-center" onClick={e=>e.stopPropagation()}>
      <button className="close" onClick={props.onClose}>×</button>

      <div className="v85-match-head">
        <div>
          <div className="mc-kicker">{`${displayStatus} • CENTRUM MECZU`}</div>
          <h2>{formatTeamName(match.home_team)} <span>vs</span> {formatTeamName(match.away_team)}</h2>
          <p>{datePL(match.match_date)} • {match.match_time||"godzina do ustalenia"} • {match.venue||"miejsce do ustalenia"}</p>
        </div>
        <div className={`v85-match-score ${match.status==="played"?"v105-score-final":"v105-score-upcoming"}`}>
          {match.status==="played"||matchStarted?`${match.home_score??0}:${match.away_score??0}`:"VS"}
        </div>
      </div>

      <div className="v125-refresh-line">
        <button type="button" disabled={refreshing} onClick={refreshMatch}>{refreshing?"Odświeżanie…":"↻ Odśwież wynik i zdarzenia"}</button>
        <button type="button" className="v200-poster-top-btn" onClick={()=>setPosterOpen(true)} title="Generuj grafikę meczową do pobrania lub udostępnienia">
          <Download size={14}/> GRAFIKA MECZU
        </button>
        <button type="button" className="v200-poster-top-btn" onClick={()=>setBriefOpen(true)} title="Generuj gotowy komunikat zbiórki i odprawy dla rodziców">
          <Send size={14}/> KOMUNIKAT DLA RODZICÓW
        </button>
        <button type="button" className="v200-poster-top-btn" onClick={()=>setFanVotingOpen(true)} title="Głosowanie rodziców i kibiców na Zawodnika Meczu">
          <Heart size={14}/> GŁOSOWANIE KIBICÓW
        </button>
        <small>{matchStarted?"Podgląd meczu odświeża się automatycznie co 15 sekund.":""}{lastSync?` Ostatnie sprawdzenie: ${lastSync}`:""}</small>
      </div>
      {saved&&<div className="mc-saved" role="status">✓ {saved}</div>}
      {eventError&&<div className="v125-error" role="alert">{eventError}</div>}
      {canManageMatch&&match.status!=="cancelled"&&<div className="v125-match-control">
        <span className={`v125-status ${match.status==="played"?"finished":matchStarted?"live":"scheduled"}`}>{displayStatus}</span>
        {match.status==="scheduled"&&!matchStarted&&<button disabled={matchBusy} onClick={()=>changeMatchStatus("scheduled")}>▶ Rozpocznij mecz (0:0)</button>}
        {match.status==="scheduled"&&matchStarted&&<button disabled={matchBusy} onClick={()=>changeMatchStatus("played")}>■ Zakończ mecz</button>}
        {match.status==="played"&&<button disabled={matchBusy} onClick={()=>changeMatchStatus("scheduled")}>↻ Wznów mecz</button>}
        <small>Po zakończeniu możesz nadal poprawiać wynik, strzelców i asysty.</small>
      </div>}

      <nav className="v85-tabs">
        {tabs.filter(t=>t.allowed!==false).map(({id,label,icon:Icon})=>
          <button key={id} className={tab===id?"active":""} onClick={()=>setTab(id)}>
            <Icon size={16}/><span>{label}</span>
            {id==="attendance"&&<em>{attendanceStats.present}/{attendanceStats.total}</em>}
          </button>
        )}
      </nav>

      <div className="v85-tab-body">
        {tab==="summary"&&<>
          <div className="v105-match-headline"><span>{match.status==="played"?"WYNIK KOŃCOWY":matchStarted?"WYNIK NA ŻYWO":"NADCHODZĄCE SPOTKANIE"}</span><strong>{formatTeamName(match.home_team)}</strong><b>{match.status==="played"||matchStarted?`${match.home_score??0} : ${match.away_score??0}`:"VS"}</b><strong>{formatTeamName(match.away_team)}</strong></div><div className="v85-summary-grid">
            <div className="v85-summary-card"><span>TERMIN</span><b>{datePL(match.match_date)}</b><small>{match.match_time||"—"}</small></div>
            <div className="v85-summary-card"><span>MIEJSCE</span><b>{match.venue||"Do ustalenia"}</b><small>Kolejka {match.round_no||"—"}</small></div>
            <button className="v85-summary-card clickable" onClick={()=>setTab("attendance")}><span>OBECNI</span><b>{attendanceStats.present}/{attendanceStats.total}</b><small>Otwórz listę obecności <ChevronRight size={12}/></small></button>
            <div className="v85-summary-card"><span>WYJŚCIOWA 6</span><b>{selectedStarterIds.size}/6</b><small>{matchLineup.find(l=>l.is_captain)?"Kapitan wybrany":"Kapitan do ustalenia"}</small></div>
          </div>

          <div className="v109-match-story">
            <section className="v109-modal-pitch">
              <div className="v109-pitch-lines"/><span className="v124-pitch-end v124-pitch-end-top" aria-hidden="true"/><span className="v124-pitch-end v124-pitch-end-bottom" aria-hidden="true"/>
              {starters.map((p,index)=>{
                const li=matchLineup.find(l=>l.player_id===p.id);
                return <div className={`v109-pitch-person pos-${index+1}`} key={p.id}>
                  <span><PlayerPhoto playerId={p.id}/>{li?.is_captain&&<Crown size={14}/>}</span>
                  <b>{p.display_name.split(" ")[0]}</b><small>{p.position||"Pozycja"}</small>
                </div>;
              })}
              {!starters.length&&<div className="v109-pitch-hint">Ustaw pierwszą 6 w zakładce „Skład”</div>}
            </section>
            <aside className="v109-match-narrative">
              <div><span>ŁAWKA REZERWOWYCH</span>{substitutes.length?substitutes.map(p=><b key={p.id}>#{p.shirt_number||"—"} {p.display_name}</b>):<em>Nie wybrano rezerwowych</em>}</div>
              <div><span>BRAMKI I ASYSTY</span>{matchEvents.filter(e=>e.event_type==="goal").length?matchEvents.filter(e=>e.event_type==="goal").map(e=><b key={e.id}>⚽ {players.find(p=>p.id===e.player_id)?.display_name||"—"}{e.assist_player_id?` • as. ${players.find(p=>p.id===e.assist_player_id)?.display_name||"—"}`:""}</b>):<em>Relacja strzelecka pojawi się tutaj</em>}</div>
            </aside>
          </div>

          {canManageMatch&&<div className="mc-basics v85-basics">
            <label>Status<select id="mc-status" defaultValue={match.status}><option value="scheduled">Zaplanowany / trwa</option><option value="played">Zakończony</option><option value="cancelled">Odwołany</option></select></label>
            <label>Godzina<input id="mc-time" defaultValue={match.match_time||""}/></label>
            <label>Miejsce<input id="mc-venue" defaultValue={match.venue||""}/></label>
            <label>Gospodarz<input id="mc-hs" type="number" defaultValue={match.home_score??""}/></label>
            <label>Gość<input id="mc-as" type="number" defaultValue={match.away_score??""}/></label>
            <button className="mc-save" disabled={saving} onClick={saveMatchBasics}><Save size={16}/> {saving?"Zapisywanie…":"Zapisz mecz"}</button>
          </div>}

          {!canManageMatch&&!canEditEvents&&<button className="v85-parent-cta" onClick={()=>setTab("attendance")}><UserCheck size={18}/> POTWIERDŹ OBECNOŚĆ ZAWODNIKA <ChevronRight size={16}/></button>}
        </>}

        {tab==="attendance"&& (
          <div className="delta-att-tab-container">
            {/* 1. GŁÓWNA KARTA PODSUMOWANIA Z 4 KAFELKAMI KPI */}
            <div className="delta-att-header-card">
              <div className="delta-att-header-top">
                <div className="delta-att-title-wrap">
                  <div className="delta-att-icon-badge">
                    <UserCheck size={20} />
                  </div>
                  <div>
                    <h3>PODSUMOWANIE OBECNOŚCI</h3>
                    <p>Centrum zbiórki i weryfikacji składu meczowego DELTA</p>
                  </div>
                </div>

                <div className="delta-att-progress-bar-wrap">
                  <div className="delta-att-progress-labels">
                    <span>Zweryfikowano zawodników</span>
                    <strong>{attendanceStats.present + attendanceStats.absent} z {attendanceStats.total} ({attendanceStats.total > 0 ? Math.round(((attendanceStats.present + attendanceStats.absent) / attendanceStats.total) * 100) : 0}%)</strong>
                  </div>
                  <div className="delta-att-progress-track">
                    <div 
                      className="delta-att-progress-fill" 
                      style={{ width: `${Math.min(100, attendanceStats.total > 0 ? Math.round(((attendanceStats.present + attendanceStats.absent) / attendanceStats.total) * 100) : 0)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* 4 KAFELKI / BADGE (2x2 na mobile, 4x1 na desktopie) */}
              <div className="delta-att-kpi-grid">
                {/* 1. OBECNI (ZIELONY) */}
                <button 
                  type="button" 
                  className={`delta-att-kpi-tile tile-present ${attendanceFilter === "present" ? "active-filter" : ""}`}
                  onClick={() => setAttendanceFilter(prev => prev === "present" ? "all" : "present")}
                  title="Kliknij, aby filtrować tylko obecnych"
                >
                  <div className="delta-att-kpi-icon-wrap icon-present">
                    <UserCheck size={18} />
                  </div>
                  <div className="delta-att-kpi-body">
                    <span className="delta-att-kpi-label">OBECNI</span>
                    <strong className="delta-att-kpi-value value-present">{attendanceStats.present}</strong>
                  </div>
                  <span className="delta-att-kpi-badge badge-present">
                    {attendanceStats.total > 0 ? Math.round((attendanceStats.present / attendanceStats.total) * 100) : 0}%
                  </span>
                </button>

                {/* 2. NIEOBECNI (CZERWONY) */}
                <button 
                  type="button" 
                  className={`delta-att-kpi-tile tile-absent ${attendanceFilter === "absent" ? "active-filter" : ""}`}
                  onClick={() => setAttendanceFilter(prev => prev === "absent" ? "all" : "absent")}
                  title="Kliknij, aby filtrować tylko nieobecnych"
                >
                  <div className="delta-att-kpi-icon-wrap icon-absent">
                    <UserX size={18} />
                  </div>
                  <div className="delta-att-kpi-body">
                    <span className="delta-att-kpi-label">NIEOBECNI</span>
                    <strong className="delta-att-kpi-value value-absent">{attendanceStats.absent}</strong>
                  </div>
                  <span className="delta-att-kpi-badge badge-absent">
                    {attendanceStats.total > 0 ? Math.round((attendanceStats.absent / attendanceStats.total) * 100) : 0}%
                  </span>
                </button>

                {/* 3. NIEZDECYDOWANI (SZARY / BURSZTYN) */}
                <button 
                  type="button" 
                  className={`delta-att-kpi-tile tile-undecided ${attendanceFilter === "undecided" ? "active-filter" : ""}`}
                  onClick={() => setAttendanceFilter(prev => prev === "undecided" ? "all" : "undecided")}
                  title="Kliknij, aby filtrować niezdecydowanych"
                >
                  <div className="delta-att-kpi-icon-wrap icon-undecided">
                    <HelpCircle size={18} />
                  </div>
                  <div className="delta-att-kpi-body">
                    <span className="delta-att-kpi-label">NIEZDECYDOWANI</span>
                    <strong className="delta-att-kpi-value value-undecided">{attendanceStats.undecided}</strong>
                  </div>
                  <span className="delta-att-kpi-badge badge-undecided">
                    {attendanceStats.total > 0 ? Math.round((attendanceStats.undecided / attendanceStats.total) * 100) : 0}%
                  </span>
                </button>

                {/* 4. RAZEM (NEUTRALNY KLUBOWY ZŁOTY) */}
                <button 
                  type="button" 
                  className={`delta-att-kpi-tile tile-total ${attendanceFilter === "all" ? "active-filter" : ""}`}
                  onClick={() => setAttendanceFilter("all")}
                  title="Kliknij, aby pokazać wszystkich zawodników"
                >
                  <div className="delta-att-kpi-icon-wrap icon-total">
                    <Users size={18} />
                  </div>
                  <div className="delta-att-kpi-body">
                    <span className="delta-att-kpi-label">RAZEM</span>
                    <strong className="delta-att-kpi-value value-total">{attendanceStats.total}</strong>
                  </div>
                  <span className="delta-att-kpi-badge badge-total">100%</span>
                </button>
              </div>

              {/* Aktywny wskaźnik filtra */}
              {attendanceFilter !== "all" && (
                <div className="delta-att-filter-indicator">
                  <span>Filtr: <strong>{attendanceFilter === "present" ? "Tylko obecni" : attendanceFilter === "absent" ? "Tylko nieobecni" : "Tylko niezdecydowani"}</strong> ({filteredAttendancePlayers.length})</span>
                  <button type="button" onClick={() => setAttendanceFilter("all")} className="delta-att-clear-filter">
                    <X size={12} /> Pokaż wszystkich ({attendanceStats.total})
                  </button>
                </div>
              )}
            </div>

            {/* 2. LISTA ZAWODNIKÓW — KOMPAKTOWA, ERGONOMICZNA, TOUCH-FRIENDLY */}
            {canManageMatch ? (
              <div className="delta-att-players-list">
                {filteredAttendancePlayers.map(p => {
                  const actual = actualAttendance(p.id);
                  const response = responseStatus(p.id);

                  return (
                    <article key={p.id} className={`delta-att-row ${actual === "present" ? "row-present" : actual === "no" ? "row-absent" : "row-undecided"}`}>
                      {/* Lewa strona: Numer koszulki + Imię i Nazwisko + Pozycja + RSVP */}
                      <div className="delta-att-row-left">
                        <span className="delta-att-shirt-badge">#{p.shirt_number || "—"}</span>
                        <div className="delta-att-name-box">
                          <strong className="delta-att-player-name">{p.display_name}</strong>
                          <div className="delta-att-sub-info">
                            <span className="delta-att-pos">{p.position || "Zawodnik"}</span>
                            {response && (
                              <span className={`delta-att-rsvp-mini rsvp-${response}`}>
                                RSVP: {response === "yes" ? "Będzie" : response === "no" ? "Nie będzie" : "Nie wie"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Środkowa część: Plakietka Statusu */}
                      <div className="delta-att-row-status">
                        <span className={`delta-att-status-pill status-${actual}`}>
                          {actual === "present" ? (
                            <><Check size={12} /> OBECNY</>
                          ) : actual === "no" ? (
                            <><X size={12} /> NIEOBECNY</>
                          ) : (
                            <><HelpCircle size={12} /> BRAK DECYZJI</>
                          )}
                        </span>
                      </div>

                      {/* Prawa część: Przyciski akcji (Obecny, Nieobecny, Brak decyzji) */}
                      <div className="delta-att-action-buttons">
                        <button
                          type="button"
                          onClick={() => setAttendance(p.id, "present")}
                          className={`delta-att-btn btn-present ${actual === "present" ? "active" : ""}`}
                          title="Oznacz jako obecny"
                        >
                          <Check size={14} />
                          <span>Obecny</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setAttendance(p.id, "no")}
                          className={`delta-att-btn btn-absent ${actual === "no" ? "active" : ""}`}
                          title="Oznacz jako nieobecny"
                        >
                          <X size={14} />
                          <span>Nieobecny</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setAttendance(p.id, "maybe")}
                          className={`delta-att-btn btn-undecided ${actual === "maybe" ? "active" : ""}`}
                          title="Resetuj status do braku decyzji"
                        >
                          <HelpCircle size={14} />
                          <span>Reset</span>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="delta-att-parent-container">
                {parentPlayers.length === 0 ? (
                  <div className="delta-att-empty-state">
                    <UserCheck size={32} className="text-gold" />
                    <h4>Brak przypisanego zawodnika</h4>
                    <p>Do Twojego konta rodzica nie przypisano jeszcze profilu zawodnika. Skontaktuj się z trenerem drużyny.</p>
                  </div>
                ) : (
                  <div className="delta-att-players-list">
                    {parentPlayers.map(p => {
                      const status = responseStatus(p.id);

                      return (
                        <article key={p.id} className={`delta-att-row ${status === "yes" ? "row-present" : status === "no" ? "row-absent" : "row-undecided"}`}>
                          <div className="delta-att-row-left">
                            <span className="delta-att-shirt-badge">#{p.shirt_number || "—"}</span>
                            <div className="delta-att-name-box">
                              <strong className="delta-att-player-name">{p.display_name}</strong>
                              <span className="delta-att-pos">{p.position || "Zawodnik DELTA"}</span>
                            </div>
                          </div>

                          <div className="delta-att-row-status">
                            <span className={`delta-att-status-pill status-${status === "yes" ? "present" : status === "no" ? "no" : "maybe"}`}>
                              {status === "yes" ? "Deklaracja: Będzie" : status === "no" ? "Deklaracja: Nie będzie" : "Brak deklaracji"}
                            </span>
                          </div>

                          <div className="delta-att-action-buttons">
                            <button
                              type="button"
                              onClick={() => setAttendance(p.id, "yes")}
                              className={`delta-att-btn btn-present ${status === "yes" ? "active" : ""}`}
                            >
                              <Check size={14} />
                              <span>Będzie</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setAttendance(p.id, "no")}
                              className={`delta-att-btn btn-absent ${status === "no" ? "active" : ""}`}
                            >
                              <X size={14} />
                              <span>Nie będzie</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setAttendance(p.id, "maybe")}
                              className={`delta-att-btn btn-undecided ${status === "maybe" ? "active" : ""}`}
                            >
                              <HelpCircle size={14} />
                              <span>Nie wiem</span>
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Bezpieczny odstęp dolny na telefonach zapobiegający zasłanianiu przez dolne menu */}
            <div className="delta-att-bottom-spacer" aria-hidden="true" />
          </div>
        )}

        {canManageMatch&&tab==="lineup"&&<>
          <div className="v85-section-intro"><Users size={19}/><div><b>Wyjściowa 6 i kapitan</b><span>Wybierz do sześciu zawodników. „Usuń z 6” zwalnia miejsce bez zmiany obecności.</span></div><strong>{selectedStarterIds.size}/6</strong></div>
          <div className="v85-lineup-grid">
            {players.map(p=>{
              const li=matchLineup.find(l=>l.player_id===p.id);
              return <div className={`v85-lineup-player ${li?.is_starter?"starter":""} ${li?.is_captain?"captain":""}`} key={p.id}>
                <span className="v82-shirt">#{p.shirt_number||"—"}</span>
                <b>{p.display_name}</b>
                <small>{p.position||"Zawodnik"}</small>
                <select className="v109-position-select" value={p.position||""} onChange={e=>setPlayerPosition(p.id,e.target.value)}>
                  <option value="">Pozycja</option><option value="Bramkarz">Bramkarz</option><option value="Obrońca">Obrońca</option><option value="Pomocnik">Pomocnik</option><option value="Napastnik">Napastnik</option>
                </select>
                <div>
                  <button className={li?.is_starter?"active":""} onClick={()=>toggleStarter(p.id)}>{li?.is_starter?"Usuń z 6":"Dodaj do 6"}</button>
                  <button className={li?.is_captain?"active captain":""} onClick={()=>setCaptain(p.id)}><Crown size={13}/> Kapitan</button>
                </div>
              </div>
            })}
          </div>
        </>}

        {canEditEvents&&tab==="events"&&<>
          <div className="v125-match-board">
            <div className="v125-score-team"><small>DELTA 2018 GM</small><strong>{deltaScore??0}</strong><span>{match.status==="played"?"Wynik końcowy":matchStarted?"Na żywo":"Przed meczem"}</span></div>
            <span className="v125-score-colon">:</span>
            <div className="v125-score-team"><small>{deltaIsHome?match.away_team:match.home_team}</small><strong>{opponentScore??0}</strong><span>Przeciwnik</span></div>
          </div>
          <div className="v85-events-layout v125-events-layout">
            <div className="mc-box v85-event-form v125-goal-form">
              <div className="mc-title"><Goal size={18}/> {editingGoalId?"Popraw bramkę DELTY":"+ Bramka DELTY"}</div>
              <label>Strzelec — wymagany<select id="mc-scorer" value={scorerId} disabled={eventBusy} onChange={e=>setScorerId(e.target.value)}><option value="">Wybierz strzelca</option>{players.map(p=><option key={p.id} value={p.id}>{p.display_name}</option>)}</select></label>
              <label>Asysta — opcjonalna<select id="mc-assist" value={assistId} disabled={eventBusy} onChange={e=>setAssistId(e.target.value)}><option value="">Bez asysty / uzupełnię później</option>{players.filter(p=>p.id!==scorerId).map(p=><option key={p.id} value={p.id}>{p.display_name}</option>)}</select></label>
              <button type="button" disabled={eventBusy||!scorerId} onClick={addGoal}>{eventBusy?"Zapisywanie…":editingGoalId?"Zapisz poprawkę":"Zatwierdź bramkę +1"}</button>
              {editingGoalId&&<button type="button" disabled={eventBusy} className="v125-secondary" onClick={()=>{setEditingGoalId(null);setScorerId("");setAssistId("");}}>Anuluj edycję</button>}
              <small>Każda nowa bramka DELTY wymaga wyboru strzelca i aktualizuje wynik. Poprawa strzelca lub asysty nie dodaje kolejnej bramki.</small>
            </div>
            <div className="mc-box v125-opponent-form">
              <div className="mc-title"><Goal size={18}/> Bramka przeciwnika</div>
              <p>Bez wybierania zawodnika. Wynik można później skorygować.</p>
              <button type="button" disabled={eventBusy} onClick={()=>updateTeamScore("opponent",1)}>+1 dla przeciwnika</button>
              <button type="button" disabled={eventBusy||(opponentScore??0)<=0} className="v125-secondary" onClick={()=>updateTeamScore("opponent",-1)}>−1 Cofnij bramkę przeciwnika</button>
            </div>
            <div className="v85-event-list v125-event-list">
              <div className="mc-title"><Trophy size={18}/> Bramki DELTY ({deltaGoals.length})</div>
              {deltaGoals.length===0&&<div className="muted">Brak zapisanych bramek DELTY.</div>}
              {deltaGoals.map(e=>{
                const scorer=players.find(p=>p.id===e.player_id)?.display_name||"Nieznany zawodnik";
                const assist=players.find(p=>p.id===e.assist_player_id)?.display_name;
                return <div className="v85-event-row" key={e.id}><span>⚽ <b>{scorer}</b>{assist?` • asysta: ${assist}`:" • bez asysty"}</span><div className="v10-event-tools"><button type="button" disabled={eventBusy} onClick={()=>beginGoalEdit(e)}>Edytuj</button><button type="button" disabled={eventBusy} onClick={()=>removeGoal(e.id)}>Usuń −1</button></div></div>;
              })}
              {deltaScore!==null&&deltaScore!==deltaGoals.length&&<div className="v125-warning">Wynik DELTY ({deltaScore}) różni się od liczby wpisanych strzelców ({deltaGoals.length}). Sprawdź historię spotkania i w razie potrzeby popraw wynik w „Podsumowaniu”.</div>}
            </div>
          </div>
        </>}

        {canEditEvents&&tab==="mvp"&&<>
          <div className="v85-mvp">
            <Star size={34}/>
            <h3>MVP meczu</h3>
            <p>Wybierz zawodnika meczu. Informacja trafi do statystyk i profilu zawodnika.</p>
            <select id="mc-mvp" defaultValue={matchEvents.find(e=>e.event_type==="mvp")?.player_id||""}>
              <option value="">Wybierz zawodnika</option>
              {players.map(p=><option key={p.id} value={p.id}>{p.display_name}</option>)}
            </select>
            <button onClick={setMvp}><Star size={16}/> Zapisz MVP</button>
            {matchEvents.find(e=>e.event_type==="mvp")&&<div className="v85-current-mvp"><ShieldCheck size={17}/> Aktualny MVP: <b>{players.find(p=>p.id===matchEvents.find(e=>e.event_type==="mvp")?.player_id)?.display_name}</b></div>}
            
            <div style={{ marginTop: "18px", paddingTop: "18px", borderTop: "1px solid rgba(255,255,255,0.08)", width: "100%" }}>
              <button 
                type="button" 
                className="v200-btn-claim-chest" 
                onClick={()=>setFanVotingOpen(true)} 
                style={{ width: "100%", justifyContent: "center" }}
              >
                <Heart size={16}/> GŁOSOWANIE RODZICÓW: SERDUSZKO TRYBUN ❤️
              </button>
            </div>
          </div>
        </>}
      </div>
    </div>
    {posterOpen && (
      <MatchPosterModal
        isOpen={posterOpen}
        onClose={() => setPosterOpen(false)}
        match={match}
        players={players}
        events={props.events}
        lineup={props.lineup}
      />
    )}
    {briefOpen && (
      <DeltaMatchBriefModal
        isOpen={briefOpen}
        onClose={() => setBriefOpen(false)}
        matches={[match]}
      />
    )}
    {fanVotingOpen && (
      <DeltaFanVotingModal
        isOpen={fanVotingOpen}
        onClose={() => setFanVotingOpen(false)}
        match={match}
        players={players}
      />
    )}
  </div>
  );

  if (!props.embedded && typeof document !== "undefined") {
    return createPortal(content, document.body);
  }
  return content;
}
