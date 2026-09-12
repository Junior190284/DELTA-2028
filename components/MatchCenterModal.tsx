"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Crown, Goal, Star, Check, X, Save, Users, Trophy } from "lucide-react";

type Player={id:string;display_name:string;shirt_number:string|null;position:string|null;photo_path:string|null;active:boolean};
type Match={id:string;round_no:number|null;match_date:string;match_time:string|null;venue:string|null;home_team:string;away_team:string;home_score:number|null;away_score:number|null;status:string};
type Attendance={match_id:string;player_id:string;status:string};
type Lineup={match_id:string;player_id:string;is_starter:boolean;is_captain:boolean};
type Event={id:string;match_id:string;event_type:string;player_id:string|null;assist_player_id:string|null;minute:number|null;created_at:string};

export default function MatchCenterModal(props:{
  match:Match;
  players:Player[];
  attendance:Attendance[];
  lineup:Lineup[];
  events:Event[];
  currentUserId:string;
  onClose:()=>void;
  onDataChange:(data:{match?:Match;attendance?:Attendance[];lineup?:Lineup[];events?:Event[]})=>void;
}) {
  const supabase=createClient();
  const router=useRouter();
  const {match,players}=props;
  const [saving,setSaving]=useState(false);
  const [saved,setSaved]=useState("");

  function confirmSaved(message="Zapisano") {
    setSaved(message);
    window.setTimeout(()=>setSaved(""),1800);
    router.refresh();
  }

  const matchAttendance=props.attendance.filter(a=>a.match_id===match.id);
  const matchLineup=props.lineup.filter(l=>l.match_id===match.id);
  const matchEvents=props.events.filter(e=>e.match_id===match.id);

  async function saveMatchBasics(){
    setSaving(true);
    let status=(document.getElementById("mc-status") as HTMLSelectElement).value;
    const hs=(document.getElementById("mc-hs") as HTMLInputElement).value;
    const as=(document.getElementById("mc-as") as HTMLInputElement).value;
    const venue=(document.getElementById("mc-venue") as HTMLInputElement).value;
    const time=(document.getElementById("mc-time") as HTMLInputElement).value;
    if (status !== "cancelled" && hs !== "" && as !== "") status = "played";
    const next={...match,status,home_score:hs===""?null:Number(hs),away_score:as===""?null:Number(as),venue,match_time:time||null};
    const {error}=await supabase.from("matches").update({
      status:next.status,home_score:next.home_score,away_score:next.away_score,venue:next.venue,match_time:next.match_time
    }).eq("id",match.id);
    setSaving(false);
    if(error) return alert(error.message);
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
    confirmSaved("Obecność zapisana");
  }

  async function toggleStarter(playerId:string){
    const current=matchLineup.find(l=>l.player_id===playerId);
    const starters=matchLineup.filter(l=>l.is_starter);
    if(!current?.is_starter && starters.length>=6)return alert("Wyjściowa 6 może mieć maksymalnie 6 zawodników.");
    const row={match_id:match.id,player_id:playerId,is_starter:!current?.is_starter,is_captain:current?.is_captain||false};
    const {error}=await supabase.from("match_lineup").upsert(row,{onConflict:"match_id,player_id"});
    if(error)return alert(error.message);
    props.onDataChange({lineup:[
      ...props.lineup.filter(l=>!(l.match_id===match.id&&l.player_id===playerId)),
      row
    ]});
    confirmSaved("Wyjściowa 6 zapisana");
    if(row.is_starter) await setAttendance(playerId,"present");
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
    await setAttendance(playerId,"present");
  }

  async function addGoal(){
    const scorer=(document.getElementById("mc-scorer") as HTMLSelectElement).value;
    const assist=(document.getElementById("mc-assist") as HTMLSelectElement).value||null;
    if(!scorer)return;
    const {data,error}=await supabase.from("match_events").insert({
      match_id:match.id,event_type:"goal",player_id:scorer,assist_player_id:assist
    }).select("*").single();
    if(error)return alert(error.message);
    props.onDataChange({events:[...props.events,data]});
    confirmSaved("Gol zapisany");
  }

  async function setMvp(){
    const playerId=(document.getElementById("mc-mvp") as HTMLSelectElement).value;
    if(!playerId)return;
    const old=matchEvents.find(e=>e.event_type==="mvp");
    if(old) await supabase.from("match_events").delete().eq("id",old.id);
    const {data,error}=await supabase.from("match_events").insert({
      match_id:match.id,event_type:"mvp",player_id:playerId
    }).select("*").single();
    if(error)return alert(error.message);
    props.onDataChange({events:[
      ...props.events.filter(e=>!(e.match_id===match.id&&e.event_type==="mvp")),
      data
    ]});
    confirmSaved("MVP zapisany");
  }

  async function deleteEvent(id:string){
    const {error}=await supabase.from("match_events").delete().eq("id",id);
    if(error)return alert(error.message);
    props.onDataChange({events:props.events.filter(e=>e.id!==id)});
    confirmSaved("Zdarzenie usunięte");
  }

  return <div className="match-center-overlay" onClick={props.onClose}>
    <div className="match-center-sheet" onClick={e=>e.stopPropagation()}>
      <button className="close" onClick={props.onClose}>×</button>
      <div className="mc-kicker">CENTRUM MECZU</div>
      {saved && <div className="mc-saved">✓ {saved}</div>}
      <h2>{match.home_team} <span>vs</span> {match.away_team}</h2>

      <div className="mc-basics">
        <label>Status<select id="mc-status" defaultValue={match.status}><option value="scheduled">Zaplanowany</option><option value="played">Rozegrany</option><option value="cancelled">Odwołany</option></select></label>
        <label>Godzina<input id="mc-time" defaultValue={match.match_time||""}/></label>
        <label>Miejsce<input id="mc-venue" defaultValue={match.venue||""}/></label>
        <label>Wynik gospodarza<input id="mc-hs" type="number" defaultValue={match.home_score??""}/></label>
        <label>Wynik gościa<input id="mc-as" type="number" defaultValue={match.away_score??""}/></label>
        <button className="mc-save" onClick={saveMatchBasics}><Save size={16}/> {saving?"Zapisywanie…":"Zapisz mecz"}</button>
      </div>

      <div className="mc-title"><Users size={18}/> Obecność • wyjściowa 6 • kapitan</div>
      <div className="mc-roster">
        {players.map(p=>{
          const att=matchAttendance.find(a=>a.player_id===p.id)?.status||"";
          const li=matchLineup.find(l=>l.player_id===p.id);
          return <div className="mc-player" key={p.id}>
            <strong>{p.display_name}</strong>
            <div className="mc-actions">
              <button className={att==="present"?"on":""} onClick={()=>setAttendance(p.id,"present")}><Check size={14}/> Obecny</button>
              <button className={att==="no"?"on danger":""} onClick={()=>setAttendance(p.id,"no")}><X size={14}/> Nie</button>
              <button className={li?.is_starter?"on gold":""} onClick={()=>toggleStarter(p.id)}>Wyjściowa 6</button>
              <button className={li?.is_captain?"on gold":""} onClick={()=>setCaptain(p.id)}><Crown size={14}/> Kapitan</button>
            </div>
          </div>
        })}
      </div>

      <div className="mc-event-grid">
        <div className="mc-box">
          <div className="mc-title"><Goal size={18}/> Bramka</div>
          <select id="mc-scorer"><option value="">Strzelec</option>{players.map(p=><option key={p.id} value={p.id}>{p.display_name}</option>)}</select>
          <select id="mc-assist"><option value="">Bez asysty</option>{players.map(p=><option key={p.id} value={p.id}>{p.display_name}</option>)}</select>
          <button onClick={addGoal}>Dodaj gola</button>
        </div>
        <div className="mc-box">
          <div className="mc-title"><Star size={18}/> MVP</div>
          <select id="mc-mvp"><option value="">Wybierz MVP</option>{players.map(p=><option key={p.id} value={p.id}>{p.display_name}</option>)}</select>
          <button onClick={setMvp}>Ustaw MVP</button>
        </div>
      </div>

      <div className="mc-title"><Trophy size={18}/> Zdarzenia meczu</div>
      <div className="mc-events">
        {matchEvents.length===0 && <div className="muted">Brak zapisanych zdarzeń.</div>}
        {matchEvents.map(e=>{
          const scorer=players.find(p=>p.id===e.player_id)?.display_name||"?";
          const assist=players.find(p=>p.id===e.assist_player_id)?.display_name;
          return <div key={e.id}>
            <span>{e.event_type==="goal"?`⚽ ${scorer}${assist?` • asysta ${assist}`:""}`:`⭐ MVP: ${scorer}`}</span>
            <button onClick={()=>deleteEvent(e.id)}>Usuń</button>
          </div>
        })}
      </div>
    </div>
  </div>;
}
