"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronRight, CircleDot, Medal, Shield, Trophy } from "lucide-react";

/** Stan początkowy przepisany z tabeli/terminarza udostępnionego 19.09.2026. */
const OUR = "K.S. Delta Warszawa GM";
const TEAMS = [
  "Alfa Przymierze Rodzin", "RKS Ursus Warszawa", "K.S. Delta Warszawa WI",
  OUR, "MUKS Julianów", "K.S. Delta Warszawa WA", "FC Vizja Warszawa",
] as const;
export type LeagueMatch = { home_team:string; away_team:string; home_score:number|null; away_score:number|null; match_date:string; status:string; round_no:number|null };
type LeagueFixture = { id:string; round:number; date:string; home:string; away:string; result?:[number,number]; note?:string };
const SCHEDULE:LeagueFixture[] = [
 {id:"1a",round:1,date:"2026-09-12",home:TEAMS[2],away:OUR,result:[11,10]},
 {id:"1c",round:1,date:"2026-09-12",home:TEAMS[0],away:TEAMS[5],result:[8,5]},
 {id:"1d",round:1,date:"2026-09-12",home:TEAMS[4],away:TEAMS[1],result:[4,6]},
 {id:"2a",round:2,date:"2026-09-20",home:TEAMS[2],away:TEAMS[5]},
 {id:"2b",round:2,date:"2026-09-20",home:TEAMS[0],away:TEAMS[1]},
 {id:"2c",round:2,date:"2026-09-20",home:TEAMS[4],away:TEAMS[6]},
 {id:"3a",round:3,date:"2026-09-26",home:TEAMS[1],away:TEAMS[2]},
 {id:"3b",round:3,date:"2026-09-26",home:TEAMS[4],away:OUR},
 {id:"3c",round:3,date:"2026-09-26",home:TEAMS[0],away:TEAMS[6]},
 {id:"4a",round:4,date:"2026-10-03",home:TEAMS[1],away:TEAMS[5]},
 {id:"4b",round:4,date:"2026-10-03",home:TEAMS[4],away:TEAMS[0]},
 {id:"4c",round:4,date:"2026-10-03",home:TEAMS[6],away:OUR},
 {id:"5a",round:5,date:"2026-10-10",home:TEAMS[4],away:TEAMS[2]},
 {id:"5b",round:5,date:"2026-10-10",home:TEAMS[1],away:TEAMS[6]},
 {id:"5c",round:5,date:"2026-10-10",home:OUR,away:TEAMS[5]},
 {id:"6a",round:6,date:"2026-10-17",home:TEAMS[2],away:TEAMS[6]},
 {id:"6b",round:6,date:"2026-10-17",home:TEAMS[0],away:OUR},
 {id:"6c",round:6,date:"2026-10-17",home:TEAMS[1],away:TEAMS[4]},
 {id:"7a",round:7,date:"2026-10-24",home:TEAMS[0],away:TEAMS[2]},
 {id:"7b",round:7,date:"2026-10-24",home:TEAMS[5],away:TEAMS[6]},
 {id:"7c",round:7,date:"2026-10-24",home:OUR,away:TEAMS[4]},
];
// Wiersze udostępnionej tabeli po pierwszej kolejce (nie przeliczamy z niepełnego terminarza).
const INITIAL_TABLE = [
 {team:TEAMS[0],p:3,m:1,w:1,d:0,l:0,gf:8,ga:5},
 {team:TEAMS[1],p:3,m:1,w:1,d:0,l:0,gf:6,ga:4},
 {team:TEAMS[2],p:3,m:1,w:1,d:0,l:0,gf:11,ga:10},
 {team:OUR,p:0,m:1,w:0,d:0,l:1,gf:10,ga:11},
 {team:TEAMS[4],p:0,m:1,w:0,d:0,l:1,gf:4,ga:6},
 {team:TEAMS[5],p:0,m:1,w:0,d:0,l:1,gf:5,ga:8},
 {team:TEAMS[6],p:0,m:0,w:0,d:0,l:0,gf:0,ga:0},
];
const TEAM_SHORT:Record<string,string>={
 "Alfa Przymierze Rodzin":"Alfa Przymierze Rodzin",
 "RKS Ursus Warszawa":"RKS Ursus",
 "K.S. Delta Warszawa WI":"Delta WI",
 [OUR]:"Delta GM",
 "MUKS Julianów":"MUKS Julianów",
 "K.S. Delta Warszawa WA":"Delta WA",
 "FC Vizja Warszawa":"FC Vizja",
};
function dateLabel(date:string){return new Date(`${date}T12:00:00`).toLocaleDateString("pl-PL",{day:"2-digit",month:"2-digit"});}
function normalize(name:string){return name.toLocaleLowerCase("pl-PL").replace(/[^a-z0-9ąćęłńóśźż]/g,"");}
function liveScore(f:LeagueFixture,matches:LeagueMatch[]){
 if(![f.home,f.away].includes(OUR))return f.result;
 const found=matches.find(m=>{
   if(m.status!=="played"||m.home_score===null||m.away_score===null)return false;
   const forward=normalize(m.home_team)===normalize(f.home)&&normalize(m.away_team)===normalize(f.away);
   const reverse=normalize(m.home_team)===normalize(f.away)&&normalize(m.away_team)===normalize(f.home);
   // Data może ulec zmianie, ale para musi odpowiadać kolejce, jeśli numer jest zapisany.
   return (forward||reverse)&&(m.round_no===f.round || (!m.round_no&&m.match_date===f.date));
 });
 if(!found)return f.result;
 return normalize(found.home_team)===normalize(f.home)?[found.home_score!,found.away_score!] as [number,number]:[found.away_score!,found.home_score!] as [number,number];
}
function FixtureRow({f,matches}:{f:LeagueFixture;matches:LeagueMatch[]}){
 const score=liveScore(f,matches),ours=f.home===OUR||f.away===OUR;
 return <div className={`league-fixture ${ours?"ours":""}`}>
   <span className="league-fixture-date">{dateLabel(f.date)}</span>
   <span className="league-fixture-name">{TEAM_SHORT[f.home]||f.home}</span>
   <strong className={`league-fixture-score ${score?"played":""}`}>{score?`${score[0]} : ${score[1]}`:"– : –"}</strong>
   <span className="league-fixture-name away">{TEAM_SHORT[f.away]||f.away}</span>
   {ours&&<span className="league-ours-tag">NASZ MECZ</span>}
 </div>;
}
export function LeagueHome({matches,onOpen}:{matches:LeagueMatch[];onOpen:()=>void}){
 const ours=INITIAL_TABLE.findIndex(x=>x.team===OUR), next=SCHEDULE.find(f=>!liveScore(f,matches));
 return <section className="league-home" aria-label="Rozgrywki ligowe">
  <article className="league-card league-home-table">
   <div className="league-head"><div><small>WEWNĘTRZNA LIGA ŻAKÓW • 2026/27</small><h2><Trophy size={22}/> TABELA LIGI</h2></div><span className="league-season">JESIEŃ</span></div>
   <div className="league-rank"><div><small>DELTA WARSZAWA GM</small><strong>{ours+1}<em>. MIEJSCE</em></strong></div><div><small>PUNKTY</small><strong>{INITIAL_TABLE[ours].p}</strong></div><div><small>BRAMKI</small><strong>{INITIAL_TABLE[ours].gf}:{INITIAL_TABLE[ours].ga}</strong></div></div>
   <div className="league-mini-table">{INITIAL_TABLE.slice(0,4).map((row,i)=><div className={`league-mini-row ${row.team===OUR?"ours":""}`} key={row.team}><b>{i+1}.</b><span>{TEAM_SHORT[row.team]}</span><strong>{row.p} <small>PKT</small></strong></div>)}</div>
   <button className="league-cta" type="button" onClick={onOpen}>PEŁNA TABELA I ROZGRYWKI <ChevronRight size={17}/></button>
  </article>
  <article className="league-card league-home-results">
   <div className="league-head"><div><small>WYNIKI I TERMINARZ</small><h2><CircleDot size={22}/> MECZE W LIDZE</h2></div><span className="league-season">KOLEJKI</span></div>
   <div className="league-home-subhead">KOLEJKA I • WYNIKI</div>
   {SCHEDULE.filter(f=>f.round===1&&!!liveScore(f,matches)).map(f=><FixtureRow key={f.id} f={f} matches={matches}/>)}
   {next&&<><div className="league-home-subhead">NAJBLIŻSZE NIEROZEGRANE SPOTKANIE</div><FixtureRow f={next} matches={matches}/></>}
   <button className="league-cta secondary" type="button" onClick={onOpen}>ZOBACZ TERMINARZ KOLEJEK <ChevronRight size={17}/></button>
  </article>
 </section>;
}
export default function LeagueCenter({matches}:{matches:LeagueMatch[]}){
 const [view,setView]=useState<"table"|"fixtures"|"results"|"ours">("table");
 const [round,setRound]=useState<number>(2);
 const data=useMemo(()=>{
  // Punktacja i bilans tabeli pozostają zgodne ze stanem źródłowym po kolejce I.
  // Nie dopisujemy punktów po meczach bez kompletu wyników i potwierdzonego regulaminu.
  return INITIAL_TABLE;
 },[]);
 const fixtures=SCHEDULE.filter(f=>view==="ours"?(f.home===OUR||f.away===OUR):view==="results"?!!liveScore(f,matches):f.round===round);
 return <section className="league-page" aria-label="Centrum rozgrywek">
  <header className="league-page-hero"><small>DELTA 2018 GM • SEZON 2026/2027</small><h1>CENTRUM <em>ROZGRYWEK</em></h1><p>Wewnętrzna Liga Żaków · jesień · wszystkie drużyny i kolejki</p><div className="league-hero-details"><span><Trophy size={16}/> 7 DRUŻYN</span><span><CalendarDays size={16}/> 7 KOLEJEK</span><span><Shield size={16}/> DELTA GM</span></div></header>
  <div className="league-tabs" role="tablist" aria-label="Widoki ligi">
   {([['table','Tabela'],['fixtures','Terminarz'],['results','Wyniki'],['ours','Nasze mecze']] as const).map(([id,label])=><button key={id} role="tab" aria-selected={view===id} className={view===id?"active":""} onClick={()=>setView(id)}>{label}</button>)}
  </div>
  {view==="table"?<article className="league-card"><div className="league-head"><div><small>KLASYFIKACJA PO I KOLEJCE · STAN Z PRZESŁANEGO ZRZUTU</small><h2><Medal size={22}/> TABELA LIGOWA</h2></div></div><div className="league-table-scroll"><table className="league-full-table"><thead><tr><th>LP.</th><th>DRUŻYNA</th><th>PKT</th><th>M</th><th>Z</th><th>R</th><th>P</th><th>BRAMKI</th><th>BIL.</th></tr></thead><tbody>{data.map((r,i)=><tr key={r.team} className={r.team===OUR?"ours":""}><td>{i+1}</td><th scope="row">{r.team}</th><td><strong>{r.p}</strong></td><td>{r.m||"–"}</td><td>{r.w}</td><td>{r.d}</td><td>{r.l}</td><td>{r.m?`${r.gf}:${r.ga}`:"–"}</td><td>{r.m?(r.gf-r.ga>0?`+${r.gf-r.ga}`:r.gf-r.ga):"–"}</td></tr>)}</tbody></table></div><p className="league-source-note">Tabela odzwierciedla przesłany stan po pierwszej kolejce. Wyniki późniejszych meczów DELTA GM pojawiają się w terminarzu na podstawie danych aplikacji; tabela nie jest jeszcze automatycznie przeliczana.</p></article>
  :<article className="league-card"><div className="league-head"><div><small>{view==="ours"?"DROGA DELTA GM":view==="results"?"ROZEGRANE SPOTKANIA":"TERMINARZ WSZYSTKICH DRUŻYN"}</small><h2><CircleDot size={22}/>{view==="ours"?" NASZE MECZE":view==="results"?" WYNIKI":" KOLEJKI"}</h2></div></div>
   {view==="fixtures"&&<div className="league-rounds" aria-label="Wybór kolejki">{[1,2,3,4,5,6,7].map(n=><button className={round===n?"active":""} key={n} onClick={()=>setRound(n)}>KOLEJKA {n}</button>)}</div>}
   {view==="ours"||view==="results"? [1,2,3,4,5,6,7].filter(n=>fixtures.some(f=>f.round===n)).map(n=><div key={n}><h3 className="league-round-label">KOLEJKA {n}</h3>{fixtures.filter(f=>f.round===n).map(f=><FixtureRow key={f.id} f={f} matches={matches}/>)}</div>):fixtures.map(f=><FixtureRow key={f.id} f={f} matches={matches}/>)}
   {!fixtures.length&&<p className="league-source-note">Brak wyników do wyświetlenia.</p>}
   <p className="league-source-note">Terminy kolejek są orientacyjne (na źródłowym obrazie część podano jako zakres dwóch dni). Dokładne godziny i terminy naszych meczów sprawdzaj w Centrum Meczu.</p>
  </article>}
 </section>;
}
