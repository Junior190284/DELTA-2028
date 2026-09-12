"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Save, Plus, Trash2, Users, CalendarDays, Trophy, Newspaper, Link2, Bell, Goal, Crown, Star, Shield, RefreshCw } from "lucide-react";

type Player={id:string;display_name:string;shirt_number:string|null;position:string|null;photo_path:string|null;active:boolean};
type Match={id:string;round_no:number|null;match_date:string;match_time:string|null;venue:string|null;home_team:string;away_team:string;home_score:number|null;away_score:number|null;status:string};
type Attendance={match_id:string;player_id:string;status:string};
type Lineup={match_id:string;player_id:string;is_starter:boolean;is_captain:boolean};
type Event={id:string;match_id:string;event_type:string;player_id:string|null;assist_player_id:string|null;minute:number|null;created_at:string};
type News={id:string;type:string;title:string;body:string|null;published_at:string};
type Profile={id:string;display_name:string|null;role:string};
type ParentLink={parent_id:string;player_id:string};

const CLUB="K.S. Delta Warszawa GM";

export default function AdminPanel(props:{
  currentUser:Profile;
  initialPlayers:Player[];
  initialMatches:Match[];
  initialAttendance:Attendance[];
  initialLineup:Lineup[];
  initialEvents:Event[];
  initialNews:News[];
  allProfiles:Profile[];
  initialParentLinks:ParentLink[];
}){
  const supabase=createClient();
  const [tab,setTab]=useState<"matches"|"players"|"news"|"parents"|"push"|"sync">("matches");
  const [syncing,setSyncing]=useState(false);
  const [syncResult,setSyncResult]=useState<string>("");
  const [players,setPlayers]=useState(props.initialPlayers);
  const [matches,setMatches]=useState(props.initialMatches);
  const [attendance,setAttendance]=useState(props.initialAttendance);
  const [lineup,setLineup]=useState(props.initialLineup);
  const [events,setEvents]=useState(props.initialEvents);
  const [news,setNews]=useState(props.initialNews);
  const [parentLinks,setParentLinks]=useState(props.initialParentLinks);
  const [selectedMatchId,setSelectedMatchId]=useState(matches[0]?.id||"");
  const selectedMatch=matches.find(m=>m.id===selectedMatchId)||null;
  const activePlayers=players.filter(p=>p.active!==false);
  const parents=props.allProfiles.filter(p=>p.role==="parent");

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
    const title=prompt("Tytuł powiadomienia","DELTA 2018 GM"); if(!title)return;
    const body=prompt("Treść powiadomienia"); if(!body)return;
    const res=await fetch("/api/push/send",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({title,body,url:"/dashboard"})});
    const data=await res.json();
    if(!res.ok)return alert(data.error||"Błąd");
    alert(`Wysłano: ${data.sent}, błędy: ${data.failed}`);
  }

  async function runDeltaSync(){
    setSyncing(true);
    setSyncResult("");
    try{
      const res=await fetch("/api/delta-sync",{method:"POST"});
      const data=await res.json();
      if(!res.ok)throw new Error(data.error||"Błąd synchronizacji");
      setSyncResult(`Pobrano ${data.found} poprawnych wpisów. Usunięto ${data.cleaned ?? 0} starych wpisów i zapisano czysty feed.`);
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
        <p className="muted">Wysyłka działa po ustawieniu VAPID keys i zapisaniu subskrypcji urządzeń rodziców.</p>
        <button className="push-main" onClick={sendPush}><Bell size={18}/> Wyślij powiadomienie do wszystkich</button>
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
