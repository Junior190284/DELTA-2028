"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import PlayerPhoto from "./PlayerPhoto";
import { ArrowDown, ArrowUp, ArrowRightLeft, Crown, Goal, ShieldAlert, Users } from "lucide-react";

type Player={id:string;display_name:string;shirt_number:string|null;position:string|null;photo_path:string|null;active:boolean};
type Match={id:string;round_no:number|null;match_date:string;match_time:string|null;venue:string|null;home_team:string;away_team:string;home_score:number|null;away_score:number|null;status:string};
type Attendance={match_id:string;player_id:string;status:string};
type Lineup={match_id:string;player_id:string;is_starter:boolean;is_captain:boolean};
type Event={id:string;match_id:string;event_type:string;player_id:string|null;assist_player_id:string|null;minute:number|null;created_at:string};

const eventTypes=new Set(["goal","opponent_goal"]);
const byOrder=(a:Event,b:Event)=>a.created_at.localeCompare(b.created_at)||a.id.localeCompare(b.id);
const name=(players:Player[],id:string|null)=>players.find(p=>p.id===id)?.display_name||"Nieznany zawodnik";

export default function MatchDayV126({match,players,attendance,lineup,events,canManage,canEdit,onDataChange}:{
  match:Match;players:Player[];attendance:Attendance[];lineup:Lineup[];events:Event[];
  canManage:boolean;canEdit:boolean;
  onDataChange:(data:{match?:Match;events?:Event[]})=>void;
}){
  const supabase=createClient();
  const [incoming,setIncoming]=useState("");
  const [outgoing,setOutgoing]=useState("");
  const [keeper,setKeeper]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const own=events.filter(e=>e.match_id===match.id).sort(byOrder);
  const goals=own.filter(e=>eventTypes.has(e.event_type));
  const lineupForMatch=lineup.filter(l=>l.match_id===match.id);
  const starters=lineupForMatch.filter(l=>l.is_starter).map(l=>l.player_id);
  const captainId=lineupForMatch.find(l=>l.is_captain)?.player_id||"";
  const availableIds=new Set(attendance.filter(a=>a.match_id===match.id&&["present","yes"].includes(a.status)).map(a=>a.player_id));
  lineupForMatch.forEach(l=>availableIds.add(l.player_id));
  const deltaIsHome=match.home_team.toLocaleLowerCase("pl-PL").includes("delta");
  const deltaScore=(deltaIsHome?match.home_score:match.away_score)??0;
  const opponentScore=(deltaIsHome?match.away_score:match.home_score)??0;
  const loggedDelta=goals.filter(e=>e.event_type==="goal").length;
  const loggedOpponent=goals.filter(e=>e.event_type==="opponent_goal").length;
  const mismatch=match.home_score!==null&&match.away_score!==null&&(loggedDelta!==deltaScore||loggedOpponent!==opponentScore);
  const playerActions=own.filter(e=>e.event_type==="substitution"||e.event_type==="keeper_change"||e.event_type==="keeper_start");
  const field=useMemo(()=>{
    const ids=[...starters];
    const firstKeeper=own.find(e=>e.event_type==="keeper_start"&&e.player_id)?.player_id||"";
    let currentKeeper=firstKeeper;
    for(const action of playerActions){
      if(action.event_type==="keeper_start"&&action.player_id){currentKeeper=action.player_id;continue;}
      if(action.event_type==="substitution"&&action.player_id&&action.assist_player_id){
        const ix=ids.indexOf(action.assist_player_id);
        if(ix>=0&&!ids.includes(action.player_id))ids[ix]=action.player_id;
        if(currentKeeper===action.assist_player_id)currentKeeper=action.player_id;
      }
      if(action.event_type==="keeper_change"&&action.player_id&&ids.includes(action.player_id))currentKeeper=action.player_id;
    }
    return {ids,keeper:currentKeeper};
  },[starters.join("|"),own.map(e=>`${e.id}:${e.event_type}:${e.created_at}:${e.player_id}:${e.assist_player_id}`).join("|")]);
  const bench=players.filter(p=>availableIds.has(p.id)&&!field.ids.includes(p.id));
  const currentKeeper=field.keeper;
  const hasLegacyOpponent=opponentScore>0&&loggedOpponent===0;
  const update=(change:{match?:Match;events?:Event[]})=>{onDataChange(change);setNotice("Zapisano");};

  async function insertAction(kind:"substitution"|"keeper_start"|"keeper_change",inId:string,outId:string|null){
    if(busy||!canManage||match.status==="cancelled")return;
    if(!inId){setError("Wybierz zawodnika.");return;}
    if(kind==="substitution"&&(!outId||!field.ids.includes(outId)||field.ids.includes(inId)||!availableIds.has(inId))){
      setError("Wskaż zawodnika z boiska i obecnego zawodnika z ławki.");return;
    }
    if(kind!=="substitution"&&!field.ids.includes(inId)){
      setError("Bramkarz musi być zawodnikiem aktualnie znajdującym się na boisku.");return;
    }
    setBusy(true);setError("");setNotice("");
    try{
      const {data,error:dbError}=await supabase.from("match_events").insert({match_id:match.id,event_type:kind,player_id:inId,assist_player_id:outId}).select("*").single();
      if(dbError){setError("Nie udało się zapisać zmiany. Czy wykonano migrację SQL V10.26? "+dbError.message);return;}
      update({events:[...events,data as Event]});setIncoming("");setOutgoing("");setKeeper("");
    }finally{setBusy(false);}
  }

  async function removeLatestAction(){
    if(busy||!canManage||!playerActions.length)return;
    const last=playerActions[playerActions.length-1];
    if(!window.confirm("Cofnąć ostatnią zmianę? Wcześniejsze zmiany pozostaną bez zmian."))return;
    setBusy(true);setError("");
    try{
      const {error:dbError}=await supabase.from("match_events").delete().eq("id",last.id).eq("match_id",match.id);
      if(dbError){setError(dbError.message);return;}
      update({events:events.filter(e=>e.id!==last.id)});
    }finally{setBusy(false);}
  }

  async function moveGoal(id:string,step:-1|1){
    if(busy||!canEdit)return;
    const index=goals.findIndex(e=>e.id===id),other=goals[index+step];
    if(index<0||!other)return;
    const first=goals[index];
    setBusy(true);setError("");setNotice("");
    try{
      // Dwa zapisy; jeśli drugi zawiedzie, przywracamy pierwszy. W czasie edycji
      // przez kilka urządzeń naraz nie należy zmieniać kolejności równolegle.
      const updated=await supabase.from("match_events").update({created_at:other.created_at}).eq("id",first.id).eq("match_id",match.id);
      if(updated.error){setError(updated.error.message);return;}
      const second=await supabase.from("match_events").update({created_at:first.created_at}).eq("id",other.id).eq("match_id",match.id);
      if(second.error){
        await supabase.from("match_events").update({created_at:first.created_at}).eq("id",first.id).eq("match_id",match.id);
        setError("Nie udało się zamienić kolejności. Odśwież mecz. "+second.error.message);return;
      }
      update({events:events.map(e=>e.id===first.id?{...e,created_at:other.created_at}:e.id===other.id?{...e,created_at:first.created_at}:e)});
    }finally{setBusy(false);}
  }

  async function removeOpponent(id:string){
    if(busy||!canEdit||!window.confirm("Usunąć wskazaną bramkę przeciwnika i zmniejszyć wynik o 1?"))return;
    setBusy(true);setError("");
    try{
      const key=deltaIsHome?"away_score":"home_score";
      const score=match[key]??0;
      if(score<1){setError("Wynik przeciwnika wynosi już 0. Popraw wynik ręcznie przed usunięciem zdarzenia.");return;}
      const {error:dbError}=await supabase.from("match_events").delete().eq("id",id).eq("match_id",match.id);
      if(dbError){setError(dbError.message);return;}
      const next={...match,[key]:score-1};
      const saved=await supabase.from("matches").update({[key]:score-1}).eq("id",match.id);
      update({events:events.filter(e=>e.id!==id),...(saved.error?{}:{match:next})});
      if(saved.error)setError("Zdarzenie usunięto, ale wynik nie został skorygowany. Popraw go ręcznie: "+saved.error.message);
    }finally{setBusy(false);}
  }

  let runningDelta=0,runningOpponent=0;
  return <section className="v126-stadium">
    <div className="v126-banner"><span>DELTA 2018 GM · MATCH DAY</span><strong>{match.status==="played"?"FULL TIME":match.status==="cancelled"?"MECZ ODWOŁANY":match.home_score===null&&match.away_score===null?"PRZED MECZEM":"CENTRUM MECZU"}</strong><div className="v126-banner-score"><b>{match.home_team}</b><strong>{match.home_score??"–"} : {match.away_score??"–"}</strong><b>{match.away_team}</b></div></div>
    {mismatch&&<div className="v126-warning" role="status"><ShieldAlert size={18}/><div><b>Wynik i lista bramek wymagają sprawdzenia.</b><span>Wynik DELTY: {deltaScore}, zapisane gole: {loggedDelta}. Wynik przeciwnika: {opponentScore}, zapisane gole: {loggedOpponent}. Statystyki strzelców liczą się tylko z zapisanych goli DELTY. Wyniki przy zdarzeniach przedstawiają wyłącznie udokumentowaną część przebiegu meczu.</span>{hasLegacyOpponent&&<span>Bramki przeciwnika wpisane we wcześniejszych wersjach nie mają osobnych zdarzeń na osi. Możesz uzupełnić je w Match Day; sprawdź wynik po uzupełnieniu.</span>}</div></div>}
    <div className="v126-columns">
      <div className="v126-block"><h3><Goal size={18}/> Oś bramek — bez minut</h3>
        {!goals.length&&<p className="v126-muted">Nie zapisano jeszcze bramek na osi meczu.</p>}
        {goals.map((event,index)=>{
          if(event.event_type==="goal")runningDelta++;else runningOpponent++;
          const score=`${runningDelta}:${runningOpponent}`;
          return <div className="v126-event" key={event.id}><span className="v126-sequence">{index+1}</span><div className="v126-event-copy"><b>{event.event_type==="goal"?`⚽ DELTA · ${name(players,event.player_id)}`:"⚽ Bramka przeciwnika"}</b>{event.event_type==="goal"&&<small>{event.assist_player_id?`Asysta: ${name(players,event.assist_player_id)}`:"Bez przypisanej asysty"}</small>}<small>Wynik zapisanych zdarzeń: {score}</small></div>{canEdit&&<div className="v126-event-buttons"><button disabled={busy||index===0} onClick={()=>moveGoal(event.id,-1)} aria-label="Przesuń bramkę w górę"><ArrowUp size={16}/></button><button disabled={busy||index===goals.length-1} onClick={()=>moveGoal(event.id,1)} aria-label="Przesuń bramkę w dół"><ArrowDown size={16}/></button>{event.event_type==="opponent_goal"&&<button disabled={busy} onClick={()=>removeOpponent(event.id)}>Usuń</button>}</div>}</div>;
        })}
      </div>
      <div className="v126-block"><h3><Users size={18}/> Aktualnie na boisku</h3><p className="v126-muted">Wyjściowa szóstka pozostaje zapisana osobno. Zmiany poniżej nie zmieniają obecności.</p>
        <div className="v126-player-grid">{field.ids.map(id=>{const p=players.find(player=>player.id===id);if(!p)return null;return <div key={id} className={`v126-player ${currentKeeper===id?"v126-goalkeeper":""}`}><PlayerPhoto playerId={id}/><b>{p.display_name}</b><small>{currentKeeper===id?"BRAMKARZ":p.shirt_number?`#${p.shirt_number}`:"Zawodnik"}{captainId===id?" · KAPITAN":""}</small>{captainId===id&&<Crown size={13}/>}</div>;})}</div>
        {!field.ids.length&&<p className="v126-muted">Ustaw pierwszą szóstkę w zakładce Skład.</p>}
        <h4>Wyjściowa szóstka</h4><p className="v126-muted">{starters.map(id=>name(players,id)).join(" · ")||"Jeszcze nie wybrano."}</p>
        <h4>Pozostali obecni</h4><p className="v126-muted">{bench.map(p=>p.display_name).join(" · ")||"Brak zawodników na ławce."}</p>
        <h4>Historia zmian zawodników</h4>
        {!playerActions.length&&<p className="v126-muted">Brak zapisanych zmian.</p>}
        {playerActions.map((e,index)=><div className="v126-history" key={e.id}><span>{index+1}.</span> {e.event_type==="substitution"?`${name(players,e.assist_player_id)} ↓ / ${name(players,e.player_id)} ↑`:e.event_type==="keeper_start"?`Bramkarz wyjściowy: ${name(players,e.player_id)}`:`Zmiana bramkarza: ${name(players,e.assist_player_id)} → ${name(players,e.player_id)}`}</div>)}
      </div>
    </div>
    {canManage&&match.status!=="cancelled"&&<div className="v126-block v126-controls"><h3><ArrowRightLeft size={18}/> Zarządzanie składem podczas meczu</h3>
      <div className="v126-form"><label>Schodzi z boiska<select value={outgoing} disabled={busy} onChange={e=>setOutgoing(e.target.value)}><option value="">Wybierz zawodnika</option>{field.ids.map(id=><option key={id} value={id}>{name(players,id)}{currentKeeper===id?" (bramkarz)":""}</option>)}</select></label><label>Wchodzi z ławki<select value={incoming} disabled={busy} onChange={e=>setIncoming(e.target.value)}><option value="">Wybierz zawodnika</option>{bench.map(p=><option value={p.id} key={p.id}>{p.display_name}</option>)}</select></label><button disabled={busy||!outgoing||!incoming||field.ids.length!==6} onClick={()=>insertAction("substitution",incoming,outgoing)}>Zapisz zmianę</button></div>
      <div className="v126-form"><label>{currentKeeper?"Zmień bramkarza (bez zejścia z boiska)":"Wybierz bramkarza wyjściowego"}<select value={keeper} disabled={busy} onChange={e=>setKeeper(e.target.value)}><option value="">Wybierz zawodnika z boiska</option>{field.ids.filter(id=>id!==currentKeeper).map(id=><option key={id} value={id}>{name(players,id)}</option>)}</select></label><button disabled={busy||!keeper||field.ids.length!==6} onClick={()=>insertAction(currentKeeper?"keeper_change":"keeper_start",keeper,currentKeeper||null)}>{currentKeeper?"Zmień bramkarza":"Zapisz bramkarza"}</button></div>
      <button className="v126-secondary" disabled={busy||!playerActions.length} onClick={removeLatestAction}>Cofnij ostatnią zmianę zawodników</button>
      <small>Zmiana wyjściowej szóstki po rozpoczęciu meczu może wpłynąć na aktualny skład. Wcześniejsze zmiany pozostają w historii.</small>
    </div>}
    {error&&<p className="v126-error" role="alert">{error}</p>}{notice&&<p className="v126-notice" role="status">{notice}</p>}
  </section>;
}
