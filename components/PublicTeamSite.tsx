"use client";

import Link from "next/link";
import { CalendarDays, ChevronRight, Goal, LockKeyhole, Newspaper, Shield, Trophy, Users, Zap } from "lucide-react";

type Match={
  id:string;round_no:number|null;match_date:string;match_time:string|null;venue:string|null;
  home_team:string;away_team:string;home_score:number|null;away_score:number|null;status:string
};
type News={id:string;type:string;title:string;body:string|null;published_at:string};
type ClubUpdate={id:string;source_key:string;source_name:string;source_url:string;title:string;body:string|null;priority:number;published_at:string};
type TeamEvent={id:string;title:string;event_type:string;event_date:string;start_time:string|null;end_time:string|null;location:string|null;details:string|null;important:boolean};

const CLUB="K.S. Delta Warszawa GM";

function datePL(v:string){
  try{return new Date(`${v}T12:00:00`).toLocaleDateString("pl-PL",{day:"2-digit",month:"2-digit",year:"numeric"});}catch{return v}
}
function opponent(m:Match){return m.home_team===CLUB?m.away_team:m.home_team}
function ours(m:Match){return m.home_team===CLUB?(m.home_score??0):(m.away_score??0)}
function theirs(m:Match){return m.home_team===CLUB?(m.away_score??0):(m.home_score??0)}

export default function PublicTeamSite(props:{
  matches:Match[];
  news:News[];
  clubUpdates:ClubUpdate[];
  teamEvents:TeamEvent[];
}){
  const now=new Date();
  const nextMatch=props.matches
    .filter(m=>m.status==="scheduled" && new Date(`${m.match_date}T${m.match_time||"23:59"}:00`)>=now)
    .sort((a,b)=>`${a.match_date} ${a.match_time||""}`.localeCompare(`${b.match_date} ${b.match_time||""}`))[0]||null;

  const recent=props.matches.filter(m=>m.status==="played").slice().sort((a,b)=>b.match_date.localeCompare(a.match_date)).slice(0,5);
  const played=props.matches.filter(m=>m.status==="played");
  const wins=played.filter(m=>ours(m)>theirs(m)).length;
  const goals=played.reduce((sum,m)=>sum+ours(m),0);

  return <main className="public-team-site">
    <header className="public-topbar">
      <div className="public-brand">
        <img src="/teamlogos/gm.png" alt="DELTA 2018 GM"/>
        <div><b>DELTA 2018 GM</b><span>Górny Mokotów</span></div>
      </div>
      <Link href="/login" className="public-login"><LockKeyhole size={15}/> STREFA RODZICA</Link>
    </header>

    <section className="public-hero">
      <div className="public-hero-overlay"/>
      <div className="public-hero-copy">
        <span>K.S. DELTA WARSZAWA • GÓRNY MOKOTÓW</span>
        <h1>DELTA <em>2018</em> GM</h1>
        <p>Mecze, wyniki, wydarzenia i oficjalne informacje drużyny.</p>
        <div className="public-hero-actions">
          <a href="#mecze">TERMINARZ <ChevronRight size={15}/></a>
          <Link href="/login">ZALOGUJ SIĘ <LockKeyhole size={14}/></Link>
        </div>
      </div>
    </section>

    {nextMatch&&<section className="public-next-match devil-card">
      <div className="public-section-title"><CalendarDays size={17}/> NAJBLIŻSZY MECZ <span>Kolejka {nextMatch.round_no||"—"}</span></div>
      <div className="public-match-main">
        <div><small>GOSPODARZ</small><b>{nextMatch.home_team}</b></div>
        <strong>VS</strong>
        <div className="right"><small>GOŚĆ</small><b>{nextMatch.away_team}</b></div>
      </div>
      <div className="public-match-meta">
        <span>{datePL(nextMatch.match_date)} • {nextMatch.match_time||"godzina do ustalenia"}</span>
        <span>{nextMatch.venue||"Miejsce do ustalenia"}</span>
      </div>
      <div className="public-parent-lock">
        <LockKeyhole size={16}/>
        <span>Potwierdzanie obecności zawodnika jest dostępne po zalogowaniu rodzica.</span>
        <Link href="/login">STREFA RODZICA <ChevronRight size={13}/></Link>
      </div>
    </section>}

    <section className="public-kpis">
      <article><Trophy size={21}/><b>{played.length}</b><span>ROZEGRANE MECZE</span></article>
      <article><Zap size={21}/><b>{wins}</b><span>WYGRANE</span></article>
      <article><Goal size={21}/><b>{goals}</b><span>BRAMKI DRUŻYNY</span></article>
      <article><Users size={21}/><b>2018</b><span>ROCZNIK</span></article>
    </section>

    <section id="mecze" className="public-grid">
      <article className="public-card devil-card">
        <div className="public-section-title"><Trophy size={17}/> OSTATNIE MECZE</div>
        <div className="public-results">
          {recent.length?recent.map(m=><div key={m.id}>
            <span className={ours(m)>theirs(m)?"w":ours(m)===theirs(m)?"d":"l"}>{ours(m)>theirs(m)?"W":ours(m)===theirs(m)?"R":"P"}</span>
            <div><b>{opponent(m)}</b><small>{datePL(m.match_date)}</small></div>
            <strong>{ours(m)}:{theirs(m)}</strong>
          </div>):<p>Sezon dopiero się rozpoczyna.</p>}
        </div>
      </article>

      <article className="public-card devil-card">
        <div className="public-section-title"><CalendarDays size={17}/> KALENDARZ DRUŻYNY</div>
        <div className="public-events">
          {props.teamEvents.length?props.teamEvents.slice(0,6).map(e=><div key={e.id}>
            <span><b>{new Date(`${e.event_date}T12:00:00`).getDate()}</b><small>{new Date(`${e.event_date}T12:00:00`).toLocaleDateString("pl-PL",{month:"short"}).toUpperCase()}</small></span>
            <div><b>{e.title}</b><small>{[e.start_time?.slice(0,5),e.location].filter(Boolean).join(" • ")}</small></div>
          </div>):<p>Brak dodatkowych wydarzeń publicznych.</p>}
        </div>
      </article>
    </section>

    <section className="public-grid">
      <article className="public-card devil-card">
        <div className="public-section-title"><Shield size={17}/> Z KLUBU</div>
        <div className="public-news">
          {props.clubUpdates.slice(0,4).map(x=><div key={x.id}>
            <span>{new Date(x.published_at).toLocaleDateString("pl-PL")}</span>
            <b>{x.title}</b>
            {x.body&&<p>{x.body.slice(0,220)}{x.body.length>220?"…":""}</p>}
          </div>)}
          {!props.clubUpdates.length&&<p>Brak nowych informacji z klubu.</p>}
        </div>
      </article>

      <article className="public-card devil-card">
        <div className="public-section-title"><Newspaper size={17}/> AKTUALNOŚCI DRUŻYNY</div>
        <div className="public-news">
          {props.news.slice(0,5).map(x=><div key={x.id}>
            <span>{new Date(x.published_at).toLocaleDateString("pl-PL")}</span>
            <b>{x.title}</b>
            {x.body&&<p>{x.body.slice(0,220)}{x.body.length>220?"…":""}</p>}
          </div>)}
          {!props.news.length&&<p>Brak aktualności.</p>}
        </div>
      </article>
    </section>

    <section className="public-private-zone devil-card">
      <div><LockKeyhole size={28}/><span>PRYWATNA STREFA DRUŻYNY</span><h2>Więcej po zalogowaniu</h2></div>
      <div className="public-private-list">
        <span>✓ potwierdzanie obecności dziecka</span>
        <span>✓ Centrum Treningowe</span>
        <span>✓ profile i statystyki zawodników</span>
        <span>✓ prywatny kalendarz i informacje</span>
        <span>✓ składy i gry kontrolne</span>
        <span>✓ Centrum Statystyk</span>
      </div>
      <Link href="/login">WEJDŹ DO STREFY RODZICA <ChevronRight size={15}/></Link>
    </section>

    <footer className="public-footer">
      <img src="/teamlogos/gm.png" alt=""/>
      <div><b>DELTA 2018 GM</b><span>Publiczna strona drużyny • dane dzieci dostępne tylko po zalogowaniu</span></div>
    </footer>
  </main>;
}
