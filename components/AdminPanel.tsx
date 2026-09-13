"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Save, Plus, Trash2, Users, CalendarDays, Trophy, Newspaper, Link2, Bell, Goal, Crown, Star, Shield, RefreshCw, CakeSlice } from "lucide-react";

type Player={id:string;display_name:string;shirt_number:string|null;position:string|null;photo_path:string|null;active:boolean};
type Match={id:string;round_no:number|null;match_date:string;match_time:string|null;venue:string|null;home_team:string;away_team:string;home_score:number|null;away_score:number|null;status:string};
type Attendance={match_id:string;player_id:string;status:string};
type Lineup={match_id:string;player_id:string;is_starter:boolean;is_captain:boolean};
type Event={id:string;match_id:string;event_type:string;player_id:string|null;assist_player_id:string|null;minute:number|null;created_at:string};
type News={id:string;type:string;title:string;body:string|null;published_at:string};
type Profile={id:string;display_name:string|null;role:string};
type ParentLink={parent_id:string;player_id:string};
type TeamEvent={id:string;title:string;event_type:string;event_date:string;start_time:string|null;end_time:string|null;location:string|null;details:string|null;important:boolean;player_id:string|null;created_at:string};
type TrainingSession={id:string;training_date:string;start_time:string|null;end_time:string|null;location:string|null;title:string;notes:string|null;created_at:string};
type TrainingAttendance={training_id:string;player_id:string;status:string};
type TrainingGame={id:string;training_id:string;team_a_name:string;team_b_name:string;team_a_score:number;team_b_score:number;created_at:string};
type TrainingGamePlayer={game_id:string;player_id:string;team:string};
type TrainingEvent={id:string;game_id:string;event_type:string;player_id:string|null;assist_player_id:string|null;created_at:string};

const CLUB="K.S. Delta Warszawa GM";

export default function AdminPanel(props:{
  currentUser:Profile;
  initialPlayers:Player[];
  initialMatches:Match[];
  initialAttendance:Attendance[];
  initialLineup:Lineup[];
  initialEvents:Event[];
  initialNews:News[];
  initialTeamEvents:TeamEvent[];
  initialTrainingSessions:TrainingSession[];
  initialTrainingAttendance:TrainingAttendance[];
  initialTrainingGames:TrainingGame[];
  initialTrainingGamePlayers:TrainingGamePlayer[];
  initialTrainingEvents:TrainingEvent[];
  allProfiles:Profile[];
  initialParentLinks:ParentLink[];
}){
  const supabase=createClient();
  const [tab,setTab]=useState<"matches"|"calendar"|"training"|"players"|"news"|"parents"|"push"|"sync">("matches");
  const [syncing,setSyncing]=useState(false);
  const [syncResult,setSyncResult]=useState<string>("");
  const [players,setPlayers]=useState(props.initialPlayers);
  const [matches,setMatches]=useState(props.initialMatches);
  const [attendance,setAttendance]=useState(props.initialAttendance);
  const [lineup,setLineup]=useState(props.initialLineup);
  const [events,setEvents]=useState(props.initialEvents);
  const [news,setNews]=useState(props.initialNews);
  const [teamEvents,setTeamEvents]=useState(props.initialTeamEvents);
  const [trainingSessions,setTrainingSessions]=useState(props.initialTrainingSessions);
  const [trainingAttendance,setTrainingAttendance]=useState(props.initialTrainingAttendance);
  const [trainingGames,setTrainingGames]=useState(props.initialTrainingGames);
  const [trainingGamePlayers,setTrainingGamePlayers]=useState(props.initialTrainingGamePlayers);
  const [trainingEvents,setTrainingEvents]=useState(props.initialTrainingEvents);
  const [selectedTrainingId,setSelectedTrainingId]=useState(props.initialTrainingSessions[0]?.id||"");
  const [selectedTrainingGameId,setSelectedTrainingGameId]=useState(props.initialTrainingGames[0]?.id||"");
  const [parentLinks,setParentLinks]=useState(props.initialParentLinks);
  const [selectedMatchId,setSelectedMatchId]=useState(matches[0]?.id||"");
  const selectedMatch=matches.find(m=>m.id===selectedMatchId)||null;
  const activePlayers=players.filter(p=>p.active!==false);
  const parents=props.allProfiles.filter(p=>p.role==="parent");
  const selectedTraining=trainingSessions.find(s=>s.id===selectedTrainingId)||null;
  const trainingGamesForSelected=trainingGames.filter(g=>g.training_id===selectedTrainingId);
  const selectedTrainingGame=trainingGames.find(g=>g.id===selectedTrainingGameId)||trainingGamesForSelected[0]||null;

  async function addMatch(){
    const home=prompt("Gospodarz",CLUB); if(!home)return;
    const away=prompt("Gość"); if(!away)return;
    const date=prompt("Data YYYY-MM-DD"); if(!date)return;
    const time=prompt("Godzina HH:MM","09:30")||null;
    const venue=prompt("Miejsce","Górny Mokotów")||null;
    const {data,error}=await supabase.from("matches").insert({
      home_team:home,away_team:away,match_date:date,match_time:time,venue,status:"scheduled",created_by:props.currentUser.id
    }).select("*").single();
    if(error)return alert(error.message);
    setMatches(prev=>[...prev,data].sort((a,b)=>a.match_date.localeCompare(b.match_date)));
    setSelectedMatchId(data.id);
  }

  async function saveMatchBasics(){
    if(!selectedMatch)return;
    const status=(document.getElementById("mstatus") as HTMLSelectElement).value;
    const hs=(document.getElementById("mhs") as HTMLInputElement).value;
    const as=(document.getElementById("mas") as HTMLInputElement).value;
    const venue=(document.getElementById("mvenue") as HTMLInputElement).value;
    const time=(document.getElementById("mtime") as HTMLInputElement).value;
    const {error}=await supabase.from("matches").update({
      status,home_score:hs===""?null:Number(hs),away_score:as===""?null:Number(as),venue,match_time:time||null
    }).eq("id",selectedMatch.id);
    if(error)return alert(error.message);
    setMatches(prev=>prev.map(m=>m.id===selectedMatch.id?{...m,status,home_score:hs===""?null:Number(hs),away_score:as===""?null:Number(as),venue,match_time:time||null}:m));
    alert("Zapisano mecz");
  }

  async function setAttendanceStatus(playerId:string,status:string){
    if(!selectedMatch)return;
    const {error}=await supabase.from("match_attendance").upsert({
      match_id:selectedMatch.id,player_id:playerId,status,updated_by:props.currentUser.id
    },{onConflict:"match_id,player_id"});
    if(error)return alert(error.message);
    setAttendance(prev=>[...prev.filter(a=>!(a.match_id===selectedMatch.id&&a.player_id===playerId)),{match_id:selectedMatch.id,player_id:playerId,status}]);
  }

  async function toggleStarter(playerId:string){
    if(!selectedMatch)return;
    const current=lineup.find(l=>l.match_id===selectedMatch.id&&l.player_id===playerId);
    const starters=lineup.filter(l=>l.match_id===selectedMatch.id&&l.is_starter);
    if(!current?.is_starter && starters.length>=6)return alert("Wyjściowa 6 może mieć maksymalnie 6 zawodników.");
    const isStarter=!current?.is_starter;
    const row={match_id:selectedMatch.id,player_id:playerId,is_starter:isStarter,is_captain:current?.is_captain||false};
    const {error}=await supabase.from("match_lineup").upsert(row,{onConflict:"match_id,player_id"});
    if(error)return alert(error.message);
    setLineup(prev=>[...prev.filter(l=>!(l.match_id===selectedMatch.id&&l.player_id===playerId)),row]);
    if(isStarter) await setAttendanceStatus(playerId,"present");
  }

  async function setCaptain(playerId:string){
    if(!selectedMatch)return;
    const rows=lineup.filter(l=>l.match_id===selectedMatch.id);
    for(const row of rows){
      if(row.is_captain){
        await supabase.from("match_lineup").upsert({...row,is_captain:false},{onConflict:"match_id,player_id"});
      }
    }
    const current=lineup.find(l=>l.match_id===selectedMatch.id&&l.player_id===playerId);
    const row={match_id:selectedMatch.id,player_id:playerId,is_starter:current?.is_starter||false,is_captain:true};
    const {error}=await supabase.from("match_lineup").upsert(row,{onConflict:"match_id,player_id"});
    if(error)return alert(error.message);
    setLineup(prev=>{
      const cleared=prev.map(l=>l.match_id===selectedMatch.id?{...l,is_captain:false}:l);
      return [...cleared.filter(l=>!(l.match_id===selectedMatch.id&&l.player_id===playerId)),row];
    });
    await setAttendanceStatus(playerId,"present");
  }

  async function addGoal(){
    if(!selectedMatch)return;
    const scorerId=(document.getElementById("goalScorer") as HTMLSelectElement).value;
    const assistId=(document.getElementById("goalAssist") as HTMLSelectElement).value||null;
    if(!scorerId)return;
    const {data,error}=await supabase.from("match_events").insert({
      match_id:selectedMatch.id,event_type:"goal",player_id:scorerId,assist_player_id:assistId
    }).select("*").single();
    if(error)return alert(error.message);
    setEvents(prev=>[...prev,data]);
  }

  async function setMvp(){
    if(!selectedMatch)return;
    const playerId=(document.getElementById("mvpPlayer") as HTMLSelectElement).value;
    if(!playerId)return;
    const old=events.find(e=>e.match_id===selectedMatch.id&&e.event_type==="mvp");
    if(old) await supabase.from("match_events").delete().eq("id",old.id);
    const {data,error}=await supabase.from("match_events").insert({
      match_id:selectedMatch.id,event_type:"mvp",player_id:playerId
    }).select("*").single();
    if(error)return alert(error.message);
    setEvents(prev=>[...prev.filter(e=>!(e.match_id===selectedMatch.id&&e.event_type==="mvp")),data]);
  }

  async function deleteEvent(id:string){
    const {error}=await supabase.from("match_events").delete().eq("id",id);
    if(error)return alert(error.message);
    setEvents(prev=>prev.filter(e=>e.id!==id));
  }

  async function addPlayer(){
    const name=prompt("Imię i nazwisko zawodnika"); if(!name)return;
    const number=prompt("Numer koszulki")||null;
    const position=prompt("Pozycja","Zawodnik")||"Zawodnik";
    const {data,error}=await supabase.from("players").insert({display_name:name,shirt_number:number,position,active:true}).select("*").single();
    if(error)return alert(error.message);
    setPlayers(prev=>[...prev,data].sort((a,b)=>a.display_name.localeCompare(b.display_name)));
  }

  async function archivePlayer(id:string){
    if(!confirm("Zarchiwizować zawodnika?"))return;
    const {error}=await supabase.from("players").update({active:false}).eq("id",id);
    if(error)return alert(error.message);
    setPlayers(prev=>prev.map(p=>p.id===id?{...p,active:false}:p));
  }

  async function addNewsItem(){
    const title=prompt("Tytuł"); if(!title)return;
    const body=prompt("Treść")||"";
    const type=prompt("Typ: organizacja / mecz / wynik","organizacja")||"organizacja";
    const {data,error}=await supabase.from("news").insert({title,body,type,created_by:props.currentUser.id}).select("*").single();
    if(error)return alert(error.message);
    setNews(prev=>[data,...prev]);
  }

  async function deleteNews(id:string){
    if(!confirm("Usunąć aktualność?"))return;
    const {error}=await supabase.from("news").delete().eq("id",id);
    if(error)return alert(error.message);
    setNews(prev=>prev.filter(n=>n.id!==id));
  }

  async function addParentLink(parentId:string,playerId:string){
    const {error}=await supabase.from("parent_players").upsert({parent_id:parentId,player_id:playerId},{onConflict:"parent_id,player_id"});
    if(error)return alert(error.message);
    setParentLinks(prev=>[...prev.filter(x=>!(x.parent_id===parentId&&x.player_id===playerId)),{parent_id:parentId,player_id:playerId}]);
  }

  async function removeParentLink(parentId:string,playerId:string){
    const {error}=await supabase.from("parent_players").delete().eq("parent_id",parentId).eq("player_id",playerId);
    if(error)return alert(error.message);
    setParentLinks(prev=>prev.filter(x=>!(x.parent_id===parentId&&x.player_id===playerId)));
  }

  async function sendPush(){
    const title=prompt("Tytuł powiadomienia","DELTA 2018 GM — test"); if(!title)return;
    const body=prompt("Treść powiadomienia","Kliknij, aby otworzyć informacje Z klubu."); if(!body)return;

    const res=await fetch("/api/push/send",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({
        title,
        body,
        url:"/dashboard?view=club",
        tag:`delta-admin-test-${Date.now()}`
      })
    });

    const data=await res.json();

    if(!res.ok){
      return alert(`${data.message||data.error||"Błąd wysyłki"}${data.detail?`\n\n${data.detail}`:""}`);
    }

    let text=`Wysłano: ${data.sent}\nBłędy: ${data.failed}\nUsunięto martwe urządzenia: ${data.removed||0}`;

    if(data.errors?.length){
      text+="\n\nSzczegóły:";
      data.errors.slice(0,5).forEach((e:any)=>{
        text+=`\n• HTTP ${e.statusCode||"?"}: ${e.message}`;
      });
    }

    alert(text);
  }

  async function addTrainingSession(){
    const date=prompt("Data treningu YYYY-MM-DD"); if(!date)return;
    const title=prompt("Nazwa","Trening")||"Trening";
    const start_time=prompt("Start HH:MM","17:00")||null;
    const end_time=prompt("Koniec HH:MM","18:30")||null;
    const location=prompt("Miejsce","")||null;
    const notes=prompt("Notatka","")||null;
    const {data,error}=await supabase.from("training_sessions").insert({
      training_date:date,title,start_time,end_time,location,notes,created_by:props.currentUser.id
    }).select("*").single();
    if(error)return alert(error.message);
    setTrainingSessions(prev=>[data,...prev].sort((x,y)=>y.training_date.localeCompare(x.training_date)));
    setSelectedTrainingId(data.id);
  }

  async function setTrainingAttendanceStatus(playerId:string,status:string){
    if(!selectedTraining)return;
    const {error}=await supabase.from("training_attendance").upsert({
      training_id:selectedTraining.id,player_id:playerId,status,updated_by:props.currentUser.id
    },{onConflict:"training_id,player_id"});
    if(error)return alert(error.message);
    setTrainingAttendance(prev=>[
      ...prev.filter(x=>!(x.training_id===selectedTraining.id&&x.player_id===playerId)),
      {training_id:selectedTraining.id,player_id:playerId,status}
    ]);
  }

  async function addTrainingGame(){
    if(!selectedTraining)return alert("Najpierw wybierz trening.");
    const team_a_name=prompt("Nazwa drużyny A","Czerwoni")||"Czerwoni";
    const team_b_name=prompt("Nazwa drużyny B","Złoci")||"Złoci";
    const {data,error}=await supabase.from("training_games").insert({
      training_id:selectedTraining.id,team_a_name,team_b_name,team_a_score:0,team_b_score:0,created_by:props.currentUser.id
    }).select("*").single();
    if(error)return alert(error.message);
    setTrainingGames(prev=>[data,...prev]);
    setSelectedTrainingGameId(data.id);
  }

  async function setTrainingGameTeam(playerId:string,teamValue:"A"|"B"|null){
    if(!selectedTrainingGame)return;
    if(teamValue===null){
      const {error}=await supabase.from("training_game_players").delete().eq("game_id",selectedTrainingGame.id).eq("player_id",playerId);
      if(error)return alert(error.message);
      setTrainingGamePlayers(prev=>prev.filter(x=>!(x.game_id===selectedTrainingGame.id&&x.player_id===playerId)));
      return;
    }
    const row={game_id:selectedTrainingGame.id,player_id:playerId,team:teamValue};
    const {error}=await supabase.from("training_game_players").upsert(row,{onConflict:"game_id,player_id"});
    if(error)return alert(error.message);
    setTrainingGamePlayers(prev=>[
      ...prev.filter(x=>!(x.game_id===selectedTrainingGame.id&&x.player_id===playerId)),
      row
    ]);
  }

  async function saveTrainingGameScore(){
    if(!selectedTrainingGame)return;
    const aScore=Number((document.getElementById("trainingScoreA") as HTMLInputElement)?.value||0);
    const bScore=Number((document.getElementById("trainingScoreB") as HTMLInputElement)?.value||0);
    const {error}=await supabase.from("training_games").update({team_a_score:aScore,team_b_score:bScore}).eq("id",selectedTrainingGame.id);
    if(error)return alert(error.message);
    setTrainingGames(prev=>prev.map(g=>g.id===selectedTrainingGame.id?{...g,team_a_score:aScore,team_b_score:bScore}:g));
  }

  async function addTrainingGoal(){
    if(!selectedTrainingGame)return;
    const scorer=(document.getElementById("trainingScorer") as HTMLSelectElement)?.value;
    const assist=(document.getElementById("trainingAssist") as HTMLSelectElement)?.value||null;
    if(!scorer)return;
    const {data,error}=await supabase.from("training_events").insert({
      game_id:selectedTrainingGame.id,event_type:"goal",player_id:scorer,assist_player_id:assist
    }).select("*").single();
    if(error)return alert(error.message);
    setTrainingEvents(prev=>[...prev,data]);
  }

  async function deleteTrainingEvent(id:string){
    const {error}=await supabase.from("training_events").delete().eq("id",id);
    if(error)return alert(error.message);
    setTrainingEvents(prev=>prev.filter(x=>x.id!==id));
  }

  async function addTeamEvent(){
    const title=prompt("Nazwa wydarzenia"); if(!title)return;
    const event_type=prompt("Typ: training / tournament / birthday / info / other","training")||"info";
    const event_date=prompt("Data YYYY-MM-DD"); if(!event_date)return;
    const start_time=prompt("Godzina HH:MM","17:00")||null;
    const end_time=prompt("Koniec HH:MM","18:30")||null;
    const location=prompt("Miejsce","")||null;
    const details=prompt("Dodatkowa informacja","")||null;
    const important=confirm("Czy oznaczyć wydarzenie jako WAŻNE?");
    const {data,error}=await supabase.from("team_events").insert({
      title,event_type,event_date,start_time,end_time,location,details,important,created_by:props.currentUser.id
    }).select("*").single();
    if(error)return alert(error.message);
    setTeamEvents(prev=>[...prev,data].sort((x,y)=>`${x.event_date} ${x.start_time||""}`.localeCompare(`${y.event_date} ${y.start_time||""}`)));
  }

  async function deleteTeamEvent(id:string){
    if(!confirm("Usunąć wydarzenie z kalendarza?"))return;
    const {error}=await supabase.from("team_events").delete().eq("id",id);
    if(error)return alert(error.message);
    setTeamEvents(prev=>prev.filter(e=>e.id!==id));
  }

  async function runDeltaSync(){
    setSyncing(true);
    setSyncResult("");
    try{
      const res=await fetch("/api/delta-sync",{method:"POST"});
      const data=await res.json();
      if(!res.ok)throw new Error(data.error||"Błąd synchronizacji");
      setSyncResult(`Pobrano ${data.found} poprawnych wpisów. Nowe: ${data.new_items ?? data.inserted ?? 0}. Push: ${data.push?.sent ?? 0} wysłanych.`);
    }catch(e:any){
      setSyncResult(`Błąd: ${e?.message||e}`);
    }finally{
      setSyncing(false);
    }
  }

  const matchEvents=selectedMatch?events.filter(e=>e.match_id===selectedMatch.id):[];

  return <div className="admin-app">
    <header className="admin-top">
      <a href="/dashboard" className="admin-back"><ArrowLeft size={18}/> Panel drużyny</a>
      <div>
        <div className="eyebrow gold">DELTA 2018 GM</div>
        <h1>Centrum administratora</h1>
      </div>
      <span className="admin-role">{props.currentUser.role}</span>
    </header>

    <nav className="admin-tabs">
      <button className={tab==="matches"?"active":""} onClick={()=>setTab("matches")}><CalendarDays size={17}/> Mecze</button>
      <button className={tab==="calendar"?"active":""} onClick={()=>setTab("calendar")}><CalendarDays size={17}/> Kalendarz</button>
      <button className={tab==="training"?"active":""} onClick={()=>setTab("training")}><Goal size={17}/> Treningi</button>
      <button className={tab==="players"?"active":""} onClick={()=>setTab("players")}><Users size={17}/> Zawodnicy</button>
      <button className={tab==="news"?"active":""} onClick={()=>setTab("news")}><Newspaper size={17}/> Aktualności</button>
      <button className={tab==="parents"?"active":""} onClick={()=>setTab("parents")}><Link2 size={17}/> Rodzice</button>
      <button className={tab==="push"?"active":""} onClick={()=>setTab("push")}><Bell size={17}/> Push</button>
      <button className={tab==="sync"?"active":""} onClick={()=>setTab("sync")}><Shield size={17}/> DELTA Sync</button>
    </nav>

    <main className="admin-main">
      {tab==="matches" && <div className="admin-two-col">
        <aside className="admin-card">
          <div className="admin-card-head"><h2>Mecze</h2><button onClick={addMatch}><Plus size={15}/> Dodaj</button></div>
          <div className="admin-match-list">
            {matches.map(m=><button key={m.id} className={selectedMatchId===m.id?"selected":""} onClick={()=>setSelectedMatchId(m.id)}>
              <strong>{m.home_team} — {m.away_team}</strong>
              <span>{m.match_date} {m.match_time||""}</span>
            </button>)}
          </div>
        </aside>

        <section className="admin-card">
          {!selectedMatch ? <p>Wybierz mecz.</p> : <>
            <div className="admin-card-head"><h2>Centrum meczu</h2><button onClick={saveMatchBasics}><Save size={15}/> Zapisz</button></div>
            <div className="admin-form-grid">
              <label>Status<select id="mstatus" defaultValue={selectedMatch.status}><option value="scheduled">Zaplanowany</option><option value="played">Rozegrany</option><option value="cancelled">Odwołany</option></select></label>
              <label>Godzina<input id="mtime" defaultValue={selectedMatch.match_time||""}/></label>
              <label>Miejsce<input id="mvenue" defaultValue={selectedMatch.venue||""}/></label>
              <label>Gospodarz<input value={selectedMatch.home_team} readOnly/></label>
              <label>Wynik gospodarza<input id="mhs" type="number" defaultValue={selectedMatch.home_score??""}/></label>
              <label>Wynik gościa<input id="mas" type="number" defaultValue={selectedMatch.away_score??""}/></label>
            </div>

            <h3>Obecność • wyjściowa 6 • kapitan</h3>
            <div className="admin-roster">
              {activePlayers.map(p=>{
                const att=attendance.find(a=>a.match_id===selectedMatch.id&&a.player_id===p.id)?.status||"";
                const li=lineup.find(l=>l.match_id===selectedMatch.id&&l.player_id===p.id);
                return <div className="admin-player-row" key={p.id}>
                  <strong>{p.display_name}</strong>
                  <div className="row-actions">
                    <button className={att==="present"?"on":""} onClick={()=>setAttendanceStatus(p.id,"present")}>Obecny</button>
                    <button className={att==="no"?"on danger":""} onClick={()=>setAttendanceStatus(p.id,"no")}>Nie</button>
                    <button className={li?.is_starter?"on gold":""} onClick={()=>toggleStarter(p.id)}>Wyjściowa 6</button>
                    <button className={li?.is_captain?"on gold":""} onClick={()=>setCaptain(p.id)}><Crown size={14}/> Kapitan</button>
                  </div>
                </div>
              })}
            </div>

            <div className="admin-event-grid">
              <div className="admin-subcard">
                <h3><Goal size={17}/> Dodaj gola</h3>
                <select id="goalScorer"><option value="">Strzelec</option>{activePlayers.map(p=><option key={p.id} value={p.id}>{p.display_name}</option>)}</select>
                <select id="goalAssist"><option value="">Bez asysty</option>{activePlayers.map(p=><option key={p.id} value={p.id}>{p.display_name}</option>)}</select>
                <button onClick={addGoal}>Dodaj bramkę</button>
              </div>

              <div className="admin-subcard">
                <h3><Star size={17}/> MVP</h3>
                <select id="mvpPlayer"><option value="">Wybierz</option>{activePlayers.map(p=><option key={p.id} value={p.id}>{p.display_name}</option>)}</select>
                <button onClick={setMvp}>Ustaw MVP</button>
              </div>
            </div>

            <h3>Zdarzenia</h3>
            <div className="event-list">
              {matchEvents.map(e=>{
                const player=players.find(p=>p.id===e.player_id)?.display_name||"?";
                const assist=players.find(p=>p.id===e.assist_player_id)?.display_name;
                return <div key={e.id}><span>{e.event_type==="goal"?`⚽ ${player}${assist?` • asysta ${assist}`:""}`:`⭐ MVP: ${player}`}</span><button onClick={()=>deleteEvent(e.id)}><Trash2 size={14}/></button></div>
              })}
            </div>
          </>}
        </section>
      </div>}

            {tab==="training" && <div className="admin-two-col">
        <aside className="admin-card">
          <div className="admin-card-head"><h2>Treningi</h2><button onClick={addTrainingSession}><Plus size={15}/> Dodaj</button></div>
          <div className="admin-match-list">
            {trainingSessions.map(s=><button key={s.id} className={selectedTrainingId===s.id?"selected":""} onClick={()=>setSelectedTrainingId(s.id)}>
              <strong>{s.title||"Trening"}</strong>
              <span>{s.training_date} {s.start_time?.slice(0,5)||""}</span>
            </button>)}
          </div>
        </aside>

        <section className="admin-card">
          {!selectedTraining?<p>Dodaj lub wybierz trening.</p>:<>
            <div className="admin-card-head"><h2>Centrum treningowe</h2><button onClick={addTrainingGame}><Plus size={15}/> Gra kontrolna</button></div>
            <p className="muted">{selectedTraining.training_date} • {selectedTraining.start_time?.slice(0,5)||""} • {selectedTraining.location||"—"}</p>

            <h3>Obecność</h3>
            <div className="attendance-grid">
              {activePlayers.map(p=>{
                const st=trainingAttendance.find(x=>x.training_id===selectedTraining.id&&x.player_id===p.id)?.status||"";
                return <div key={p.id} className="attendance-row">
                  <span>{p.display_name}</span>
                  <div>
                    <button className={st==="present"?"active yes":""} onClick={()=>setTrainingAttendanceStatus(p.id,"present")}>JEST</button>
                    <button className={st==="absent"?"active no":""} onClick={()=>setTrainingAttendanceStatus(p.id,"absent")}>NIE</button>
                  </div>
                </div>
              })}
            </div>

            <h3>Gry kontrolne</h3>
            <div className="admin-match-list">
              {trainingGamesForSelected.map(g=><button key={g.id} className={selectedTrainingGame?.id===g.id?"selected":""} onClick={()=>setSelectedTrainingGameId(g.id)}>
                <strong>{g.team_a_name} {g.team_a_score}:{g.team_b_score} {g.team_b_name}</strong>
                <span>Gra kontrolna</span>
              </button>)}
            </div>

            {selectedTrainingGame&&<>
              <div className="admin-form-grid">
                <label>{selectedTrainingGame.team_a_name}<input id="trainingScoreA" type="number" min="0" defaultValue={selectedTrainingGame.team_a_score}/></label>
                <label>{selectedTrainingGame.team_b_name}<input id="trainingScoreB" type="number" min="0" defaultValue={selectedTrainingGame.team_b_score}/></label>
              </div>
              <button className="push-main" onClick={saveTrainingGameScore}><Save size={15}/> Zapisz wynik gry</button>

              <h3>Składy gry kontrolnej</h3>
              <div className="attendance-grid">
                {activePlayers.map(p=>{
                  const team=trainingGamePlayers.find(x=>x.game_id===selectedTrainingGame.id&&x.player_id===p.id)?.team||"";
                  return <div key={p.id} className="attendance-row">
                    <span>{p.display_name}</span>
                    <div>
                      <button className={team==="A"?"active yes":""} onClick={()=>setTrainingGameTeam(p.id,"A")}>A</button>
                      <button className={team==="B"?"active no":""} onClick={()=>setTrainingGameTeam(p.id,"B")}>B</button>
                      <button onClick={()=>setTrainingGameTeam(p.id,null)}>—</button>
                    </div>
                  </div>
                })}
              </div>

              <h3>Gol / asysta treningowa</h3>
              <div className="admin-form-grid">
                <label>Strzelec<select id="trainingScorer"><option value="">—</option>{activePlayers.map(p=><option value={p.id} key={p.id}>{p.display_name}</option>)}</select></label>
                <label>Asysta<select id="trainingAssist"><option value="">Brak</option>{activePlayers.map(p=><option value={p.id} key={p.id}>{p.display_name}</option>)}</select></label>
              </div>
              <button className="push-main" onClick={addTrainingGoal}><Goal size={15}/> Dodaj gola treningowego</button>

              <div className="event-list">
                {trainingEvents.filter(e=>e.game_id===selectedTrainingGame.id).map(e=>{
                  const scorer=players.find(p=>p.id===e.player_id)?.display_name||"?";
                  const assist=players.find(p=>p.id===e.assist_player_id)?.display_name;
                  return <div key={e.id}><span>⚽ {scorer}{assist?` • asysta ${assist}`:""}</span><button onClick={()=>deleteTrainingEvent(e.id)}><Trash2 size={14}/></button></div>
                })}
              </div>
            </>}
          </>}
        </section>
      </div>}

      {tab==="calendar" && <section className="admin-card">
        <div className="admin-card-head"><h2>Kalendarz drużyny</h2><button onClick={addTeamEvent}><Plus size={15}/> Dodaj wydarzenie</button></div>
        <p className="muted">Tutaj planujesz treningi, turnieje, urodziny, zbiórki i inne ważne wydarzenia. Mecze nadal dodajesz w zakładce Mecze.</p>
        <div className="admin-news-list">
          {teamEvents.length?teamEvents.map(e=><article key={e.id}>
            <div>
              <strong>{e.title}</strong>
              <p>{e.event_type} • {e.event_date} {e.start_time?.slice(0,5)||""} {e.location?`• ${e.location}`:""} {e.important?"• WAŻNE":""}</p>
              {e.details&&<p>{e.details}</p>}
            </div>
            <button onClick={()=>deleteTeamEvent(e.id)}><Trash2 size={14}/></button>
          </article>):<p className="muted">Brak dodatkowych wydarzeń w kalendarzu.</p>}
        </div>
      </section>}

{tab==="players" && <section className="admin-card">
        <div className="admin-card-head"><h2>Zawodnicy</h2><button onClick={addPlayer}><Plus size={15}/> Dodaj zawodnika</button></div>
        <div className="admin-roster">
          {players.map(p=><div className="admin-player-row" key={p.id}>
            <div><strong>{p.display_name}</strong><span>{p.position||"Zawodnik"} {p.shirt_number?`#${p.shirt_number}`:""} {p.active===false?"• ARCHIWUM":""}</span></div>
            {p.active!==false&&<button className="danger-btn" onClick={()=>archivePlayer(p.id)}><Trash2 size={14}/> Archiwizuj</button>}
          </div>)}
        </div>
      </section>}

      {tab==="news" && <section className="admin-card">
        <div className="admin-card-head"><h2>Aktualności</h2><button onClick={addNewsItem}><Plus size={15}/> Dodaj</button></div>
        <div className="admin-news-list">
          {news.map(n=><article key={n.id}><div><span className="tag">{n.type}</span><h3>{n.title}</h3><p>{n.body}</p></div><button onClick={()=>deleteNews(n.id)}><Trash2 size={14}/></button></article>)}
        </div>
      </section>}

      {tab==="parents" && <section className="admin-card">
        <div className="admin-card-head"><h2>Rodzic → dziecko</h2></div>
        <p className="muted">Tutaj przypisujesz konto rodzica do zawodnika. Dzięki temu rodzic widzi prywatny profil i może potwierdzać obecność tylko swojego dziecka.</p>
        <div className="parent-grid">
          {parents.map(parent=><div className="admin-subcard" key={parent.id}>
            <h3>{parent.display_name||"Rodzic"}</h3>
            {activePlayers.map(p=>{
              const linked=parentLinks.some(x=>x.parent_id===parent.id&&x.player_id===p.id);
              return <label className="parent-check" key={p.id}>
                <input type="checkbox" checked={linked} onChange={e=>e.target.checked?addParentLink(parent.id,p.id):removeParentLink(parent.id,p.id)}/>
                <span>{p.display_name}</span>
              </label>
            })}
          </div>)}
        </div>
      </section>}

      {tab==="push" && <section className="admin-card">
        <div className="admin-card-head"><h2>Powiadomienia push</h2></div>
        <p className="muted">Test otwiera po kliknięciu zakładkę „Z klubu”. Jeśli któreś urządzenie jest martwe, serwer automatycznie usunie je z bazy. Przy błędzie zobaczysz dokładny kod HTTP.</p>
        <button className="push-main" onClick={sendPush}><Bell size={18}/> Wyślij test push do wszystkich</button>
      </section>}

      {tab==="sync" && <section className="admin-card">
        <div className="admin-card-head"><h2>DELTA Sync</h2></div>
        <p className="muted">Pobiera nowe informacje z oficjalnej strony drużyny i zapisuje je w kafelku „Z klubu”. Automatyczne odpytywanie można uruchomić co minutę przez Supabase Cron.</p>
        <button className="push-main" disabled={syncing} onClick={runDeltaSync}><RefreshCw size={18}/>{syncing?" Synchronizacja…":" Synchronizuj teraz"}</button>
        {syncResult&&<div className="staff-note"><Shield size={18}/>{syncResult}</div>}
        <div className="admin-subcard" style={{marginTop:16}}>
          <h3>Źródło</h3>
          <p>https://www.delta.warszawa.pl/pilka.php?a=druzyny&druzyna=108</p>
          <p className="muted">Dane klubowe są trzymane oddzielnie od naszych prywatnych statystyk, obecności i profili zawodników.</p>
        </div>
      </section>}
    </main>
  </div>;
}
