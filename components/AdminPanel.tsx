"use client";

import { useMemo, useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { UserPermissions } from "@/lib/permissions";
import { EMPTY_PERMISSIONS } from "@/lib/permissions";
import PlayerPhoto from "./PlayerPhoto";
import { 
  ArrowLeft, Save, Plus, Trash2, Users, CalendarDays, Trophy, Newspaper, 
  Link2, Bell, Goal, Crown, Star, Shield, RefreshCw, CakeSlice, Edit3, 
  Search, Camera, CheckCircle2, X, Upload, Check, AlertCircle, Sparkles, Gift, Coins, Flame 
} from "lucide-react";

type Player={id:string;display_name:string;shirt_number:string|null;position:string|null;photo_path:string|null;active:boolean};
type Match={id:string;round_no:number|null;match_date:string;match_time:string|null;venue:string|null;home_team:string;away_team:string;home_score:number|null;away_score:number|null;status:string};
type Attendance={match_id:string;player_id:string;status:string};
type Lineup={match_id:string;player_id:string;is_starter:boolean;is_captain:boolean};
type Event={id:string;match_id:string;event_type:string;player_id:string|null;assist_player_id:string|null;minute:number|null;created_at:string};
type News={id:string;type:string;title:string;body:string|null;published_at:string};
type Profile={id:string;display_name:string|null;role:string};
type ParentLink={parent_id:string;player_id:string};
type PermissionRow=UserPermissions&{user_id:string;updated_by?:string|null;updated_at?:string};
type TeamEvent={id:string;title:string;event_type:string;event_date:string;start_time:string|null;end_time:string|null;location:string|null;details:string|null;important:boolean;player_id:string|null;created_at:string};
type TrainingSession={id:string;training_date:string;start_time:string|null;end_time:string|null;location:string|null;title:string;notes:string|null;created_at:string};
type TrainingAttendance={training_id:string;player_id:string;status:string};
type TrainingGame={id:string;training_id:string;team_a_name:string;team_b_name:string;team_a_score:number;team_b_score:number;created_at:string};
type TrainingGamePlayer={game_id:string;player_id:string;team:string};
type TrainingEvent={id:string;game_id:string;event_type:string;player_id:string|null;assist_player_id:string|null;created_at:string};
type MatchMedia={id:string;match_id:string;storage_path:string;caption:string|null;created_at:string};
type SyncLog={id:number|string;status:string;items_found:number;items_inserted:number;details:string|null;created_at:string};

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
  initialMatchMedia:MatchMedia[];
  allProfiles:Profile[];
  initialParentLinks:ParentLink[];
  initialPermissions:PermissionRow[];
  currentPermissions:UserPermissions;
  initialSyncLogs:SyncLog[];
}){
  const supabase=createClient();
  const coreStaff=props.currentUser.role==="admin"||props.currentUser.role==="coach";
  const isAdmin=props.currentUser.role==="admin";
  const canMatchBasics=coreStaff||props.currentPermissions.can_manage_matches;
  const canMatchEvents=canMatchBasics||props.currentPermissions.can_edit_match_events;
  const canMatches=canMatchBasics||canMatchEvents;
  const canCalendar=coreStaff||props.currentPermissions.can_manage_calendar;
  const canTrainingFull=coreStaff||props.currentPermissions.can_manage_training;
  const canTrainingAttendance=canTrainingFull||props.currentPermissions.can_manage_training_attendance;
  const canTraining=canTrainingFull||canTrainingAttendance;
  const canPlayers=coreStaff||props.currentPermissions.can_manage_players;
  const canNews=coreStaff||props.currentPermissions.can_manage_news;
  const firstTab:string=canMatches?"matches":canTraining?"training":canCalendar?"calendar":canNews?"news":canPlayers?"players":"matches";
  const [tab,setTab]=useState<"matches"|"calendar"|"training"|"players"|"cards"|"news"|"parents"|"push"|"sync">(firstTab as any);
  const [syncing,setSyncing]=useState(false);
  const [syncResult,setSyncResult]=useState<string>("");
  const [syncLogs,setSyncLogs]=useState(props.initialSyncLogs);
  const [players,setPlayers]=useState(props.initialPlayers);
  const [matches,setMatches]=useState(props.initialMatches);
  const [attendance,setAttendance]=useState(props.initialAttendance);
  const [lineup,setLineup]=useState(props.initialLineup);
  const [events,setEvents]=useState(props.initialEvents);
  const [goalBusy,setGoalBusy]=useState(false);
  const [news,setNews]=useState(props.initialNews);
  const [teamEvents,setTeamEvents]=useState(props.initialTeamEvents);
  const [trainingSessions,setTrainingSessions]=useState(props.initialTrainingSessions);
  const [trainingAttendance,setTrainingAttendance]=useState(props.initialTrainingAttendance);
  const [trainingGames,setTrainingGames]=useState(props.initialTrainingGames);
  const [trainingGamePlayers,setTrainingGamePlayers]=useState(props.initialTrainingGamePlayers);
  const [trainingEvents,setTrainingEvents]=useState(props.initialTrainingEvents);
  const [matchMedia,setMatchMedia]=useState(props.initialMatchMedia);
  const [selectedTrainingId,setSelectedTrainingId]=useState(props.initialTrainingSessions[0]?.id||"");
  const [selectedTrainingGameId,setSelectedTrainingGameId]=useState(
    props.initialTrainingGames.find(g=>g.training_id===props.initialTrainingSessions[0]?.id)?.id||""
  );
  const [trainingBusy,setTrainingBusy]=useState<string|null>(null);
  const [trainingFeedback,setTrainingFeedback]=useState<string>("");
  const [parentLinks,setParentLinks]=useState(props.initialParentLinks);
  const [permissions,setPermissions]=useState<PermissionRow[]>(props.initialPermissions);
  const [allProfiles,setAllProfiles]=useState<Profile[]>(props.allProfiles);
  const [selectedMatchId,setSelectedMatchId]=useState(matches[0]?.id||"");
  const selectedMatch=matches.find(m=>m.id===selectedMatchId)||null;
  const activePlayers=players.filter(p=>p.active!==false);

  // Stan edycji i zarządzania zawodnikami
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);
  const [playerFormName, setPlayerFormName] = useState("");
  const [playerFormNumber, setPlayerFormNumber] = useState("");
  const [playerFormPosition, setPlayerFormPosition] = useState("Zawodnik");
  const [playerFormActive, setPlayerFormActive] = useState(true);
  const [playerFormPhotoFile, setPlayerFormPhotoFile] = useState<File | null>(null);
  const [playerFormPhotoPreview, setPlayerFormPhotoPreview] = useState<string | null>(null);
  const [playerFormSaving, setPlayerFormSaving] = useState(false);
  const [playerSearchQuery, setPlayerSearchQuery] = useState("");
  const [playerFilterTab, setPlayerFilterTab] = useState<"all" | "active" | "archived">("active");

  // Stan zarządzania kartami i paczkami DELTA CARDS
  const [grantUserTarget, setGrantUserTarget] = useState<string>("all");
  const [grantPackType, setGrantPackType] = useState<string>("standard_pack");
  const [grantQuantity, setGrantQuantity] = useState<number>(1);
  const [grantReason, setGrantReason] = useState<string>("Nagroda specjalna od trenera");
  const [grantingPack, setGrantingPack] = useState(false);

  const [newCardPlayerId, setNewCardPlayerId] = useState<string>(props.initialPlayers[0]?.id || "");
  const [newCardTitle, setNewCardTitle] = useState<string>("");
  const [newCardType, setNewCardType] = useState<string>("matchday");
  const [newCardRarity, setNewCardRarity] = useState<string>("rare");
  const [newCardLore, setNewCardLore] = useState<string>("");
  const [savingCardDef, setSavingCardDef] = useState(false);

  const [grantPointsUserId, setGrantPointsUserId] = useState<string>(props.allProfiles[0]?.id || "");
  const [grantPointsAmount, setGrantPointsAmount] = useState<number>(50);
  const [grantPointsReason, setGrantPointsReason] = useState<string>("Bonus za zaangażowanie");
  const [grantingPoints, setGrantingPoints] = useState(false);

  // Stan zarządzania i usuwania kart z kolekcji
  const [manageCardsUserId, setManageCardsUserId] = useState<string>(props.allProfiles[0]?.id || "");
  const [userManagedCards, setUserManagedCards] = useState<any[]>([]);
  const [loadingUserCards, setLoadingUserCards] = useState(false);
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null);

  const filteredAdminPlayers = useMemo(() => {
    return players.filter(p => {
      if (playerFilterTab === "active" && p.active === false) return false;
      if (playerFilterTab === "archived" && p.active !== false) return false;
      if (playerSearchQuery.trim()) {
        const q = playerSearchQuery.trim().toLowerCase();
        const name = (p.display_name || "").toLowerCase();
        const num = (p.shirt_number || "").toLowerCase();
        const pos = (p.position || "").toLowerCase();
        return name.includes(q) || num.includes(q) || pos.includes(q);
      }
      return true;
    });
  }, [players, playerFilterTab, playerSearchQuery]);
  // Zawodnika można przypisać do dowolnego zalogowanego konta, także administratora.
  // Funkcja rodzica to powiązanie z zawodnikiem, nie zamiana uprawnień admina.
  const parentCandidates=allProfiles.filter(p=>["parent","admin","coach"].includes(p.role));
  const selectedTraining=trainingSessions.find(s=>s.id===selectedTrainingId)||null;
  const trainingGamesForSelected=trainingGames.filter(g=>g.training_id===selectedTrainingId);
  const selectedTrainingGame=trainingGamesForSelected.find(g=>g.id===selectedTrainingGameId)||trainingGamesForSelected[0]||null;
  const selectedTrainingPresentCount=selectedTraining?trainingAttendance.filter(x=>x.training_id===selectedTraining.id&&x.status==="present").length:0;
  const selectedTeamACount=selectedTrainingGame?trainingGamePlayers.filter(x=>x.game_id===selectedTrainingGame.id&&x.team==="A").length:0;
  const selectedTeamBCount=selectedTrainingGame?trainingGamePlayers.filter(x=>x.game_id===selectedTrainingGame.id&&x.team==="B").length:0;

  function flashTrainingFeedback(message:string){
    setTrainingFeedback(message);
    window.setTimeout(()=>setTrainingFeedback(current=>current===message?"":current),1800);
  }

  function friendlyTrainingError(error:any){
    const msg=String(error?.message||error||"Nieznany błąd");
    if(/row-level security|permission denied|policy/i.test(msg))return "Brak uprawnień do zapisu. Sprawdź rolę i uprawnienia Centrum Treningowego w Admin → Rodzice.";
    if(/network|fetch/i.test(msg))return "Nie udało się połączyć z bazą. Sprawdź internet i spróbuj ponownie.";
    return `Nie udało się zapisać: ${msg}`;
  }

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
    const row={match_id:selectedMatch.id,player_id:playerId,is_starter:isStarter,is_captain:isStarter&&(current?.is_captain||false)};
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
    if(!selectedMatch||goalBusy)return;
    const scorerId=(document.getElementById("goalScorer") as HTMLSelectElement).value;
    const assistId=(document.getElementById("goalAssist") as HTMLSelectElement).value||null;
    if(!scorerId)return alert("Wybierz strzelca bramki DELTY.");
    if(assistId===scorerId)return alert("Strzelec nie może być swoim asystentem.");
    setGoalBusy(true);
    try {
      const {data,error}=await supabase.from("match_events").insert({match_id:selectedMatch.id,event_type:"goal",player_id:scorerId,assist_player_id:assistId}).select("*").single();
      if(error)return alert(error.message);
      const key=selectedMatch.home_team===CLUB?"home_score":"away_score";
      const newScore=(selectedMatch[key]??0)+1;
      const result=await supabase.from("matches").update({[key]:newScore}).eq("id",selectedMatch.id);
      if(result.error){
        const rollback=await supabase.from("match_events").delete().eq("id",data.id);
        if(rollback.error){setEvents(prev=>[...prev,data]);alert("Bramka została zapisana, ale wynik nie. Sprawdź i popraw ręcznie wynik meczu.");}
        else alert("Nie zapisano wyniku; bramka nie została dodana: "+result.error.message);
        return;
      }
      setEvents(prev=>[...prev,data]);
      setMatches(prev=>prev.map(m=>m.id===selectedMatch.id?{...m,[key]:newScore}:m));
      alert("Bramka DELTY i wynik zostały zapisane.");
    } finally {setGoalBusy(false);}
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
    if(goalBusy)return;
    const event=events.find(e=>e.id===id);
    if(!event)return;
    if(event.event_type==="goal"&&!window.confirm("Usunąć tę bramkę? Wynik DELTY zostanie pomniejszony o 1."))return;
    setGoalBusy(true);
    try {
      const {error}=await supabase.from("match_events").delete().eq("id",id);
      if(error)return alert(error.message);
      setEvents(prev=>prev.filter(e=>e.id!==id));
      const current=matches.find(m=>m.id===event.match_id);
      if(event.event_type!=="goal"||!current)return;
      const key=current.home_team===CLUB?"home_score":"away_score";
      const score=Math.max(0,(current[key]??0)-1);
      const result=await supabase.from("matches").update({[key]:score}).eq("id",current.id);
      if(result.error)return alert("Bramkę usunięto, ale wynik nie został skorygowany. Popraw go ręcznie: "+result.error.message);
      setMatches(prev=>prev.map(m=>m.id===current.id?{...m,[key]:score}:m));
    } finally {setGoalBusy(false);}
  }

  async function editMatchEvent(id:string){
    const event=events.find(e=>e.id===id);
    if(!event)return;

    if(event.event_type==="goal"){
      const currentScorer=players.find(p=>p.id===event.player_id)?.display_name||"";
      const currentAssist=players.find(p=>p.id===event.assist_player_id)?.display_name||"";

      const scorerName=prompt("Strzelec gola",currentScorer);
      if(scorerName===null)return;
      const scorer=players.find(p=>p.display_name.toLowerCase()===scorerName.trim().toLowerCase());
      if(!scorer)return alert("Nie znaleziono zawodnika o takiej nazwie.");

      const assistName=prompt("Asysta (zostaw puste = brak)",currentAssist);
      if(assistName===null)return;

      let assistId:string|null=null;
      if(assistName.trim()){
        const assist=players.find(p=>p.display_name.toLowerCase()===assistName.trim().toLowerCase());
        if(!assist)return alert("Nie znaleziono zawodnika dla asysty.");
        assistId=assist.id;
      }

      const {error}=await supabase.from("match_events").update({
        player_id:scorer.id,
        assist_player_id:assistId
      }).eq("id",id);

      if(error)return alert(error.message);

      setEvents(prev=>prev.map(e=>e.id===id?{...e,player_id:scorer.id,assist_player_id:assistId}:e));
      return;
    }

    if(event.event_type==="mvp"){
      const current=players.find(p=>p.id===event.player_id)?.display_name||"";
      const name=prompt("MVP",current);
      if(name===null)return;
      const player=players.find(p=>p.display_name.toLowerCase()===name.trim().toLowerCase());
      if(!player)return alert("Nie znaleziono zawodnika.");
      const {error}=await supabase.from("match_events").update({player_id:player.id}).eq("id",id);
      if(error)return alert(error.message);
      setEvents(prev=>prev.map(e=>e.id===id?{...e,player_id:player.id}:e));
    }
  }

  async function uploadMatchPhoto(){
    if(!selectedMatch||!canMatchBasics)return;
    const input=document.getElementById("matchPhotoInput") as HTMLInputElement|null;
    const file=input?.files?.[0]; if(!file)return alert("Wybierz zdjęcie.");
    const ext=(file.name.split(".").pop()||"jpg").replace(/[^a-z0-9]/gi,"").toLowerCase();
    const path=`${selectedMatch.id}/${crypto.randomUUID()}.${ext}`;
    const {error:uploadError}=await supabase.storage.from("match-media").upload(path,file,{upsert:false,contentType:file.type||undefined});
    if(uploadError)return alert(uploadError.message.includes("Bucket")?"Uruchom najpierw SQL v7_permissions_megapack.sql.":uploadError.message);
    const caption=prompt("Podpis do zdjęcia (opcjonalnie)","")||null;
    const {data,error}=await supabase.from("match_media").insert({match_id:selectedMatch.id,storage_path:path,caption,created_by:props.currentUser.id}).select("id,match_id,storage_path,caption,created_at").single();
    if(error){await supabase.storage.from("match-media").remove([path]);return alert(error.message);}
    setMatchMedia(prev=>[...prev,data]); if(input)input.value="";
  }

  async function deleteMatchPhoto(row:MatchMedia){
    if(!confirm("Usunąć to zdjęcie z kroniki meczu?"))return;
    const {error}=await supabase.from("match_media").delete().eq("id",row.id); if(error)return alert(error.message);
    await supabase.storage.from("match-media").remove([row.storage_path]);
    setMatchMedia(prev=>prev.filter(x=>x.id!==row.id));
  }

  function openAddPlayerModal(){
    setEditingPlayer(null);
    setPlayerFormName("");
    setPlayerFormNumber("");
    setPlayerFormPosition("Zawodnik");
    setPlayerFormActive(true);
    setPlayerFormPhotoFile(null);
    setPlayerFormPhotoPreview(null);
    setIsAddingPlayer(true);
  }

  function openEditPlayerModal(p:Player){
    setEditingPlayer(p);
    setPlayerFormName(p.display_name||"");
    setPlayerFormNumber(p.shirt_number||"");
    setPlayerFormPosition(p.position||"Zawodnik");
    setPlayerFormActive(p.active!==false);
    setPlayerFormPhotoFile(null);
    setPlayerFormPhotoPreview(null);
    setIsAddingPlayer(false);
  }

  function closePlayerModal(){
    setEditingPlayer(null);
    setIsAddingPlayer(false);
    setPlayerFormPhotoFile(null);
    setPlayerFormPhotoPreview(null);
  }

  function handlePlayerPhotoChange(e:React.ChangeEvent<HTMLInputElement>){
    const file=e.target.files?.[0];
    if(!file)return;
    setPlayerFormPhotoFile(file);
    try{
      const url=URL.createObjectURL(file);
      setPlayerFormPhotoPreview(url);
    }catch{}
  }

  async function savePlayerData(){
    const cleanName=playerFormName.trim();
    if(!cleanName)return alert("Proszę podać imię i nazwisko zawodnika.");
    
    setPlayerFormSaving(true);
    try{
      let photoPath=editingPlayer?.photo_path||null;

      if(playerFormPhotoFile){
        const ext=(playerFormPhotoFile.name.split(".").pop()||"jpg").replace(/[^a-z0-9]/gi,"").toLowerCase();
        const idForPath=editingPlayer?editingPlayer.id:crypto.randomUUID();
        const uploadPath=`${idForPath}/${crypto.randomUUID()}.${ext}`;

        const {error:uploadError}=await supabase.storage
          .from("player-photos")
          .upload(uploadPath,playerFormPhotoFile,{upsert:true,contentType:playerFormPhotoFile.type||undefined});

        if(uploadError){
          console.error("Błąd przesyłania zdjęcia:",uploadError);
          alert("Nie udało się przesłać zdjęcia: "+uploadError.message);
        }else{
          photoPath=uploadPath;
        }
      }

      if(editingPlayer){
        const {data,error}=await supabase
          .from("players")
          .update({
            display_name:cleanName,
            shirt_number:playerFormNumber.trim()||null,
            position:playerFormPosition.trim()||"Zawodnik",
            active:playerFormActive,
            photo_path:photoPath
          })
          .eq("id",editingPlayer.id)
          .select("*")
          .single();

        if(error)throw error;

        setPlayers(prev=>prev.map(p=>p.id===editingPlayer.id?data:p).sort((a,b)=>a.display_name.localeCompare(b.display_name,"pl")));
        alert(`Pomyślnie zaktualizowano dane: ${cleanName}`);
      }else{
        const {data,error}=await supabase
          .from("players")
          .insert({
            display_name:cleanName,
            shirt_number:playerFormNumber.trim()||null,
            position:playerFormPosition.trim()||"Zawodnik",
            active:playerFormActive,
            photo_path:photoPath
          })
          .select("*")
          .single();

        if(error)throw error;

        setPlayers(prev=>[...prev,data].sort((a,b)=>a.display_name.localeCompare(b.display_name,"pl")));
        alert(`Pomyślnie dodano zawodnika: ${cleanName}`);
      }

      closePlayerModal();
    }catch(e:any){
      alert("Błąd podczas zapisywania: "+(e?.message||e));
    }finally{
      setPlayerFormSaving(false);
    }
  }

  async function archivePlayer(id:string){
    const player=players.find(p=>p.id===id);
    if(!confirm(`Zarchiwizować zawodnika ${player?.display_name||""}?`))return;
    const {error}=await supabase.from("players").update({active:false}).eq("id",id);
    if(error)return alert(error.message);
    setPlayers(prev=>prev.map(p=>p.id===id?{...p,active:false}:p));
  }

  async function restorePlayer(id:string){
    const {error}=await supabase.from("players").update({active:true}).eq("id",id);
    if(error)return alert(error.message);
    setPlayers(prev=>prev.map(p=>p.id===id?{...p,active:true}:p));
  }

  async function deletePlayerPermanently(id:string,name:string){
    if(!confirm(`Czy na pewno chcesz CAŁKOWICIE USUNĄĆ zawodnika ${name} z bazy danych?\n\nUWAGA: Tej operacji nie można cofnąć. Jeśli zawodnik grał w meczach, zalecana jest archiwizacja.`))return;
    try{
      const {error}=await supabase.from("players").delete().eq("id",id);
      if(error)throw error;
      setPlayers(prev=>prev.filter(p=>p.id!==id));
      if(editingPlayer?.id===id)closePlayerModal();
      alert(`Usunięto zawodnika: ${name}`);
    }catch(e:any){
      alert("Błąd usuwania: "+(e?.message||e));
    }
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
    try {
      const res = await fetch("/api/admin/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_parent_link",
          parent_id: parentId,
          player_id: playerId
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Błąd przypisywania");
      setParentLinks(prev=>[...prev.filter(x=>!(x.parent_id===parentId&&x.player_id===playerId)),{parent_id:parentId,player_id:playerId}]);
    } catch (e: any) {
      alert(`Nie udało się przypisać zawodnika: ${e.message}`);
    }
  }

  async function removeParentLink(parentId:string,playerId:string){
    try {
      const res = await fetch("/api/admin/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "remove_parent_link",
          parent_id: parentId,
          player_id: playerId
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Błąd usuwania");
      setParentLinks(prev=>prev.filter(x=>!(x.parent_id===parentId&&x.player_id===playerId)));
    } catch (e: any) {
      alert(`Nie udało się usunąć powiązania: ${e.message}`);
    }
  }

  function permissionFor(userId:string):PermissionRow{
    return permissions.find(x=>x.user_id===userId)||{user_id:userId,...EMPTY_PERMISSIONS};
  }

  async function setAssistantPreset(userId:string,enable:boolean){
    if(!isAdmin)return alert("Tylko administrator może nadawać dodatkowe uprawnienia.");
    const account=allProfiles.find(p=>p.id===userId);
    if(!account||account.role!=="parent")return alert("Pakiet pomocnika można nadać tylko kontu rodzica.");
    if(!window.confirm(enable
      ?"Nadać temu rodzicowi rolę Pomocnik strony i prawa do kalendarza oraz aktualności?"
      :"Cofnąć WSZYSTKIE delegowane uprawnienia temu rodzicowi i ustawić rolę Rodzic?"))return;
    try {
      const res = await fetch("/api/admin/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set_preset",
          user_id: userId,
          enable
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Błąd zapisu uprawnień");
      setPermissions(prev=>[...prev.filter(x=>x.user_id!==userId),data.permissions]);
    } catch (e: any) {
      alert(`Błąd: ${e.message}`);
    }
  }

  async function updatePermission(userId:string,key:keyof UserPermissions,value:boolean|string){
    if(!isAdmin)return alert("Tylko administrator może nadawać uprawnienia.");
    const current=permissionFor(userId);
    const updated={...current,[key]:value};
    try {
      const res = await fetch("/api/admin/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_permission",
          user_id: userId,
          permissions: updated
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Błąd zapisu uprawnień");
      setPermissions(prev=>[...prev.filter(x=>x.user_id!==userId),data.permissions]);
    } catch (e: any) {
      alert(`Błąd zapisu uprawnień: ${e.message}`);
    }
  }

  async function changeSystemRole(targetUserId: string, newRole: "parent" | "coach" | "admin") {
    if (!isAdmin) return alert("Tylko administrator może zmieniać role systemowe.");
    if (targetUserId === props.currentUser.id && newRole !== "admin") {
      if (!confirm("Ostrzeżenie: Zmieniasz własną rolę administratora! Czy na pewno chcesz to zrobić?")) return;
    }
    try {
      const res = await fetch("/api/admin/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "change_system_role",
          target_user_id: targetUserId,
          new_role: newRole
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Błąd zmiany roli");
      setAllProfiles(prev => prev.map(p => p.id === targetUserId ? { ...p, role: newRole } : p));
      alert("Rola użytkownika została zaktualizowana!");
    } catch (e: any) {
      alert(`Błąd zmiany roli: ${e.message}`);
    }
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

  function trainingTableError(error:any){
    const msg=String(error?.message||error||"");
    if(/training_sessions.*schema cache|relation .*training_sessions.*does not exist|Could not find the table/i.test(msg)){
      alert("Brakuje tabel Centrum Treningowego w Supabase.\n\nUruchom w SQL Editor plik:\nsupabase/v6_training_center.sql\n\ni kliknij Run.");
      return true;
    }
    return false;
  }

  async function quickAddTraining(){
    const now=new Date();
    const date=[
      now.getFullYear(),
      String(now.getMonth()+1).padStart(2,"0"),
      String(now.getDate()).padStart(2,"0")
    ].join("-");

    const {data,error}=await supabase.from("training_sessions").insert({
      training_date:date,
      title:"Trening",
      start_time:"17:00",
      end_time:"18:30",
      location:null,
      notes:null,
      created_by:props.currentUser.id
    }).select("*").single();

    if(error){
      if(trainingTableError(error))return;
      return alert(error.message);
    }

    setTrainingSessions(prev=>[data,...prev].sort((x,y)=>y.training_date.localeCompare(x.training_date)));
    setSelectedTrainingId(data.id);
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
    if(error){
      if(trainingTableError(error))return;
      return alert(error.message);
    }
    setTrainingSessions(prev=>[data,...prev].sort((x,y)=>y.training_date.localeCompare(x.training_date)));
    setSelectedTrainingId(data.id);
  }

  async function setTrainingAttendanceStatus(playerId:string,status:string){
    if(!selectedTraining)return;
    const trainingId=selectedTraining.id;
    const previous=trainingAttendance.find(x=>x.training_id===trainingId&&x.player_id===playerId)||null;
    const optimistic={training_id:trainingId,player_id:playerId,status};
    setTrainingBusy(`attendance-${playerId}`);
    setTrainingAttendance(prev=>[
      ...prev.filter(x=>!(x.training_id===trainingId&&x.player_id===playerId)),optimistic
    ]);
    const {error}=await supabase.from("training_attendance").upsert({
      training_id:trainingId,player_id:playerId,status,updated_by:props.currentUser.id
    },{onConflict:"training_id,player_id"});
    setTrainingBusy(null);
    if(error){
      setTrainingAttendance(prev=>[
        ...prev.filter(x=>!(x.training_id===trainingId&&x.player_id===playerId)),
        ...(previous?[previous]:[])
      ]);
      const message=friendlyTrainingError(error);flashTrainingFeedback(message);return alert(message);
    }
    flashTrainingFeedback(status==="present"?"✓ Obecność zapisana":"✓ Nieobecność zapisana");
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
    const gameId=selectedTrainingGame.id;
    const previous=trainingGamePlayers.find(x=>x.game_id===gameId&&x.player_id===playerId)||null;
    setTrainingBusy(`team-${playerId}`);

    if(teamValue===null){
      setTrainingGamePlayers(prev=>prev.filter(x=>!(x.game_id===gameId&&x.player_id===playerId)));
      const {error}=await supabase.from("training_game_players").delete().eq("game_id",gameId).eq("player_id",playerId);
      setTrainingBusy(null);
      if(error){
        if(previous)setTrainingGamePlayers(prev=>[...prev.filter(x=>!(x.game_id===gameId&&x.player_id===playerId)),previous]);
        const message=friendlyTrainingError(error);flashTrainingFeedback(message);return alert(message);
      }
      flashTrainingFeedback("✓ Zawodnik usunięty ze składu");
      return;
    }

    const row={game_id:gameId,player_id:playerId,team:teamValue};
    setTrainingGamePlayers(prev=>[
      ...prev.filter(x=>!(x.game_id===gameId&&x.player_id===playerId)),row
    ]);
    const {error}=await supabase.from("training_game_players").upsert(row,{onConflict:"game_id,player_id"});
    setTrainingBusy(null);
    if(error){
      setTrainingGamePlayers(prev=>[
        ...prev.filter(x=>!(x.game_id===gameId&&x.player_id===playerId)),...(previous?[previous]:[])
      ]);
      const message=friendlyTrainingError(error);flashTrainingFeedback(message);return alert(message);
    }
    flashTrainingFeedback(`✓ ${teamValue==="A"?selectedTrainingGame.team_a_name:selectedTrainingGame.team_b_name}: zapisano`);
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

  async function editTrainingEvent(id:string){
    const event=trainingEvents.find(e=>e.id===id);
    if(!event)return;

    const currentScorer=players.find(p=>p.id===event.player_id)?.display_name||"";
    const currentAssist=players.find(p=>p.id===event.assist_player_id)?.display_name||"";

    const scorerName=prompt("Strzelec gola treningowego",currentScorer);
    if(scorerName===null)return;

    const scorer=players.find(p=>p.display_name.toLowerCase()===scorerName.trim().toLowerCase());
    if(!scorer)return alert("Nie znaleziono zawodnika o takiej nazwie.");

    const assistName=prompt("Asysta (zostaw puste = brak)",currentAssist);
    if(assistName===null)return;

    let assistId:string|null=null;
    if(assistName.trim()){
      const assist=players.find(p=>p.display_name.toLowerCase()===assistName.trim().toLowerCase());
      if(!assist)return alert("Nie znaleziono zawodnika dla asysty.");
      assistId=assist.id;
    }

    const {error}=await supabase.from("training_events").update({
      player_id:scorer.id,
      assist_player_id:assistId
    }).eq("id",id);

    if(error)return alert(error.message);

    setTrainingEvents(prev=>prev.map(e=>e.id===id?{...e,player_id:scorer.id,assist_player_id:assistId}:e));
  }

  async function deleteTrainingGame(id:string){
    if(!confirm("Usunąć tę grę kontrolną? Wynik, składy oraz gole/asysty z tej gry zostaną usunięte."))return;

    const {error}=await supabase.from("training_games").delete().eq("id",id);
    if(error)return alert(error.message);

    setTrainingGames(prev=>prev.filter(g=>g.id!==id));
    setTrainingGamePlayers(prev=>prev.filter(x=>x.game_id!==id));
    setTrainingEvents(prev=>prev.filter(x=>x.game_id!==id));

    if(selectedTrainingGameId===id){
      const next=trainingGamesForSelected.find(g=>g.id!==id);
      setSelectedTrainingGameId(next?.id||"");
    }
  }

  async function deleteTrainingSession(id:string){
    if(!confirm("Usunąć cały trening?\n\nUsunięte zostaną również:\n• obecności,\n• gry kontrolne,\n• składy,\n• gole i asysty treningowe.\n\nTej operacji nie można cofnąć."))return;

    const gameIds=trainingGames.filter(g=>g.training_id===id).map(g=>g.id);

    const {error}=await supabase.from("training_sessions").delete().eq("id",id);
    if(error)return alert(error.message);

    setTrainingSessions(prev=>prev.filter(s=>s.id!==id));
    setTrainingAttendance(prev=>prev.filter(x=>x.training_id!==id));
    setTrainingGames(prev=>prev.filter(g=>g.training_id!==id));
    setTrainingGamePlayers(prev=>prev.filter(x=>!gameIds.includes(x.game_id)));
    setTrainingEvents(prev=>prev.filter(x=>!gameIds.includes(x.game_id)));

    if(selectedTrainingId===id){
      const next=trainingSessions.find(s=>s.id!==id);
      setSelectedTrainingId(next?.id||"");
      setSelectedTrainingGameId("");
    }
  }

  async function addTeamEvent(presetType?:string){
    const title=prompt("Nazwa wydarzenia"); if(!title)return;
    const event_type=presetType||(prompt("Typ: training / tournament / birthday / info / other","training")||"info");
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
      setSyncResult(`Pobrano ${data.found} poprawnych wpisów. Nowe: ${data.inserted??0}. Zmienione: ${data.updated??0}. Bez zmian: ${data.unchanged??0}.`);
      setSyncLogs(current=>[{
        id:`local-${Date.now()}`,
        status:"ok",
        items_found:data.found??0,
        items_inserted:data.inserted??0,
        details:JSON.stringify({duration_ms:data.duration_ms,new:data.inserted,updated:data.updated,unchanged:data.unchanged}),
        created_at:data.synced_at||new Date().toISOString()
      },...current].slice(0,20));
    }catch(e:any){
      setSyncResult(`Błąd: ${e?.message||e}`);
    }finally{
      setSyncing(false);
    }
  }

  async function handleGrantPacks() {
    if (grantingPack) return;
    setGrantingPack(true);
    try {
      let targetUserIds: string[] = [];
      if (grantUserTarget === "all") {
        targetUserIds = props.allProfiles.map(p => p.id);
      } else {
        targetUserIds = [grantUserTarget];
      }

      if (targetUserIds.length === 0) {
        return alert("Brak wybranych użytkowników.");
      }

      const rows: any[] = [];
      targetUserIds.forEach(uid => {
        for (let i = 0; i < grantQuantity; i++) {
          rows.push({
            user_id: uid,
            pack_type_id: grantPackType,
            source_reason: grantReason,
            is_opened: false
          });
        }
      });

      const { error } = await supabase.from("user_unopened_packs").insert(rows);
      if (error) {
        return alert("Błąd przyznawania paczek: " + error.message);
      }

      alert(`🎉 Pomyślnie przyznano ${rows.length} paczek dla ${targetUserIds.length} użytkowników!`);
    } catch (e: any) {
      alert(e.message || "Wystąpił błąd");
    } finally {
      setGrantingPack(false);
    }
  }

  async function handleCreateCardDef() {
    if (!newCardPlayerId || !newCardTitle.trim()) {
      return alert("Wybierz zawodnika i wpisz tytuł karty.");
    }
    setSavingCardDef(true);
    try {
      const { error } = await supabase.from("card_definitions").insert({
        player_id: newCardPlayerId,
        season: "2026/27",
        card_name: newCardTitle.trim(),
        title: newCardTitle.trim(),
        card_type: newCardType,
        rarity: newCardRarity,
        description: newCardLore.trim() || null,
        lore: newCardLore.trim() || null,
        is_active: true
      });

      if (error) {
        return alert("Błąd tworzenia karty: " + error.message);
      }

      alert("✦ Karta została pomyślnie dodana do oficjalnego katalogu kolekcji DELTA!");
      setNewCardTitle("");
      setNewCardLore("");
    } catch (e: any) {
      alert(e.message || "Wystąpił błąd");
    } finally {
      setSavingCardDef(false);
    }
  }

  async function handleGrantPoints() {
    if (!grantPointsUserId || grantPointsAmount <= 0) return;
    setGrantingPoints(true);
    try {
      const { data: existing } = await supabase
        .from("user_delta_points")
        .select("points_balance")
        .eq("user_id", grantPointsUserId)
        .maybeSingle();

      const newBalance = (existing?.points_balance || 0) + grantPointsAmount;

      const { error } = await supabase.from("user_delta_points").upsert({
        user_id: grantPointsUserId,
        points_balance: newBalance,
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id" });

      if (error) {
        return alert("Błąd przyznawania punktów: " + error.message);
      }

      alert(`🪙 Przyznano +${grantPointsAmount} Delta Points! Nowy stan konta: ${newBalance} DP`);
    } catch (e: any) {
      alert(e.message || "Wystąpił błąd");
    } finally {
      setGrantingPoints(false);
    }
  }

  async function fetchUserCards(userId: string) {
    if (!userId) return;
    setLoadingUserCards(true);
    try {
      const res = await fetch("/api/cards/admin-manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_user_cards", target_user_id: userId })
      });
      if (res.ok) {
        const data = await res.json();
        setUserManagedCards(data.cards || []);
      }
    } catch {} finally {
      setLoadingUserCards(false);
    }
  }

  useEffect(() => {
    if (manageCardsUserId) {
      fetchUserCards(manageCardsUserId);
    }
  }, [manageCardsUserId]);

  async function handleDeleteUserCard(userCardId: string) {
    if (!confirm("Czy na pewno chcesz usunąć tę kartę z kolekcji tego użytkownika?")) return;
    setDeletingCardId(userCardId);
    try {
      const res = await fetch("/api/cards/admin-manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_card", user_card_id: userCardId })
      });
      if (res.ok) {
        setUserManagedCards(prev => prev.filter(c => c.id !== userCardId));
        alert("Karta została pomyślnie usunięta z kolekcji.");
      } else {
        const err = await res.json();
        alert(err.error || "Błąd usuwania karty");
      }
    } catch (e: any) {
      alert(e.message || "Błąd usuwania karty");
    } finally {
      setDeletingCardId(null);
    }
  }

  async function handleClearUserCards(userId: string) {
    const targetUser = props.allProfiles.find(p => p.id === userId)?.display_name || "użytkownika";
    if (!confirm(`⚠️ UWAGA: Czy na pewno chcesz SKASOWAĆ CAŁĄ KOLEKCJĘ kart dla ${targetUser}? Ta operacja jest nieodwracalna!`)) return;
    try {
      const res = await fetch("/api/cards/admin-manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear_user_cards", target_user_id: userId })
      });
      if (res.ok) {
        setUserManagedCards([]);
        alert("Wszystkie karty tego użytkownika zostały usunięte.");
      } else {
        const err = await res.json();
        alert(err.error || "Błąd operacji");
      }
    } catch (e: any) {
      alert(e.message || "Błąd operacji");
    }
  }

  async function handleGlobalResetCards() {
    const code = prompt("⚠️ KRYTYCZNA OPERACJA: Aby zresetować kolekcję WSZYSTKICH użytkowników w klubie, wpisz RESET:");
    if (code !== "RESET") return;
    try {
      const res = await fetch("/api/cards/admin-manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear_all_cards" })
      });
      if (res.ok) {
        setUserManagedCards([]);
        alert("Wszystkie kolekcje w klubie zostały pomyślnie zresetowane.");
      } else {
        const err = await res.json();
        alert(err.error || "Błąd operacji");
      }
    } catch (e: any) {
      alert(e.message || "Błąd operacji");
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
      <span className="admin-role">{coreStaff?props.currentUser.role:props.currentPermissions.role_label||"Pomocnik"}</span>
    </header>

    <nav className="admin-tabs">
      {canMatches&&<button className={tab==="matches"?"active":""} onClick={()=>setTab("matches")}><CalendarDays size={17}/> Mecze</button>}
      {canCalendar&&<button className={tab==="calendar"?"active":""} onClick={()=>setTab("calendar")}><CalendarDays size={17}/> Kalendarz</button>}
      {canTraining&&<button className={tab==="training"?"active":""} onClick={()=>setTab("training")}><Goal size={17}/> Treningi</button>}
      {canPlayers&&<button className={tab==="players"?"active":""} onClick={()=>setTab("players")}><Users size={17}/> Zawodnicy</button>}
      {coreStaff&&<button className={tab==="cards"?"active":""} onClick={()=>setTab("cards")}><Sparkles size={17}/> Karty i paczki</button>}
      {canNews&&<button className={tab==="news"?"active":""} onClick={()=>setTab("news")}><Newspaper size={17}/> Aktualności</button>}
      {coreStaff&&<button className={tab==="parents"?"active":""} onClick={()=>setTab("parents")}><Link2 size={17}/> Rodzice i role</button>}
      {coreStaff&&<button className={tab==="push"?"active":""} onClick={()=>setTab("push")}><Bell size={17}/> Push</button>}
      {isAdmin&&<button className={tab==="sync"?"active":""} onClick={()=>setTab("sync")}><Shield size={17}/> DELTA Sync</button>}
    </nav>

    <main className="admin-main">
      {tab==="matches" && canMatches && <div className="admin-two-col">
        <aside className="admin-card">
          <div className="admin-card-head"><h2>Mecze</h2>{canMatchBasics&&<button onClick={addMatch}><Plus size={15}/> Dodaj</button>}</div>
          <div className="admin-match-list">
            {matches.map(m=><button key={m.id} className={selectedMatchId===m.id?"selected":""} onClick={()=>setSelectedMatchId(m.id)}>
              <strong>{m.home_team} — {m.away_team}</strong>
              <span>{m.match_date} {m.match_time||""}</span>
            </button>)}
          </div>
        </aside>

        <section className="admin-card">
          {!selectedMatch ? <p>Wybierz mecz.</p> : <>
            <div className="admin-card-head"><h2>Centrum meczu</h2>{canMatchBasics&&<button onClick={saveMatchBasics}><Save size={15}/> Zapisz</button>}</div>
            {canMatchBasics&&<div className="admin-form-grid">
              <label>Status<select id="mstatus" defaultValue={selectedMatch.status}><option value="scheduled">Zaplanowany</option><option value="played">Rozegrany</option><option value="cancelled">Odwołany</option></select></label>
              <label>Godzina<input id="mtime" defaultValue={selectedMatch.match_time||""}/></label>
              <label>Miejsce<input id="mvenue" defaultValue={selectedMatch.venue||""}/></label>
              <label>Gospodarz<input value={selectedMatch.home_team} readOnly/></label>
              <label>Wynik gospodarza<input id="mhs" type="number" defaultValue={selectedMatch.home_score??""}/></label>
              <label>Wynik gościa<input id="mas" type="number" defaultValue={selectedMatch.away_score??""}/></label>
            </div>}

            {canMatchBasics&&<><h3>Obecność • wyjściowa 6 • kapitan</h3>
            <div className="admin-roster">
              {activePlayers.map(p=>{
                const att=attendance.find(a=>a.match_id===selectedMatch.id&&a.player_id===p.id)?.status||"";
                const li=lineup.find(l=>l.match_id===selectedMatch.id&&l.player_id===p.id);
                return <div className="admin-player-row" key={p.id}>
                  <strong>{p.display_name}</strong>
                  <div className="row-actions">
                    <button className={att==="present"?"on":""} onClick={()=>setAttendanceStatus(p.id,"present")}>Obecny</button>
                    <button className={att==="no"?"on danger":""} onClick={()=>setAttendanceStatus(p.id,"no")}>Nieobecny</button>
                    <button className={!["present","yes","no"].includes(att)?"on":""} onClick={()=>setAttendanceStatus(p.id,"maybe")}>Brak decyzji</button>
                    <button className={li?.is_starter?"on gold":""} onClick={()=>toggleStarter(p.id)}>{li?.is_starter?"Usuń z 6":"Dodaj do 6"}</button>
                    <button className={li?.is_captain?"on gold":""} onClick={()=>setCaptain(p.id)}><Crown size={14}/> Kapitan</button>
                  </div>
                </div>
              })}
            </div></>}

            {canMatchEvents&&<div className="admin-event-grid">
              <div className="admin-subcard">
                <h3><Goal size={17}/> Dodaj gola</h3>
                <select id="goalScorer"><option value="">Strzelec</option>{activePlayers.map(p=><option key={p.id} value={p.id}>{p.display_name}</option>)}</select>
                <select id="goalAssist"><option value="">Bez asysty</option>{activePlayers.map(p=><option key={p.id} value={p.id}>{p.display_name}</option>)}</select>
                <button disabled={goalBusy} onClick={addGoal}>{goalBusy?"Zapisywanie…":"Dodaj bramkę DELTY +1"}</button>
              </div>

              <div className="admin-subcard">
                <h3><Star size={17}/> MVP</h3>
                <select id="mvpPlayer"><option value="">Wybierz</option>{activePlayers.map(p=><option key={p.id} value={p.id}>{p.display_name}</option>)}</select>
                <button onClick={setMvp}>Ustaw MVP</button>
              </div>
            </div>}

            {canMatchEvents&&<><h3>Zdarzenia</h3>
            <div className="event-list">
              {matchEvents.map(e=>{
                const player=players.find(p=>p.id===e.player_id)?.display_name||"?";
                const assist=players.find(p=>p.id===e.assist_player_id)?.display_name;
                return <div key={e.id}><span>{e.event_type==="goal"?`⚽ ${player}${assist?` • asysta ${assist}`:""}`:`⭐ MVP: ${player}`}</span><div className="v902-event-actions"><button onClick={()=>editMatchEvent(e.id)}>Edytuj</button><button disabled={goalBusy} onClick={()=>deleteEvent(e.id)}><Trash2 size={14}/></button></div></div>
              })}
            </div></>}
            {canMatchBasics&&<div className="v10-admin-gallery"><h3>Foto-kronika meczu</h3><div className="v10-upload-row"><input id="matchPhotoInput" type="file" accept="image/*"/><button onClick={uploadMatchPhoto}><Plus size={14}/> Dodaj zdjęcie</button></div><div className="event-list">{matchMedia.filter(x=>x.match_id===selectedMatch.id).map(row=><div key={row.id}><span>📷 {row.caption||row.storage_path.split("/").pop()}</span><button onClick={()=>deleteMatchPhoto(row)}><Trash2 size={14}/></button></div>)}</div></div>}
          </>}
        </section>
      </div>}

            {tab==="training" && canTraining && <div className="admin-two-col">
        <aside className="admin-card">
          <div className="admin-card-head"><h2>Treningi</h2>{canTrainingFull&&<div className="v901-training-actions"><button onClick={quickAddTraining}><Plus size={15}/> Szybki trening dziś</button><button onClick={addTrainingSession}><CalendarDays size={15}/> Dodaj szczegółowo</button></div>}</div>
          <div className="admin-match-list">
            {trainingSessions.map(s=><button key={s.id} className={selectedTrainingId===s.id?"selected":""} onClick={()=>{setSelectedTrainingId(s.id);setSelectedTrainingGameId(trainingGames.find(g=>g.training_id===s.id)?.id||"")}}>
              <strong>{s.title||"Trening"}</strong>
              <span>{s.training_date} {s.start_time?.slice(0,5)||""}</span>
            </button>)}
          </div>
        </aside>

        <section className="admin-card">
          {!selectedTraining?<p>Dodaj lub wybierz trening.</p>:<>
            <div className="admin-card-head"><h2>Centrum treningowe</h2>{canTrainingFull&&<div className="v902-admin-actions"><button onClick={addTrainingGame}><Plus size={15}/> Gra kontrolna</button><button className="danger-btn" onClick={()=>deleteTrainingSession(selectedTraining.id)}><Trash2 size={15}/> Usuń trening</button></div>}</div>
            <p className="muted">{selectedTraining.training_date} • {selectedTraining.start_time?.slice(0,5)||""} • {selectedTraining.location||"—"}</p>
            {trainingFeedback&&<div className="v101-training-feedback">{trainingFeedback}</div>}

            <div className="v101-training-section-head"><h3>Obecność</h3><strong>{selectedTrainingPresentCount}/{activePlayers.length} obecnych</strong></div>
            <div className="attendance-grid">
              {activePlayers.map(p=>{
                const st=trainingAttendance.find(x=>x.training_id===selectedTraining.id&&x.player_id===p.id)?.status||"";
                return <div key={p.id} className="attendance-row">
                  <span>{p.display_name}</span>
                  <div>
                    <button type="button" disabled={trainingBusy===`attendance-${p.id}`} className={st==="present"?"active yes":""} onClick={()=>setTrainingAttendanceStatus(p.id,"present")}>JEST</button>
                    <button type="button" disabled={trainingBusy===`attendance-${p.id}`} className={st==="absent"?"active no":""} onClick={()=>setTrainingAttendanceStatus(p.id,"absent")}>NIE</button>
                  </div>
                </div>
              })}
            </div>

            {canTrainingFull&&<><h3>Gry kontrolne</h3>
            <div className="admin-match-list">
              {trainingGamesForSelected.map(g=><button key={g.id} className={selectedTrainingGame?.id===g.id?"selected":""} onClick={()=>setSelectedTrainingGameId(g.id)}>
                <strong>{g.team_a_name} {g.team_a_score}:{g.team_b_score} {g.team_b_name}</strong>
                <span>Gra kontrolna</span>
              </button>)}
            </div>

            {selectedTrainingGame&&<>
              <div className="v101-training-versus">
                <div><span>DRUŻYNA A</span><b>{selectedTrainingGame.team_a_name}</b><strong>{selectedTeamACount}</strong></div>
                <em>{selectedTeamACount} <small>VS</small> {selectedTeamBCount}</em>
                <div className="right"><span>DRUŻYNA B</span><b>{selectedTrainingGame.team_b_name}</b><strong>{selectedTeamBCount}</strong></div>
              </div>
              <p className="v101-flexible-note">Składy są elastyczne — może być 3 na 3, 4 na 4, 6 na 6 albo dowolna inna liczba zawodników.</p>
              <div className="admin-form-grid">
                <label>{selectedTrainingGame.team_a_name}<input id="trainingScoreA" type="number" min="0" defaultValue={selectedTrainingGame.team_a_score}/></label>
                <label>{selectedTrainingGame.team_b_name}<input id="trainingScoreB" type="number" min="0" defaultValue={selectedTrainingGame.team_b_score}/></label>
              </div>
              <div className="v902-admin-actions">
                <button className="push-main" onClick={saveTrainingGameScore}><Save size={15}/> Zapisz wynik gry</button>
                <button className="danger-btn" onClick={()=>deleteTrainingGame(selectedTrainingGame.id)}><Trash2 size={15}/> Usuń grę</button>
              </div>

              <div className="v101-training-section-head"><h3>Składy gry kontrolnej</h3><strong>{selectedTeamACount} vs {selectedTeamBCount}</strong></div>
              <div className="attendance-grid">
                {activePlayers.map(p=>{
                  const team=trainingGamePlayers.find(x=>x.game_id===selectedTrainingGame.id&&x.player_id===p.id)?.team||"";
                  return <div key={p.id} className="attendance-row">
                    <span>{p.display_name}</span>
                    <div>
                      <button type="button" disabled={trainingBusy===`team-${p.id}`} className={team==="A"?"active team-a":""} onClick={()=>setTrainingGameTeam(p.id,"A")}>A</button>
                      <button type="button" disabled={trainingBusy===`team-${p.id}`} className={team==="B"?"active team-b":""} onClick={()=>setTrainingGameTeam(p.id,"B")}>B</button>
                      <button type="button" disabled={trainingBusy===`team-${p.id}`} className={team===""?"active neutral":""} onClick={()=>setTrainingGameTeam(p.id,null)}>—</button>
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
                  return <div key={e.id}><span>⚽ {scorer}{assist?` • asysta ${assist}`:""}</span><div className="v902-event-actions"><button onClick={()=>editTrainingEvent(e.id)}>Edytuj</button><button onClick={()=>deleteTrainingEvent(e.id)}><Trash2 size={14}/></button></div></div>
                })}
              </div>
            </>}</>}
          </>}
        </section>
      </div>}

      {tab==="calendar" && canCalendar && <section className="admin-card">
        <div className="admin-card-head"><h2>Kalendarz drużyny</h2><div className="v109-admin-event-actions"><button onClick={()=>addTeamEvent("birthday")}><Plus size={15}/> Urodziny</button><button onClick={()=>addTeamEvent("info")}><Plus size={15}/> Ważna informacja</button><button onClick={()=>addTeamEvent()}><Plus size={15}/> Inne wydarzenie</button></div></div>
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

      {tab==="players" && canPlayers && <section className="admin-card v101-admin-players-section">
        <div className="admin-card-head">
          <div>
            <h2>Katalog i edycja zawodników</h2>
            <p className="muted" style={{margin:"4px 0 0", fontSize:12}}>
              Możesz w każdej chwili poprawić imię, nazwisko (np. zmienić z „Franek nowy” na właściwe nazwisko), numer na koszulce, pozycję lub wgrać oficjalne zdjęcie.
            </p>
          </div>
          <button type="button" onClick={openAddPlayerModal} className="gold-btn">
            <Plus size={16}/> Dodaj nowego zawodnika
          </button>
        </div>

        {/* Pasek wyszukiwania i filtrów */}
        <div className="v101-admin-player-toolbar">
          <div className="v101-admin-search-box">
            <Search size={16} />
            <input
              type="text"
              placeholder="Szukaj zawodnika (np. Franek, #7, Bramkarz)..."
              value={playerSearchQuery}
              onChange={e => setPlayerSearchQuery(e.target.value)}
            />
            {playerSearchQuery && (
              <button type="button" onClick={() => setPlayerSearchQuery("")} className="clear-search">
                <X size={14} />
              </button>
            )}
          </div>

          <div className="v101-admin-filter-tabs">
            <button
              type="button"
              className={playerFilterTab === "active" ? "active" : ""}
              onClick={() => setPlayerFilterTab("active")}
            >
              Aktywni ({players.filter(p => p.active !== false).length})
            </button>
            <button
              type="button"
              className={playerFilterTab === "all" ? "active" : ""}
              onClick={() => setPlayerFilterTab("all")}
            >
              Wszyscy ({players.length})
            </button>
            <button
              type="button"
              className={playerFilterTab === "archived" ? "active" : ""}
              onClick={() => setPlayerFilterTab("archived")}
            >
              Archiwum ({players.filter(p => p.active === false).length})
            </button>
          </div>
        </div>

        {/* Lista zawodników w stylu kart informacyjnych */}
        <div className="v101-admin-players-grid">
          {filteredAdminPlayers.map(p => (
            <div key={p.id} className={`v101-admin-player-card ${p.active === false ? "is-archived" : ""}`}>
              <div className="v101-player-card-head">
                <div className="v101-player-avatar-wrap">
                  <PlayerPhoto playerId={p.id} className="v101-player-thumb" />
                </div>
                <div className="v101-player-main-meta">
                  <div className="v101-player-name-row">
                    <strong>{p.display_name}</strong>
                    {p.shirt_number && <span className="v101-shirt-pill">#{p.shirt_number}</span>}
                  </div>
                  <div className="v101-player-sub-row">
                    <span className="v101-pos-tag">{p.position || "Zawodnik"}</span>
                    {p.active === false ? (
                      <span className="v101-status-pill archived">Archiwum</span>
                    ) : (
                      <span className="v101-status-pill active">Aktywny</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="v101-player-card-actions">
                <button
                  type="button"
                  className="v101-edit-btn"
                  onClick={() => openEditPlayerModal(p)}
                  title="Edytuj imię, nazwisko, numer, pozycję i zdjęcie"
                >
                  <Edit3 size={14} />
                  <span>Edytuj dane</span>
                </button>
                {p.active !== false ? (
                  <button
                    type="button"
                    className="v101-archive-btn"
                    onClick={() => archivePlayer(p.id)}
                    title="Przenieś do archiwum"
                  >
                    <Trash2 size={14} />
                    <span>Archiwizuj</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="v101-restore-btn"
                    onClick={() => restorePlayer(p.id)}
                    title="Przywróć do aktywnych zawodników"
                  >
                    <CheckCircle2 size={14} />
                    <span>Przywróć</span>
                  </button>
                )}
              </div>
            </div>
          ))}

          {filteredAdminPlayers.length === 0 && (
            <div className="v101-empty-players">
              <Users size={32} />
              <p>Nie znaleziono zawodników spełniających kryteria wyszukiwania.</p>
              {playerSearchQuery && (
                <button type="button" onClick={() => setPlayerSearchQuery("")}>
                  Wyczyść filtr wyszukiwania
                </button>
              )}
            </div>
          )}
        </div>
      </section>}

      {tab==="news" && canNews && <section className="admin-card">
        <div className="admin-card-head"><h2>Aktualności</h2><button onClick={addNewsItem}><Plus size={15}/> Dodaj</button></div>
        <div className="admin-news-list">
          {news.map(n=><article key={n.id}><div><span className="tag">{n.type}</span><h3>{n.title}</h3><p>{n.body}</p></div><button onClick={()=>deleteNews(n.id)}><Trash2 size={14}/></button></article>)}
        </div>
      </section>}

      {tab==="parents" && coreStaff && <section className="admin-card">
        <div className="admin-card-head"><h2>Rodzice, opiekunowie i pomocnicy</h2></div>
        <p className="muted">Najpierw osoba loguje się do DELTA własnym kontem Google. Wtedy pojawia się na tej liście. Przypisz jej zawodnika; możesz przypisać dwie lub więcej osób do tego samego dziecka. Administrator może być jednocześnie rodzicem — bez zmiany roli admin.</p>
        <p className="muted">Rola „Pomocnik strony” daje wybranym rodzicom prawo do edycji kalendarza i aktualności. Możesz osobno zaznaczyć inne uprawnienia. Sama nazwa roli nie daje dostępu — decydują zaznaczone uprawnienia.</p>
        <div className="parent-grid">
          {parentCandidates.map(account=><div className="admin-subcard" key={account.id}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
              <h3 style={{margin:0}}>{account.display_name||"Użytkownik"} {account.id===props.currentUser.id?"(Twoje konto)":""}</h3>
              {account.id===props.currentUser.id && <span style={{fontSize:11,background:"#0369a1",color:"#fff",padding:"2px 8px",borderRadius:999}}>Ty</span>}
            </div>

            <div style={{display:"flex",alignItems:"center",gap:8,margin:"10px 0 14px 0",flexWrap:"wrap"}}>
              <span className="muted" style={{fontSize:13}}>Rola w systemie:</span>
              <select
                value={account.role}
                disabled={!isAdmin}
                onChange={e=>changeSystemRole(account.id, e.target.value as "parent"|"coach"|"admin")}
                style={{padding:"4px 8px",borderRadius:6,background:"#1e293b",color:"#38bdf8",fontWeight:"bold",border:"1px solid #334155",fontSize:13,cursor:isAdmin?"pointer":"not-allowed"}}
              >
                <option value="parent">Rodzic (standard)</option>
                <option value="coach">Trener (dostęp trenerski)</option>
                <option value="admin">Administrator (pełny dostęp)</option>
              </select>
              <span className="muted" style={{fontSize:12}}>• Powiązanych zawodników: {parentLinks.filter(x=>x.parent_id===account.id).length}</span>
            </div>

            {account.role==="parent"&&<div className="v10-parent-role">
              <label>Rola dodatkowa / opis
                <select value={permissionFor(account.id).role_label} disabled={!isAdmin} onChange={e=>updatePermission(account.id,"role_label",e.target.value)}>
                  <option>Rodzic</option><option>Pomocnik strony</option><option>Pomocnik trenera</option><option>Statystyk</option><option>Koordynator</option>
                </select>
              </label>
              {isAdmin&&<div style={{display:"flex",flexWrap:"wrap",gap:8,margin:"10px 0"}}>
                <button type="button" onClick={()=>setAssistantPreset(account.id,true)}>Nadaj pakiet: Pomocnik strony</button>
                <button type="button" onClick={()=>setAssistantPreset(account.id,false)}>Cofnij uprawnienia</button>
              </div>}
              <div className="v10-permission-grid">
                {([
                  ["can_manage_matches","Mecze i składy"],
                  ["can_edit_match_events","Gole / asysty / MVP"],
                  ["can_manage_training","Pełne treningi"],
                  ["can_manage_training_attendance","Obecność treningowa"],
                  ["can_manage_calendar","Kalendarz"],
                  ["can_manage_news","Aktualności"],
                  ["can_manage_players","Zawodnicy"]
                ] as [keyof UserPermissions,string][]).map(([key,label])=><label key={key} className="v10-permission-check"><input type="checkbox" disabled={!isAdmin} checked={Boolean(permissionFor(account.id)[key])} onChange={e=>updatePermission(account.id,key,e.target.checked)}/><span>{label}</span></label>)}
              </div>
            </div>}
            {account.role!=="parent"&&<p className="muted">To konto zachowuje pełne uprawnienia roli <strong>{account.role==="admin"?"Administrator":"Trener"}</strong>. Poniżej możesz niezależnie powiązać je z zawodnikiem.</p>}
            
            <h4 style={{marginTop:16}}>Powiązanie z zawodnikiem</h4>
            {activePlayers.map(player=>{
              const linked=parentLinks.some(x=>x.parent_id===account.id&&x.player_id===player.id);
              return <label className="parent-check" key={player.id}>
                <input type="checkbox" disabled={!isAdmin} checked={linked} onChange={e=>e.target.checked?addParentLink(account.id,player.id):removeParentLink(account.id,player.id)}/>
                <span>{player.display_name}</span>
              </label>;
            })}
          </div>)}
          {!parentCandidates.length&&<p>Brak zalogowanych użytkowników do przypisania.</p>}
        </div>
      </section>}

      {tab==="push" && coreStaff && <section className="admin-card">
        <div className="admin-card-head"><h2>Powiadomienia push</h2></div>
        <p className="muted">Test otwiera po kliknięciu zakładkę „Z klubu”. Jeśli któreś urządzenie jest martwe, serwer automatycznie usunie je z bazy. Przy błędzie zobaczysz dokładny kod HTTP.</p>
        <button className="push-main" onClick={sendPush}><Bell size={18}/> Wyślij test push do wszystkich</button>
      </section>}

      {tab==="sync" && isAdmin && <section className="admin-card">
        <div className="admin-card-head"><h2>DELTA Sync</h2></div>
        <p className="muted">Pobiera wyłącznie nowe wiadomości z oficjalnej strony drużyny i zapisuje je w kafelku „Z klubu”. Terminarz i mecze pozostają pod kontrolą administratora.</p>
        <button className="push-main" disabled={syncing} onClick={runDeltaSync}><RefreshCw size={18}/>{syncing?" Synchronizacja…":" Synchronizuj teraz"}</button>
        {syncResult&&<div className="staff-note"><Shield size={18}/>{syncResult}</div>}
        <div className="admin-subcard" style={{marginTop:16}}>
          <h3>Źródło</h3>
          <p>https://www.delta.warszawa.pl/pilka.php?a=druzyny&druzyna=108</p>
          <p className="muted">Dane klubowe są trzymane oddzielnie od naszych prywatnych statystyk, obecności i profili zawodników.</p>
        </div>
        <div className="admin-subcard" style={{marginTop:16}}>
          <h3>Historia synchronizacji</h3>
          <div className="admin-news-list">
            {syncLogs.length?syncLogs.slice(0,10).map(log=>{
              let detail:any={};
              try{detail=JSON.parse(log.details||"{}");}catch{}
              return <article key={log.id}><div><strong>{log.status==="ok"?"🟢 OK":"🔴 BŁĄD"}</strong><p>{new Date(log.created_at).toLocaleString("pl-PL")} • znaleziono: {log.items_found} • nowe: {log.items_inserted}{typeof detail.updated==="number"?` • zmienione: ${detail.updated}`:""}{typeof detail.duration_ms==="number"?` • ${detail.duration_ms} ms`:""}</p>{log.status!=="ok"&&<p>{detail.message||log.details||"Nieznany błąd"}</p>}</div></article>;
            }):<p className="muted">Brak zapisanych przebiegów synchronizacji.</p>}
          </div>
        </div>
      </section>}

      {tab==="cards" && coreStaff && <section className="admin-card space-y-6">
        <div className="admin-card-head">
          <div>
            <h2><Sparkles size={20} className="inline mr-1 text-amber-400" /> DELTA CARDS & COLLECTION — ZARZĄDZANIE</h2>
            <p className="muted">Przyznawaj paczki kart rodzicom i zawodnikom, dodawaj karty specjalne oraz zarządzaj punktami Delta Points.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* PRZYZNAWANIE PACZEK KART */}
          <div className="admin-subcard p-5 rounded-2xl bg-black/40 border border-slate-800 space-y-4">
            <div className="flex items-center gap-2 text-amber-400 font-black text-sm uppercase">
              <Gift size={18} /> Przyznaj paczkę kart
            </div>
            <p className="text-xs text-slate-400">
              Wyślij paczki z kartami do otwarcia dla konkretnego rodzica lub wszystkich użytkowników w klubie.
            </p>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-300">
                Odbiorca paczki
                <select 
                  value={grantUserTarget} 
                  onChange={e => setGrantUserTarget(e.target.value)}
                  className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                >
                  <option value="all">★ Wszyscy użytkownicy ({props.allProfiles.length})</option>
                  {props.allProfiles.map(p => (
                    <option key={p.id} value={p.id}>{p.display_name || "Użytkownik"} ({p.role})</option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="block text-xs font-bold text-slate-300">
                  Typ paczki
                  <select 
                    value={grantPackType} 
                    onChange={e => setGrantPackType(e.target.value)}
                    className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                  >
                    <option value="standard_pack">Paczka Standardowa (3 karty)</option>
                    <option value="matchday_booster">Matchday Booster (4 karty)</option>
                    <option value="gold_booster">Gold Booster (5 kart, min. Rare)</option>
                    <option value="inferno_booster">🔥 Inferno Booster (5 kart, min. Epic)</option>
                    <option value="legend_booster">👑 Legend Pack (6 kart, min. Legendary)</option>
                  </select>
                </label>

                <label className="block text-xs font-bold text-slate-300">
                  Ilość paczek
                  <input 
                    type="number" 
                    min={1} 
                    max={20} 
                    value={grantQuantity} 
                    onChange={e => setGrantQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                  />
                </label>
              </div>

              <label className="block text-xs font-bold text-slate-300">
                Powód / Okazja
                <input 
                  type="text" 
                  value={grantReason} 
                  onChange={e => setGrantReason(e.target.value)}
                  placeholder="np. Nagroda specjalna od trenera"
                  className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                />
              </label>

              <button 
                type="button"
                onClick={handleGrantPacks}
                disabled={grantingPack}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2"
              >
                <Gift size={15} /> {grantingPack ? "Przyznawanie..." : "Przyznaj paczkę(i)"}
              </button>
            </div>
          </div>

          {/* PRZYZNAWANIE DELTA POINTS */}
          <div className="admin-subcard p-5 rounded-2xl bg-black/40 border border-slate-800 space-y-4">
            <div className="flex items-center gap-2 text-amber-400 font-black text-sm uppercase">
              <Coins size={18} /> Przyznaj Delta Points (DP)
            </div>
            <p className="text-xs text-slate-400">
              Dodaj punkty DP do konta rodzica/zawodnika za wyjątkowe zaangażowanie lub quizy.
            </p>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-300">
                Użytkownik
                <select 
                  value={grantPointsUserId} 
                  onChange={e => setGrantPointsUserId(e.target.value)}
                  className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                >
                  {props.allProfiles.map(p => (
                    <option key={p.id} value={p.id}>{p.display_name || "Użytkownik"} ({p.role})</option>
                  ))}
                </select>
              </label>

              <label className="block text-xs font-bold text-slate-300">
                Ilość Delta Points (DP)
                <input 
                  type="number" 
                  min={10} 
                  step={10} 
                  value={grantPointsAmount} 
                  onChange={e => setGrantPointsAmount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                />
              </label>

              <label className="block text-xs font-bold text-slate-300">
                Powód
                <input 
                  type="text" 
                  value={grantPointsReason} 
                  onChange={e => setGrantPointsReason(e.target.value)}
                  className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                />
              </label>

              <button 
                type="button"
                onClick={handleGrantPoints}
                disabled={grantingPoints}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2"
              >
                <Coins size={15} /> {grantingPoints ? "Zapisywanie..." : "Dodaj punkty DP"}
              </button>
            </div>
          </div>
        </div>

        {/* TWORZENIE KARTY SPECJALNEJ */}
        <div className="admin-subcard p-5 rounded-2xl bg-black/40 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 text-amber-400 font-black text-sm uppercase">
            <Sparkles size={18} /> Utwórz nową kartę specjalną w katalogu
          </div>
          <p className="text-xs text-slate-400">
            Stwórz pamiątkową kartę dla zawodnika (np. Hat-Trick Hero, MVP Derbów, Waleczny Diabełek), która będzie mogła wypaść w paczkach.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <label className="block text-xs font-bold text-slate-300">
              Zawodnik
              <select 
                value={newCardPlayerId} 
                onChange={e => setNewCardPlayerId(e.target.value)}
                className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
              >
                {activePlayers.map(p => (
                  <option key={p.id} value={p.id}>{p.display_name} (#{p.shirt_number || "—"})</option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-bold text-slate-300">
              Tytuł karty
              <input 
                type="text" 
                placeholder="np. HAT-TRICK HERO" 
                value={newCardTitle} 
                onChange={e => setNewCardTitle(e.target.value)}
                className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
              />
            </label>

            <label className="block text-xs font-bold text-slate-300">
              Typ karty
              <select 
                value={newCardType} 
                onChange={e => setNewCardType(e.target.value)}
                className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
              >
                <option value="matchday">MATCHDAY</option>
                <option value="training_warrior">TRAINING WARRIOR</option>
                <option value="goal_hunter">GOAL HUNTER</option>
                <option value="mvp">MVP</option>
                <option value="inferno">🔥 INFERNO</option>
                <option value="hat_trick_hero">HAT-TRICK HERO</option>
                <option value="captain">CAPTAIN</option>
                <option value="legend">LEGEND</option>
                <option value="special_event">SPECIAL EVENT</option>
              </select>
            </label>

            <label className="block text-xs font-bold text-slate-300">
              Rzadkość
              <select 
                value={newCardRarity} 
                onChange={e => setNewCardRarity(e.target.value)}
                className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
              >
                <option value="common">Common (Zwykła)</option>
                <option value="rare">Rare (Rzadka)</option>
                <option value="epic">Epic (Epicka)</option>
                <option value="legendary">Legendary (Legendarna)</option>
                <option value="inferno">🔥 Inferno (Piekielna)</option>
              </select>
            </label>

            <label className="block text-xs font-bold text-slate-300 sm:col-span-2">
              Opis / Lore (Historia karty na rewersie)
              <input 
                type="text" 
                placeholder="np. Niezapomniany występ i 3 bramki w meczu z Ursusem." 
                value={newCardLore} 
                onChange={e => setNewCardLore(e.target.value)}
                className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
              />
            </label>
          </div>

          <button 
            type="button"
            onClick={handleCreateCardDef}
            disabled={savingCardDef}
            className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2"
          >
            <Plus size={15} /> {savingCardDef ? "Tworzenie..." : "Utwórz kartę w katalogu"}
          </button>
        </div>

        {/* ================= ZARZĄDZANIE KOLEKCJAMI I USUWANIE KART ================= */}
        <div className="admin-subcard p-5 rounded-2xl bg-black/40 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-rose-400 font-black text-sm uppercase">
              <Trash2 size={18} /> Zarządzanie kartami w kolekcjach & Kasowanie
            </div>
            <button
              type="button"
              onClick={handleGlobalResetCards}
              className="px-3 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-700 text-rose-200 text-xs font-bold transition flex items-center gap-1.5"
            >
              <AlertCircle size={14} /> ⚠️ Reset kolekcji wszystkich użytkowników
            </button>
          </div>

          <p className="text-xs text-slate-400">
            Wybierz użytkownika, aby podejrzeć jego karty, usunąć pojedyncze karty lub całkowicie wyczyścić jego klaser.
          </p>

          <div className="flex items-center gap-3 flex-wrap">
            <label className="block text-xs font-bold text-slate-300 flex-1 min-w-[240px]">
              Wybierz użytkownika do podglądu kolekcji:
              <select 
                value={manageCardsUserId} 
                onChange={e => setManageCardsUserId(e.target.value)}
                className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
              >
                {props.allProfiles.map(p => (
                  <option key={p.id} value={p.id}>{p.display_name || "Użytkownik"} ({p.role})</option>
                ))}
              </select>
            </label>

            <div className="flex items-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => fetchUserCards(manageCardsUserId)}
                disabled={loadingUserCards}
                className="px-3.5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition flex items-center gap-1.5"
              >
                <RefreshCw size={14} className={loadingUserCards ? "animate-spin" : ""} /> Odśwież
              </button>

              <button
                type="button"
                onClick={() => handleClearUserCards(manageCardsUserId)}
                disabled={loadingUserCards || userManagedCards.length === 0}
                className="px-3.5 py-2.5 rounded-lg bg-rose-900/60 hover:bg-rose-800 border border-rose-600 text-rose-100 text-xs font-bold transition flex items-center gap-1.5"
              >
                <Trash2 size={14} /> Wyczyść całą kolekcję tego użytkownika
              </button>
            </div>
          </div>

          {/* LISTA KART WYBRANEGO UŻYTKOWNIKA */}
          <div className="mt-4 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-300">
                Zdobyte karty użytkownika ({userManagedCards.length}):
              </span>
            </div>

            {loadingUserCards ? (
              <div className="py-8 text-center text-xs text-slate-400">Ładowanie kolekcji...</div>
            ) : userManagedCards.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 bg-black/20 rounded-xl border border-slate-800/60">
                Ten użytkownik nie posiada jeszcze żadnych kart w swojej kolekcji.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[420px] overflow-y-auto p-1">
                {userManagedCards.map(uc => {
                  const cardDef = uc.card_definition;
                  const rarity = cardDef?.rarity || "common";
                  const isInferno = rarity === "inferno";
                  const isLegend = rarity === "legendary";
                  const isEpic = rarity === "epic";
                  const isRare = rarity === "rare";

                  return (
                    <div 
                      key={uc.id} 
                      className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between gap-2.5 transition hover:border-slate-700"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                            isInferno ? "bg-red-950 text-red-400 border-red-700" :
                            isLegend ? "bg-purple-950 text-purple-300 border-purple-700" :
                            isEpic ? "bg-indigo-950 text-indigo-300 border-indigo-700" :
                            isRare ? "bg-blue-950 text-blue-300 border-blue-700" :
                            "bg-slate-800 text-slate-300 border-slate-700"
                          }`}>
                            {rarity}
                          </span>
                          {uc.duplicates_count > 0 && (
                            <span className="text-[10px] font-black text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded">
                              +{uc.duplicates_count} dup
                            </span>
                          )}
                        </div>

                        <div className="font-bold text-xs text-white truncate">
                          {cardDef?.title || cardDef?.card_name || "Karta DELTA"}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {cardDef?.player?.display_name || "Zawodnik"} (#{cardDef?.player?.shirt_number || "—"})
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteUserCard(uc.id)}
                        disabled={deletingCardId === uc.id}
                        className="w-full py-1.5 px-2 rounded-lg bg-rose-950/70 hover:bg-rose-900 border border-rose-800/80 text-rose-300 text-[11px] font-bold transition flex items-center justify-center gap-1.5"
                      >
                        <Trash2 size={12} /> {deletingCardId === uc.id ? "Usuwanie..." : "Usuń tę kartę"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>}
    </main>

    {/* MODAL EDYCJI / DODAWANIA ZAWODNIKA */}
    {(editingPlayer || isAddingPlayer) && (
      <div className="v101-player-modal-backdrop" onClick={closePlayerModal}>
        <div className="v101-player-modal" onClick={e => e.stopPropagation()}>
          <div className="v101-player-modal-header">
            <div className="v101-modal-title-group">
              <Users size={22} className="v101-modal-icon" />
              <div>
                <h3>{editingPlayer ? `Edycja zawodnika` : "Nowy zawodnik"}</h3>
                <small>{editingPlayer ? `Popraw dane zawodnika: ${editingPlayer.display_name}` : "Wprowadź dane nowego zawodnika w drużynie"}</small>
              </div>
            </div>
            <button type="button" className="v101-modal-close" onClick={closePlayerModal}>
              <X size={20} />
            </button>
          </div>

          <form onSubmit={e => { e.preventDefault(); savePlayerData(); }} className="v101-player-modal-body">
            <div className="v101-modal-field">
              <label>
                Imię i nazwisko zawodnika <span className="req">*</span>
                <input
                  type="text"
                  required
                  placeholder="np. Franciszek Kowalski (lub Franek Nowy)"
                  value={playerFormName}
                  onChange={e => setPlayerFormName(e.target.value)}
                  autoFocus
                />
              </label>
              <small className="field-hint">Możesz w każdej chwili wpisać pełne nazwisko lub zmienić pisownię.</small>
            </div>

            <div className="v101-modal-row-two">
              <div className="v101-modal-field">
                <label>
                  Numer na koszulce
                  <input
                    type="text"
                    placeholder="np. 7, 10, 23"
                    value={playerFormNumber}
                    onChange={e => setPlayerFormNumber(e.target.value)}
                  />
                </label>
              </div>

              <div className="v101-modal-field">
                <label>
                  Pozycja na boisku
                  <select
                    value={playerFormPosition}
                    onChange={e => setPlayerFormPosition(e.target.value)}
                  >
                    <option value="Zawodnik">Zawodnik (Domyślna)</option>
                    <option value="Napastnik">Napastnik (NAP)</option>
                    <option value="Pomocnik">Pomocnik (POM)</option>
                    <option value="Obrońca">Obrońca (OBR)</option>
                    <option value="Bramkarz">Bramkarz (BR)</option>
                    <option value="Skrzydłowy">Skrzydłowy (SKR)</option>
                  </select>
                </label>
              </div>
            </div>

            {/* Zdjęcie zawodnika */}
            <div className="v101-modal-field">
              <label>Zdjęcie zawodnika do profilu i karty FIFA</label>
              <div className="v101-photo-upload-zone">
                <div className="v101-photo-preview-box">
                  {playerFormPhotoPreview ? (
                    <img src={playerFormPhotoPreview} alt="Podgląd" className="preview-img" />
                  ) : editingPlayer?.id ? (
                    <PlayerPhoto playerId={editingPlayer.id} className="preview-img" />
                  ) : (
                    <Camera size={28} className="camera-placeholder" />
                  )}
                </div>
                <div className="v101-photo-upload-controls">
                  <input
                    type="file"
                    id="playerPhotoFileInput"
                    accept="image/png,image/jpeg,image/webp"
                    style={{ display: "none" }}
                    onChange={handlePlayerPhotoChange}
                  />
                  <button
                    type="button"
                    className="v101-upload-trigger-btn"
                    onClick={() => document.getElementById("playerPhotoFileInput")?.click()}
                  >
                    <Upload size={15} />
                    <span>{playerFormPhotoFile ? "Zmień wybrane zdjęcie" : "Wgraj zdjęcie zawodnika"}</span>
                  </button>
                  <small className="field-hint">Zalecane: zdjęcie portretowe PNG/JPG w dobrej jakości.</small>
                </div>
              </div>
            </div>

            {/* Status aktywności */}
            <div className="v101-modal-field checkbox-field">
              <label className="v101-toggle-label">
                <input
                  type="checkbox"
                  checked={playerFormActive}
                  onChange={e => setPlayerFormActive(e.target.checked)}
                />
                <span><strong>Zawodnik aktywny w kadrze DELTY GM</strong> (odznacz, aby przenieść do archiwum)</span>
              </label>
            </div>

            <div className="v101-player-modal-actions">
              {editingPlayer && (
                <button
                  type="button"
                  className="v101-btn-delete-perm"
                  onClick={() => deletePlayerPermanently(editingPlayer.id, editingPlayer.display_name)}
                >
                  <Trash2 size={15} />
                  <span>Usuń całkowicie</span>
                </button>
              )}
              
              <div className="v101-actions-right">
                <button
                  type="button"
                  className="v101-btn-cancel"
                  onClick={closePlayerModal}
                  disabled={playerFormSaving}
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="v101-btn-save"
                  disabled={playerFormSaving}
                >
                  <Save size={15} />
                  <span>{playerFormSaving ? "Zapisywanie..." : "Zapisz dane zawodnika"}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    )}
  </div>;
}
