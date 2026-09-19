"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CalendarDays, ChevronRight, CircleDot, Medal, Shield, Trophy, Pencil, Save, X } from "lucide-react";

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
// Kolejność przy remisie punktów jest zachowana z tabeli źródłowej; potwierdź regulamin ligi.
const INITIAL_ORDER=[TEAMS[0],TEAMS[1],TEAMS[2],OUR,TEAMS[4],TEAMS[5],TEAMS[6]];
type LeagueEdit={fixture_id:string;match_date:string;home_score:number|null;away_score:number|null;status:"scheduled"|"played"|"postponed"|"cancelled"};
function useLeagueEdits(){
 const [rows,setRows]=useState<LeagueEdit[]>([]),[ready,setReady]=useState(false),[dbError,setDbError]=useState("");
 useEffect(()=>{let active=true;const client=createClient();
  const refresh=async()=>{const {data,error}=await client.from("league_fixture_updates").select("fixture_id,match_date,home_score,away_score,status");
   if(!active)return;if(error){setDbError(error.message);setReady(true);return;}
   setRows((data||[]) as LeagueEdit[]);setDbError("");setReady(true);};
  void refresh();const onFocus=()=>{void refresh()};window.addEventListener("focus",onFocus);
  return()=>{active=false;window.removeEventListener("focus",onFocus)};
 },[]);
 return {rows,setRows,ready,dbError};
}
function resolveFixture(f:LeagueFixture,edits:LeagueEdit[],matches:LeagueMatch[]){
 const edit=edits.find(e=>e.fixture_id===f.id);
 // Nadrzędnym źródłem wyniku naszego meczu jest istniejące Centrum Meczu.
 const gameScore=ownMatchScore(f,matches);
 const score=gameScore || (edit?.status==="played"&&edit.home_score!==null&&edit.away_score!==null?[edit.home_score,edit.away_score] as [number,number]:undefined);
 const fallback=!edit&&f.result?f.result:undefined;
 return {...f,date:edit?.match_date||f.date,result:score||fallback,
  status:edit?.status||((score||fallback)?"played":"scheduled")};
}
function standings(fixtures:LeagueFixture[]){
 const rows=INITIAL_ORDER.map(team=>({team,p:0,m:0,w:0,d:0,l:0,gf:0,ga:0}));
 for(const f of fixtures){if(!f.result)continue;
  const home=rows.find(r=>r.team===f.home),away=rows.find(r=>r.team===f.away);
  if(!home||!away)continue;
  const [h,a]=f.result;home.m++;away.m++;home.gf+=h;home.ga+=a;away.gf+=a;away.ga+=h;
  if(h>a){home.w++;away.l++;home.p+=3}else if(a>h){away.w++;home.l++;away.p+=3}else{home.d++;away.d++;home.p++;away.p++}
 }
 // Remis punktowy: prowizorycznie zachowujemy kolejność bazową, nie udajemy regulaminu.
 return rows.sort((a,b)=>b.p-a.p||INITIAL_ORDER.indexOf(a.team)-INITIAL_ORDER.indexOf(b.team));
}
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
function ownMatchScore(f:LeagueFixture,matches:LeagueMatch[]){
 if(![f.home,f.away].includes(OUR))return undefined;
 const found=matches.find(m=>{
   if(m.status!=="played"||m.home_score===null||m.away_score===null)return false;
   const forward=normalize(m.home_team)===normalize(f.home)&&normalize(m.away_team)===normalize(f.away);
   const reverse=normalize(m.home_team)===normalize(f.away)&&normalize(m.away_team)===normalize(f.home);
   return (forward||reverse)&&(m.round_no===f.round || (!m.round_no&&m.match_date===f.date));
 });
 if(!found)return undefined;
 return normalize(found.home_team)===normalize(f.home)?[found.home_score!,found.away_score!] as [number,number]:[found.away_score!,found.home_score!] as [number,number];
}
function FixtureRow({f}:{f:LeagueFixture}){
 const score=f.result,ours=f.home===OUR||f.away===OUR;
 return <div className={`league-fixture ${ours?"ours":""}`}>
   <span className="league-fixture-date">{dateLabel(f.date)}</span>
   <span className="league-fixture-name">{TEAM_SHORT[f.home]||f.home}</span>
   <strong className={`league-fixture-score ${score?"played":""}`}>{score?`${score[0]} : ${score[1]}`:f.note||"– : –"}</strong>
   <span className="league-fixture-name away">{TEAM_SHORT[f.away]||f.away}</span>
   {ours&&<span className="league-ours-tag">NASZ MECZ</span>}
 </div>;
}
export function LeagueHome({matches,onOpen}:{matches:LeagueMatch[];onOpen:()=>void}){
 const {rows}=useLeagueEdits();
 const schedule=useMemo(()=>SCHEDULE.map(f=>resolveFixture(f,rows,matches)),[rows,matches]);
 const table=useMemo(()=>standings(schedule),[schedule]);
 const position=table.findIndex(r=>r.team===OUR),current=table[position];
 const next=schedule.find(f=>!f.result&&f.status!=="cancelled"),played=schedule.filter(f=>!!f.result);
 const latestRound=Math.max(1,...played.map(f=>f.round));
 return <section className="league-home" aria-label="Rozgrywki ligowe">
  <article className="league-card league-home-table">
   <div className="league-head"><div><small>WEWNĘTRZNA LIGA ŻAKÓW • 2026/27</small><h2><Trophy size={22}/> TABELA LIGI</h2></div><span className="league-season">JESIEŃ</span></div>
   <div className="league-rank"><div><small>DELTA WARSZAWA GM</small><strong>{position+1}<em>. MIEJSCE</em></strong></div><div><small>PUNKTY</small><strong>{current.p}</strong></div><div><small>BRAMKI</small><strong>{current.gf}:{current.ga}</strong></div></div>
   <div className="league-mini-table">{table.slice(0,4).map((row,i)=><div className={`league-mini-row ${row.team===OUR?"ours":""}`} key={row.team}><b>{i+1}.</b><span>{TEAM_SHORT[row.team]}</span><strong>{row.p} <small>PKT</small></strong></div>)}</div>
   <button className="league-cta" type="button" onClick={onOpen}>PEŁNA TABELA I ROZGRYWKI <ChevronRight size={17}/></button>
  </article>
  <article className="league-card league-home-results">
   <div className="league-head"><div><small>WYNIKI I TERMINARZ</small><h2><CircleDot size={22}/> MECZE W LIDZE</h2></div><span className="league-season">KOLEJKI</span></div>
   <div className="league-home-subhead">KOLEJKA {latestRound} • WYNIKI</div>
   {played.filter(f=>f.round===latestRound).map(f=><FixtureRow key={f.id} f={f}/>)}
   {next&&<><div className="league-home-subhead">NAJBLIŻSZE NIEROZEGRANE SPOTKANIE</div><FixtureRow f={next}/></>}
   <button className="league-cta secondary" type="button" onClick={onOpen}>ZOBACZ TERMINARZ KOLEJEK <ChevronRight size={17}/></button>
  </article>
 </section>;
}
export default function LeagueCenter({matches,isAdmin=false}:{matches:LeagueMatch[];isAdmin?:boolean}){
 const [view,setView]=useState<"table"|"fixtures"|"results"|"ours">("table");
 const [round,setRound]=useState<number>(2);
 const {rows,setRows,ready,dbError}=useLeagueEdits();
 const [editing,setEditing]=useState<string|null>(null),[date,setDate]=useState(""),[home,setHome]=useState(""),[away,setAway]=useState(""),[status,setStatus]=useState<LeagueEdit["status"]>("scheduled"),[saving,setSaving]=useState(false),[message,setMessage]=useState("");
 const schedule=useMemo(()=>SCHEDULE.map(f=>resolveFixture(f,rows,matches)),[rows,matches]);
 const data=useMemo(()=>standings(schedule),[schedule]);
 const fixtures=schedule.filter(f=>view==="ours"?(f.home===OUR||f.away===OUR):view==="results"?!!f.result:f.round===round);
 function startEdit(f:LeagueFixture){if(f.home===OUR||f.away===OUR)return;
  const edit=rows.find(r=>r.fixture_id===f.id);setEditing(f.id);setDate(edit?.match_date||f.date);
  setHome(f.result?String(f.result[0]):"");setAway(f.result?String(f.result[1]):"");setStatus(edit?.status||((f.result)?"played":"scheduled"));setMessage("");}
 async function save(f:LeagueFixture){if(!isAdmin)return;
  const hs=home.trim()===""?null:Number(home),as=away.trim()===""?null:Number(away);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+"T12:00:00"))){setMessage("Wybierz poprawną datę.");return}
  if(status==="played"&&(hs===null||as===null||!Number.isInteger(hs)||!Number.isInteger(as)||hs<0||as<0||hs>99||as>99)){
   setMessage("Dla rozegranego meczu wpisz dwa poprawne wyniki od 0 do 99.");return}
  const item:LeagueEdit={fixture_id:f.id,match_date:date,home_score:status==="played"?hs:null,away_score:status==="played"?as:null,status};
  setSaving(true);setMessage("");const {data,error}=await createClient().from("league_fixture_updates").upsert(item,{onConflict:"fixture_id"}).select("fixture_id,match_date,home_score,away_score,status").single();setSaving(false);
  if(error){setMessage(`Nie zapisano wyniku: ${error.message}`);return}
  setRows(old=>[...old.filter(r=>r.fixture_id!==f.id),data as LeagueEdit]);setEditing(null);setMessage("Zapisano. Tabela i wyniki są aktualne.");}
 return <section className="league-page" aria-label="Centrum rozgrywek">
  <header className="league-page-hero"><small>DELTA 2018 GM • SEZON 2026/2027</small><h1>CENTRUM <em>ROZGRYWEK</em></h1><p>Wewnętrzna Liga Żaków · jesień · wszystkie drużyny i kolejki</p><div className="league-hero-details"><span><Trophy size={16}/> 7 DRUŻYN</span><span><CalendarDays size={16}/> 7 KOLEJEK</span><span><Shield size={16}/> DELTA GM</span></div></header>
  {isAdmin&&dbError&&<p className="league-admin-message" role="alert">Brak połączenia z tabelą ligi: {dbError}. Uruchom plik SQL z paczki w Supabase → SQL Editor.</p>}
  {isAdmin&&message&&<p className="league-admin-message" role="status">{message}</p>}
  <div className="league-tabs" role="tablist" aria-label="Widoki ligi">
   {([['table','Tabela'],['fixtures','Terminarz'],['results','Wyniki'],['ours','Nasze mecze']] as const).map(([id,label])=><button key={id} role="tab" aria-selected={view===id} className={view===id?"active":""} onClick={()=>setView(id)}>{label}</button>)}
  </div>
  {view==="table"?<article className="league-card"><div className="league-head"><div><small>KLASYFIKACJA NA PODSTAWIE ZAPISANYCH WYNIKÓW</small><h2><Medal size={22}/> TABELA LIGOWA</h2></div></div><div className="league-table-scroll"><table className="league-full-table"><thead><tr><th>LP.</th><th>DRUŻYNA</th><th>PKT</th><th>M</th><th>Z</th><th>R</th><th>P</th><th>BRAMKI</th><th>BIL.</th></tr></thead><tbody>{data.map((r,i)=><tr key={r.team} className={r.team===OUR?"ours":""}><td>{i+1}</td><th scope="row">{r.team}</th><td><strong>{r.p}</strong></td><td>{r.m||"–"}</td><td>{r.w}</td><td>{r.d}</td><td>{r.l}</td><td>{r.m?`${r.gf}:${r.ga}`:"–"}</td><td>{r.m?(r.gf-r.ga>0?`+${r.gf-r.ga}`:r.gf-r.ga):"–"}</td></tr>)}</tbody></table></div><p className="league-source-note">Punktacja: 3 punkty za zwycięstwo, 1 za remis. Przy równej liczbie punktów zachowujemy kolejność z tabeli po pierwszej kolejce; kryteria regulaminowe wymagają potwierdzenia.</p></article>
  :<article className="league-card"><div className="league-head"><div><small>{view==="ours"?"DROGA DELTA GM":view==="results"?"ROZEGRANE SPOTKANIA":"TERMINARZ WSZYSTKICH DRUŻYN"}</small><h2><CircleDot size={22}/>{view==="ours"?" NASZE MECZE":view==="results"?" WYNIKI":" KOLEJKI"}</h2></div></div>
   {view==="fixtures"&&<div className="league-rounds" aria-label="Wybór kolejki">{[1,2,3,4,5,6,7].map(n=><button className={round===n?"active":""} key={n} onClick={()=>setRound(n)}>KOLEJKA {n}</button>)}</div>}
   {view==="ours"||view==="results"? [1,2,3,4,5,6,7].filter(n=>fixtures.some(f=>f.round===n)).map(n=><div key={n}><h3 className="league-round-label">KOLEJKA {n}</h3>{fixtures.filter(f=>f.round===n).map(f=><FixtureRow key={f.id} f={f}/>)}</div>):fixtures.map(f=><div className="league-edit-item" key={f.id}><FixtureRow f={f}/>{isAdmin&&f.home!==OUR&&f.away!==OUR&&<><button type="button" className="league-edit-toggle" onClick={()=>editing===f.id?setEditing(null):startEdit(f)}><Pencil size={15}/> {editing===f.id?"Zamknij":"Edytuj wynik / termin"}</button>{editing===f.id&&<form className="league-edit-form" onSubmit={e=>{e.preventDefault();void save(f)}}><label>Data meczu<input type="date" required value={date} onChange={e=>setDate(e.target.value)}/></label><label>Status<select value={status} onChange={e=>setStatus(e.target.value as LeagueEdit["status"])}><option value="scheduled">Przed meczem</option><option value="played">Rozegrany</option><option value="postponed">Przełożony</option><option value="cancelled">Odwołany</option></select></label><label>Gospodarze<input type="number" min="0" max="99" inputMode="numeric" disabled={status!=="played"} value={home} onChange={e=>setHome(e.target.value)}/></label><label>Goście<input type="number" min="0" max="99" inputMode="numeric" disabled={status!=="played"} value={away} onChange={e=>setAway(e.target.value)}/></label><button type="submit" className="league-cta" disabled={saving||!ready||!!dbError}><Save size={15}/>{saving?"Zapisuję...":"Zapisz wynik"}</button><button type="button" className="league-edit-toggle" onClick={()=>setEditing(null)}><X size={15}/> Anuluj</button></form>}</>}</div>)}
   {!fixtures.length&&<p className="league-source-note">Brak wyników do wyświetlenia.</p>}
   <p className="league-source-note">Mecze DELTA GM edytuj w istniejącym Centrum Meczu. W tabeli uwzględniamy zapisane wyniki tych spotkań, jeśli pasują do kolejki i pary drużyn.</p>
  </article>}
 </section>;
}
