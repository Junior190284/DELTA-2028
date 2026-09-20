"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PlayerPhoto from "./PlayerPhoto";
import {
  CalendarDays, Check, ChevronRight, Crown, Goal, Save, ShieldCheck,
  Star, Trophy, UserCheck, Users, X
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
  const [saving,setSaving]=useState(false);
  const [saved,setSaved]=useState("");
  const [celebration,setCelebration]=useState<"goal"|"hattrick"|"mvp"|null>(null);

  const matchAttendance=props.attendance.filter(a=>a.match_id===match.id);
  const matchLineup=props.lineup.filter(l=>l.match_id===match.id);
  const matchEvents=props.events.filter(e=>e.match_id===match.id);
  const parentPlayers=players.filter(p=>props.parentPlayerIds.includes(p.id));
  const responseRows=matchAttendance.filter(a=>["yes","no","maybe"].includes(a.status));
  const responseCount=new Set(responseRows.map(a=>a.player_id)).size;
  const presentCount=matchAttendance.filter(a=>a.status==="present"||a.status==="yes").length;

  const selectedStarterIds=useMemo(
    ()=>new Set(matchLineup.filter(l=>l.is_starter).map(l=>l.player_id)),
    [matchLineup]
  );
  const starters=useMemo(()=>matchLineup.filter(l=>l.is_starter).map(l=>players.find(p=>p.id===l.player_id)).filter(Boolean).sort((a,b)=>positionOrder(a!.position)-positionOrder(b!.position)) as Player[],[matchLineup,players]);
  const substitutes=useMemo(()=>matchLineup.filter(l=>!l.is_starter).map(l=>players.find(p=>p.id===l.player_id)).filter(Boolean) as Player[],[matchLineup,players]);

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
    setSaving(true);
    let status=(document.getElementById("mc-status") as HTMLSelectElement)?.value||match.status;
    const hs=(document.getElementById("mc-hs") as HTMLInputElement)?.value??"";
    const as=(document.getElementById("mc-as") as HTMLInputElement)?.value??"";
    const venue=(document.getElementById("mc-venue") as HTMLInputElement)?.value??"";
    const time=(document.getElementById("mc-time") as HTMLInputElement)?.value??"";
    if(status!=="cancelled"&&hs!==""&&as!=="")status="played";

    const next={...match,status,home_score:hs===""?null:Number(hs),away_score:as===""?null:Number(as),venue,match_time:time||null};
    const {error}=await supabase.from("matches").update({
      status:next.status,home_score:next.home_score,away_score:next.away_score,
      venue:next.venue,match_time:next.match_time
    }).eq("id",match.id);
    setSaving(false);
    if(error)return alert(error.message);
    props.onDataChange({match:next});
    confirmSaved("Mecz zapisany");
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
    const scorer=(document.getElementById("mc-scorer") as HTMLSelectElement)?.value;
    const assist=(document.getElementById("mc-assist") as HTMLSelectElement)?.value||null;
    if(!scorer)return;
    const {data,error}=await supabase.from("match_events").insert({
      match_id:match.id,event_type:"goal",player_id:scorer,assist_player_id:assist
    }).select("*").single();
    if(error)return alert(error.message);
    props.onDataChange({events:[...props.events,data]});
    const scorerGoals=matchEvents.filter(e=>e.event_type==="goal"&&e.player_id===scorer).length+1;
    triggerCelebration(scorerGoals>=3?"hattrick":"goal");
    confirmSaved("Gol zapisany");
  }

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

  async function editGoal(id:string){
    const e=props.events.find(x=>x.id===id);
    if(!e)return;
    const currentScorer=players.find(p=>p.id===e.player_id)?.display_name||"";
    const currentAssist=players.find(p=>p.id===e.assist_player_id)?.display_name||"";
    const scorerName=prompt("Strzelec gola",currentScorer); if(scorerName===null)return;
    const scorer=players.find(p=>p.display_name.toLowerCase()===scorerName.trim().toLowerCase());
    if(!scorer)return alert("Nie znaleziono zawodnika.");
    const assistName=prompt("Asysta (puste = brak)",currentAssist); if(assistName===null)return;
    let assistId:string|null=null;
    if(assistName.trim()){
      const assist=players.find(p=>p.display_name.toLowerCase()===assistName.trim().toLowerCase());
      if(!assist)return alert("Nie znaleziono zawodnika dla asysty.");
      assistId=assist.id;
    }
    const {error}=await supabase.from("match_events").update({player_id:scorer.id,assist_player_id:assistId}).eq("id",id);
    if(error)return alert(error.message);
    props.onDataChange({events:props.events.map(x=>x.id===id?{...x,player_id:scorer.id,assist_player_id:assistId}:x)});
    confirmSaved("Gol poprawiony");
  }

  const tabs:{id:Tab;label:string;icon:any;allowed?:boolean}[]=[
    {id:"summary",label:"Podsumowanie",icon:CalendarDays,allowed:true},
    {id:"attendance",label:"Obecność",icon:UserCheck,allowed:true},
    {id:"lineup",label:"Skład",icon:Users,allowed:canManageMatch},
    {id:"events",label:"Zdarzenia",icon:Goal,allowed:canEditEvents},
    {id:"mvp",label:"MVP",icon:Star,allowed:canEditEvents},
  ];

  return <div className={props.embedded?"match-center-embedded":"match-center-overlay"} onClick={props.embedded?undefined:props.onClose}>
    {celebration&&<div className={`v101-celebration ${celebration}`} aria-hidden="true">
      <div className="v101-celebration-smoke"/><div className="v101-celebration-flare"/>
      <span>{celebration==="goal"?"GOOOL!":celebration==="hattrick"?"HAT-TRICK!":"MVP"}</span>
      <b>{celebration==="mvp"?"MOST VALUABLE PLAYER":"DELTA 2018 GM"}</b>
    </div>}
    <div className="match-center-sheet v85-match-center" onClick={e=>e.stopPropagation()}>
      <button className="close" onClick={props.onClose}>×</button>

      <div className="v85-match-head">
        <div>
          <div className="mc-kicker">{match.status==="played"?"PO MECZU • PODSUMOWANIE":"PRZED MECZEM • CENTRUM MECZU"}</div>
          <h2>{match.home_team} <span>vs</span> {match.away_team}</h2>
          <p>{datePL(match.match_date)} • {match.match_time||"godzina do ustalenia"} • {match.venue||"miejsce do ustalenia"}</p>
        </div>
        <div className={`v85-match-score ${match.status==="played"?"v105-score-final":"v105-score-upcoming"}`}>
          {match.status==="played"?`${match.home_score??0}:${match.away_score??0}`:"VS"}
        </div>
      </div>

      {saved&&<div className="mc-saved">✓ {saved}</div>}

      <nav className="v85-tabs">
        {tabs.filter(t=>t.allowed!==false).map(({id,label,icon:Icon})=>
          <button key={id} className={tab===id?"active":""} onClick={()=>setTab(id)}>
            <Icon size={16}/><span>{label}</span>
            {id==="attendance"&&<em>{responseCount}/{players.length}</em>}
          </button>
        )}
      </nav>

      <div className="v85-tab-body">
        {tab==="summary"&&<>
          <div className="v105-match-headline"><span>{match.status==="played"?"WYNIK KOŃCOWY":"NADCHODZĄCE SPOTKANIE"}</span><strong>{match.home_team}</strong><b>{match.status==="played"?`${match.home_score??0} : ${match.away_score??0}`:"VS"}</b><strong>{match.away_team}</strong></div><div className="v85-summary-grid">
            <div className="v85-summary-card"><span>TERMIN</span><b>{datePL(match.match_date)}</b><small>{match.match_time||"—"}</small></div>
            <div className="v85-summary-card"><span>MIEJSCE</span><b>{match.venue||"Do ustalenia"}</b><small>Kolejka {match.round_no||"—"}</small></div>
            <button className="v85-summary-card clickable" onClick={()=>setTab("attendance")}><span>POTWIERDZENIA</span><b>{responseCount}/{players.length}</b><small>Otwórz listę obecności <ChevronRight size={12}/></small></button>
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
            <label>Status<select id="mc-status" defaultValue={match.status}><option value="scheduled">Zaplanowany</option><option value="played">Rozegrany</option><option value="cancelled">Odwołany</option></select></label>
            <label>Godzina<input id="mc-time" defaultValue={match.match_time||""}/></label>
            <label>Miejsce<input id="mc-venue" defaultValue={match.venue||""}/></label>
            <label>Gospodarz<input id="mc-hs" type="number" defaultValue={match.home_score??""}/></label>
            <label>Gość<input id="mc-as" type="number" defaultValue={match.away_score??""}/></label>
            <button className="mc-save" onClick={saveMatchBasics}><Save size={16}/> {saving?"Zapisywanie…":"Zapisz mecz"}</button>
          </div>}

          {!canManageMatch&&!canEditEvents&&<button className="v85-parent-cta" onClick={()=>setTab("attendance")}><UserCheck size={18}/> POTWIERDŹ OBECNOŚĆ ZAWODNIKA <ChevronRight size={16}/></button>}
        </>}

        {tab==="attendance"&&<>
          <div className="v85-attendance-head">
            <div><UserCheck size={20}/><div><b>Lista obecności</b><span>Potwierdzono {responseCount} z {players.length}</span></div></div>
            <div className="v85-progress"><i style={{width:`${players.length?Math.min(100,responseCount/players.length*100):0}%`}}/></div>
          </div>

          {canManageMatch?<div className="v85-attendance-table">
            {players.map(p=>{
              const response=responseStatus(p.id);
              const actual=actualAttendance(p.id);
              return <div className="v85-attendance-row" key={p.id}>
                <span className="v82-shirt">#{p.shirt_number||"—"}</span>
                <div className="v85-player-name"><b>{p.display_name}</b><small>{p.position||"Zawodnik"}</small></div>
                <span className={`v82-status ${response||"empty"}`}>{response==="yes"?"Będzie":response==="no"?"Nie będzie":response==="maybe"?"Nie wiem":"Brak odpowiedzi"}</span>
                <div className="v85-actual-actions">
                  <button className={actual==="present"?"active yes":""} onClick={()=>setAttendance(p.id,"present")}><Check size={13}/> Obecny</button>
                  <button className={actual==="no"?"active no":""} onClick={()=>setAttendance(p.id,"no")}><X size={13}/> Nieobecny</button>
                  <button className={actual==="maybe"?"active maybe":""} onClick={()=>setAttendance(p.id,"maybe")}>Brak decyzji</button>
                </div>
              </div>
            })}
          </div>:<div className="v85-parent-list">
            {parentPlayers.length===0&&<div className="v82-rsvp-empty">Do konta nie przypisano jeszcze zawodnika.</div>}
            {parentPlayers.map(p=>{
              const status=responseStatus(p.id);
              return <div className="v85-parent-player" key={p.id}>
                <div className="v85-parent-player-name"><span className="v82-shirt">#{p.shirt_number||"—"}</span><div><b>{p.display_name}</b><small>{p.position||"Zawodnik"}</small></div></div>
                <div className="v82-rsvp-actions v85-parent-actions">
                  <button className={status==="yes"?"active yes":""} onClick={()=>setAttendance(p.id,"yes")}><Check size={15}/> Będzie</button>
                  <button className={status==="no"?"active no":""} onClick={()=>setAttendance(p.id,"no")}><X size={15}/> Nie będzie</button>
                  <button className={status==="maybe"?"active maybe":""} onClick={()=>setAttendance(p.id,"maybe")}>Nie wiem</button>
                </div>
              </div>
            })}
          </div>}
        </>}

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
          <div className="v85-events-layout">
            <div className="mc-box v85-event-form">
              <div className="mc-title"><Goal size={18}/> Dodaj bramkę</div>
              <select id="mc-scorer"><option value="">Strzelec</option>{players.map(p=><option key={p.id} value={p.id}>{p.display_name}</option>)}</select>
              <select id="mc-assist"><option value="">Bez asysty</option>{players.map(p=><option key={p.id} value={p.id}>{p.display_name}</option>)}</select>
              <button onClick={addGoal}>Dodaj gola</button>
            </div>
            <div className="v85-event-list">
              <div className="mc-title"><Trophy size={18}/> Zdarzenia meczu</div>
              {matchEvents.filter(e=>e.event_type==="goal").length===0&&<div className="muted">Brak zapisanych bramek.</div>}
              {matchEvents.filter(e=>e.event_type==="goal").map(e=>{
                const scorer=players.find(p=>p.id===e.player_id)?.display_name||"?";
                const assist=players.find(p=>p.id===e.assist_player_id)?.display_name;
                return <div className="v85-event-row" key={e.id}><span>⚽ <b>{scorer}</b>{assist?` • asysta ${assist}`:""}</span><div className="v10-event-tools"><button onClick={()=>editGoal(e.id)}>Edytuj</button><button onClick={()=>deleteEvent(e.id)}>Usuń</button></div></div>
              })}
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
          </div>
        </>}
      </div>
    </div>
  </div>;
}
