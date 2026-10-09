"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import PlayerPhoto from "./PlayerPhoto";
import MatchGallery from "./MatchGallery";
import MatchCenterModal from "./MatchCenterModal";
import StadiumFX from "./StadiumFX";
import LeagueCenter, { LEAGUE_ROUNDS, LeagueHome, leagueByeTeam, leagueRoundDate, leagueScheduleWithMatches } from "./LeagueCenter";
import { MyChildCenter, MatchDayMode, HallOfFame } from "./MegaPanels";
import PlayerCard3D, { CardTheme } from "./PlayerCard3D";
import BadgeCelebrationModal, { BadgeDetail } from "./BadgeCelebrationModal";
import PackOpeningModal from "./PackOpeningModal";
import DeltaCollectionAlbum from "./DeltaCollectionAlbum";
import DeltaLiveBar from "./DeltaLiveBar";
import DeltaMoreMenuSheet from "./DeltaMoreMenuSheet";
import DeltaLiveAlertBanner from "./DeltaLiveAlertBanner";
import DeltaUrgentEventModal from "./DeltaUrgentEventModal";
import DeltaSyncControlCenter from "./admin/DeltaSyncControlCenter";
import type { DeltaSystemEvent, EventImportance } from "@/lib/events/types";
import AchievementsHub from "./AchievementsHub";
import AchievementsModal from "./AchievementsModal";
import AchievementUnlock from "./AchievementUnlock";
import DeltaTyperModal from "./DeltaTyperModal";
import DeltaKnowledgeCornerModal from "./DeltaKnowledgeCornerModal";
import DeltaMatchBriefModal from "./DeltaMatchBriefModal";
import DeltaTacticsBoardModal from "./DeltaTacticsBoardModal";
import DeltaWeeklyQuestsModal from "./DeltaWeeklyQuestsModal";
import DeltaTrainingKingModal from "./DeltaTrainingKingModal";
import DeltaSeasonPassModal from "./DeltaSeasonPassModal";
import DeltaPhotoBoothModal from "./DeltaPhotoBoothModal";
import DeltaBirthdayZoneModal from "./DeltaBirthdayZoneModal";
import DeltaCoachCornerModal from "./DeltaCoachCornerModal";
import PlayerRecordsView from "./PlayerRecordsView";
import PlayerSkillRadar from "./PlayerSkillRadar";
import SpotlightCard from "./SpotlightCard";
import NewsEditModal, { NewsItem } from "./NewsEditModal";
import DeltaPointsRulesModal from "./DeltaPointsRulesModal";
import { DeltaDailyMissionsModal } from "./DeltaDailyMissionsModal";
import { DeltaCardBattleArenaModal } from "./DeltaCardBattleArenaModal";
import { DeltaNotificationCenterModal } from "./DeltaNotificationCenterModal";
import { DeltaWeeklySummaryModal } from "./DeltaWeeklySummaryModal";
import { DeltaPWAInstallPrompt } from "./DeltaPWAInstallPrompt";
import { DeltaOfflineBanner } from "./DeltaOfflineBanner";
import { DeltaNotificationPreferencesModal } from "./DeltaNotificationPreferencesModal";
import { DeltaChangelogModal } from "./DeltaChangelogModal";
import { DeltaCompetitionHubModal } from "./social/DeltaCompetitionHubModal";
import { DeltaSocialFeedModal } from "./social/DeltaSocialFeedModal";
import { DeltaTrophyCabinetModal } from "./social/DeltaTrophyCabinetModal";
import { DeltaSafeTradingModal } from "./social/DeltaSafeTradingModal";
import { calculatePlayerAchievements, calculatePlayerRecords } from "@/lib/achievements/engine";
import type { UserPermissions } from "@/lib/permissions";
import { hasDelegatedAccess } from "@/lib/permissions";
import { PushSetupError, subscribeToPush, resetPushSubscription } from "@/lib/push";
import { decodeHtmlEntities } from "@/lib/text";
import { formatTeamName, getTeamLogo } from "@/lib/teams";
import {
  Bell, CalendarDays, Trophy, Users, Newspaper, History, Shield, Star, MoreHorizontal,
  Check, X, Crown, Target, ChevronLeft, ChevronRight, Flame, Award, UserCheck, Goal, Home, UserRound, TrendingUp, Medal, Zap, List, Grid3X3, Layers, Sparkles, LayoutGrid, ExternalLink, BookOpen, Send, Heart, Camera, Cake, Coins, MessageSquare, RefreshCw
} from "lucide-react";

type Profile={id:string;role:"admin"|"coach"|"parent"|string;display_name:string|null};
type Player={id:string;display_name:string;shirt_number:string|null;position:string|null;photo_path:string|null;active:boolean};
type Match={id:string;round_no:number|null;match_date:string;match_time:string|null;venue:string|null;home_team:string;away_team:string;home_score:number|null;away_score:number|null;status:"scheduled"|"played"|"cancelled"|string};
type Attendance={match_id:string;player_id:string;status:string};
type Lineup={match_id:string;player_id:string;is_starter:boolean;is_captain:boolean};
type Event={id:string;match_id:string;event_type:string;player_id:string|null;assist_player_id:string|null;minute:number|null;created_at:string};
type News={id:string;type:string;title:string;body:string|null;published_at:string;priority?:string};
type ClubUpdate={id:string;source_key:string;source_name:string;source_url:string;title:string;body:string|null;priority:number;published_at:string;synced_at:string};
type TeamEvent={id:string;title:string;event_type:string;event_date:string;start_time:string|null;end_time:string|null;location:string|null;details:string|null;important:boolean;player_id:string|null;created_at:string};
type TrainingSession={id:string;training_date:string;start_time:string|null;end_time:string|null;location:string|null;title:string;notes:string|null;created_at:string};
type TrainingAttendance={training_id:string;player_id:string;status:string};
type TrainingGame={id:string;training_id:string;team_a_name:string;team_b_name:string;team_a_score:number;team_b_score:number;created_at:string};
type TrainingGamePlayer={game_id:string;player_id:string;team:"A"|"B"|string};
type TrainingEvent={id:string;game_id:string;event_type:string;player_id:string|null;assist_player_id:string|null;created_at:string};
type MatchMedia={id:string;match_id:string;storage_path:string;caption:string|null;created_at:string};
type CalendarItem={id:string;kind:string;date:string;time:string;title:string;location:string;details:string;important:boolean;match:Match|null};
type LeagueBye={round:number;date:string;team:string};

const CLUB="K.S. Delta Warszawa GM";
const isRyszardPlayer=(p:{display_name:string})=>{const n=(p.display_name||"").toLocaleLowerCase("pl-PL");return n.includes("ryszard")&&n.includes("rybacki");};
const teamLogos:Record<string,string>={
  "K.S. Delta Warszawa GM":"/teamlogos/gm.png",
  "Alfa Przymierze Rodzin":"/teamlogos/alfa.png",
  "FC Vizja Warszawa":"/teamlogos/vizja.png",
  "RKS Ursus Warszawa":"/teamlogos/ursus.png",
  "MUKS Julianów":"/teamlogos/julianow.png",
};

function datePL(x:string){return new Date(`${x}T12:00:00`).toLocaleDateString("pl-PL",{day:"2-digit",month:"2-digit",year:"numeric"});}

function calendarKindLabel(kind:string){
  return ({
    match:"MECZ",training:"TRENING",meeting:"ZBIÓRKA",gathering:"ZBIÓRKA",
    tournament:"TURNIEJ",birthday:"URODZINY",info:"WAŻNE",club:"KLUBOWE",bye:"PAUZA"
  } as Record<string,string>)[kind]||"WYDARZENIE";
}


function formatCountdown(ms:number){
  if(ms<=0)return "teraz";
  const totalMinutes=Math.floor(ms/60000);
  const days=Math.floor(totalMinutes/1440);
  const hours=Math.floor((totalMinutes%1440)/60);
  const minutes=totalMinutes%60;
  if(days>0)return `${days} d ${hours} godz. ${minutes} min`;
  if(hours>0)return `${hours} godz. ${minutes} min`;
  return `${Math.max(1,minutes)} min`;
}

function playerArchetype(matchStats:{m:number;starts:number;captain:number;g:number;a:number;mvp:number},trainingStats:{sessions:number;goals:number;assists:number;ga:number;attendanceStreak:number;games:number;wins:number}){
  if(matchStats.captain>0)return "Lider drużyny";
  if((matchStats.g+matchStats.a)>=6)return "Motor ofensywy";
  if(matchStats.mvp>0)return "Zawodnik meczowy";
  if(trainingStats.sessions>=6)return "Treningowy wojownik";
  if(matchStats.starts>=3)return "Pewny punkt składu";
  return "Rozwój zawodnika";
}

function parseLocalMatchDate(date:string,time?:string|null){
  const safeTime=(time&&time.length>=5)?time.slice(0,5):"00:00";
  return new Date(`${date}T${safeTime}:00`);
}

function seasonLabel(date?:string){
  const value=date?new Date(`${date}T12:00:00`):new Date();
  const start=value.getMonth()>=6?value.getFullYear():value.getFullYear()-1;
  return `${start}/${String(start+1).slice(-2)}`;
}

function Logo({team,size=58}:{team:string,size?:number}){
  const src=getTeamLogo(team);
  if(src) return <img src={src} alt={formatTeamName(team)} style={{width:size,height:size,objectFit:"contain"}}/>;
  const short=team.includes(" WI")?"WI":team.includes(" WA")?"WA":team.includes(" GM")?"GM":team.split(" ").filter(Boolean)[0]?.slice(0,2).toUpperCase();
  return <div className="fallback-logo" style={{width:size,height:size}}>{short}</div>;
}

type PodiumMetric="ga"|"goals"|"assists"|"mvp";
type PodiumStat={m:number;starts:number;captain:number;g:number;a:number;mvp:number};
function PremiumPodium({players,stats,metric,onOpen,compact=false}:{players:Player[];stats:Record<string,PodiumStat>;metric:PodiumMetric;onOpen:(p:Player)=>void;compact?:boolean}){
  const value=(p:Player)=>{const s=stats[p.id];if(!s)return 0;return metric==="ga"?s.g+s.a:metric==="goals"?s.g:metric==="assists"?s.a:s.mvp;};
  const leaders=players.filter(p=>value(p)>0).slice().sort((a,b)=>value(b)-value(a)||a.display_name.localeCompare(b.display_name,"pl")).slice(0,3);
  const label=metric==="goals"?"GOLE":metric==="assists"?"ASYSTY":metric==="mvp"?"MVP":"G + A";
  return <div className={`v113-podium-stage ${compact?"v113-podium-compact":""}`} aria-label={`Podium zawodników – ${label}`}>
    <div className="v113-podium-atmosphere" aria-hidden="true"/>
    {[1,2,3].map(place=>{
      const p=leaders[place-1];
      return <div key={place} className={`v113-podium-position v113-place-${place} ${p?"has-player":"is-empty"}`}>
        {p?<button type="button" className="v113-podium-player" onClick={()=>onOpen(p)} aria-label={`Otwórz profil zawodnika ${p.display_name}, miejsce ${place}`}>
          <span className="v142-card-crown" aria-hidden="true">{place===1?"✦":"◆"}</span><span className="v113-podium-photo">{isRyszardPlayer(p)?<img src="/assets/ryszard-player-card.png" alt=""/>:<PlayerPhoto playerId={p.id}/>}</span>
          <span className="v113-podium-name">{p.display_name}</span>
          <span className="v113-podium-score"><strong>{value(p)}</strong><small>{label}</small></span>
          <span className="v113-podium-open">PROFIL <ChevronRight size={12}/></span>
        </button>:<div className="v113-podium-empty"><Shield size={22}/><span>Miejsce do zdobycia</span></div>}
        <div className="v113-podium-step" aria-hidden="true"><b>{place}</b></div>
      </div>;
    })}
  </div>;
}

export default function TeamHub(props:{
  profile:Profile;
  initialPlayers:Player[];
  initialMatches:Match[];
  initialAttendance:Attendance[];
  initialLineup:Lineup[];
  initialEvents:Event[];
  initialNews:News[];
  initialClubUpdates:ClubUpdate[];
  initialTeamEvents:TeamEvent[];
  initialTrainingSessions:TrainingSession[];
  initialTrainingAttendance:TrainingAttendance[];
  initialTrainingGames:TrainingGame[];
  initialTrainingGamePlayers:TrainingGamePlayer[];
  initialTrainingEvents:TrainingEvent[];
  initialMatchMedia:MatchMedia[];
  parentPlayerIds:string[];
  userPermissions:UserPermissions;
}){
  const supabase=useMemo(()=>createClient(),[]);
  const [tab,setTab]=useState<"home"|"mychild"|"matchday"|"collection"|"matches"|"calendar"|"training"|"players"|"stats"|"hall"|"achievements"|"chronicle"|"news"|"club"|"league"|"teamcenter">("home");
  const [viewFx,setViewFx]=useState(false);
  const [cinematicActive, setCinematicActive] = useState(false);
  useEffect(() => {
    setCinematicActive(true);
  }, []);
  const [chronicleSeason,setChronicleSeason]=useState("all");
  const [noticesOpen,setNoticesOpen]=useState(false);
  const [players,setPlayers]=useState(props.initialPlayers);
  const [matches,setMatches]=useState(props.initialMatches);
  const [attendance,setAttendance]=useState(props.initialAttendance);
  const [lineup,setLineup]=useState(props.initialLineup);
  const [events,setEvents]=useState(props.initialEvents);
  const [news,setNews]=useState(props.initialNews);
  const [clubUpdates,setClubUpdates]=useState(props.initialClubUpdates);
  const [teamEvents,setTeamEvents]=useState(props.initialTeamEvents);
  const [trainingSessions,setTrainingSessions]=useState(props.initialTrainingSessions);
  const [trainingAttendance,setTrainingAttendance]=useState(props.initialTrainingAttendance);
  const [trainingGames,setTrainingGames]=useState(props.initialTrainingGames);
  const [trainingGamePlayers,setTrainingGamePlayers]=useState(props.initialTrainingGamePlayers);
  const [trainingEvents,setTrainingEvents]=useState(props.initialTrainingEvents);
  const [matchMedia]=useState(props.initialMatchMedia);
  const [focusedClubKey,setFocusedClubKey]=useState<string|null>(null);
  const [pushState,setPushState]=useState<"idle"|"working"|"enabled"|"error">("idle");
  const [pushMessage,setPushMessage]=useState<string>("");
  const [selectedPlayer,setSelectedPlayer]=useState<Player|null>(null);
  const [selectedBadgeDetail, setSelectedBadgeDetail] = useState<BadgeDetail | null>(null);
  const [achievementsModalOpen, setAchievementsModalOpen] = useState(false);
  const [achievementsTargetPlayer, setAchievementsTargetPlayer] = useState<Player | null>(null);
  const [typerModalOpen, setTyperModalOpen] = useState(false);
  const [knowledgeModalOpen, setKnowledgeModalOpen] = useState(false);
  const [matchBriefModalOpen, setMatchBriefModalOpen] = useState(false);
  const [tacticsModalOpen, setTacticsModalOpen] = useState(false);
  const [questsModalOpen, setQuestsModalOpen] = useState(false);
  const [trainingKingModalOpen, setTrainingKingModalOpen] = useState(false);
  const [seasonPassModalOpen, setSeasonPassModalOpen] = useState(false);
  const [photoBoothModalOpen, setPhotoBoothModalOpen] = useState(false);
  const [birthdayModalOpen, setBirthdayModalOpen] = useState(false);
  const [coachCornerModalOpen, setCoachCornerModalOpen] = useState(false);
  const [newsModalOpen, setNewsModalOpen] = useState(false);
  const [editingNewsItem, setEditingNewsItem] = useState<NewsItem | null>(null);
  const [dpRulesModalOpen, setDpRulesModalOpen] = useState(false);
  const [missionsModalOpen, setMissionsModalOpen] = useState(false);
  const [battleArenaModalOpen, setBattleArenaModalOpen] = useState(false);
  const [notificationsModalOpen, setNotificationsModalOpen] = useState(false);
  const [weeklySummaryModalOpen, setWeeklySummaryModalOpen] = useState(false);
  const [changelogModalOpen, setChangelogModalOpen] = useState(false);
  const [notifPrefsModalOpen, setNotifPrefsModalOpen] = useState(false);
  const [competitionHubOpen, setCompetitionHubOpen] = useState(false);
  const [socialFeedOpen, setSocialFeedOpen] = useState(false);
  const [trophyCabinetOpen, setTrophyCabinetOpen] = useState(false);
  const [safeTradingOpen, setSafeTradingOpen] = useState(false);
  const [gameProfile, setGameProfile] = useState<any>(null);

  const fetchGameProfile = async () => {
    try {
      const res = await fetch(`/api/game/profile?userId=${props.profile.id || "guest_user"}`);
      const data = await res.json();
      if (data.success) {
        setGameProfile(data.profile);
      }
    } catch (e) {
      console.error("Game profile load error", e);
    }
  };

  const [systemEvents, setSystemEvents] = useState<DeltaSystemEvent[]>([]);
  const [activeUrgentEvent, setActiveUrgentEvent] = useState<DeltaSystemEvent | null>(null);
  const [newsFilter, setNewsFilter] = useState<string>("all");
  const [syncControlModalOpen, setSyncControlModalOpen] = useState(false);

  const fetchSystemEvents = async () => {
    try {
      const res = await fetch(`/api/events?userId=${props.profile.id || "guest_user"}`);
      const data = await res.json();
      if (data.success && data.events) {
        setSystemEvents(data.events);

        // Check for urgent unread event for popup
        const urgent = data.events.find(
          (e: DeltaSystemEvent) => e.importance === "URGENT" && !e.is_read
        );
        if (urgent) {
          const dismissed = localStorage.getItem(`delta_urgent_dismissed_${urgent.id}`);
          if (!dismissed) {
            setActiveUrgentEvent(urgent);
          }
        }
      }
    } catch (e) {
      console.error("Failed to load system events:", e);
    }
  };

  useEffect(() => {
    fetchGameProfile();
    fetchSystemEvents();
  }, [props.profile.id]);
  const [readNewsMap, setReadNewsMap] = useState<Record<string, boolean>>({});
  const [activeDrawerCategory, setActiveDrawerCategory] = useState<string | null>(null);
  const [homePodiumMetric,setHomePodiumMetric]=useState<PodiumMetric>("goals");
  const [showcaseIndex,setShowcaseIndex]=useState(0);
  const showcaseStageRef=useRef<HTMLDivElement|null>(null);
  const showcaseMobileRef=useRef<HTMLDivElement|null>(null);
  const showcaseMobileReady=useRef(false);
  const showcaseMobileRebasing=useRef(false);
  const showcaseIndexRef=useRef(0);
  const showcaseMobileStep=()=>{
    const el=showcaseMobileRef.current;
    const card=el?.querySelector<HTMLElement>(".v123-mobile-card");
    return card?card.offsetWidth+12:0;
  };
  const centerMobileCard=(index:number,behavior:ScrollBehavior="smooth")=>{
    const el=showcaseMobileRef.current;const step=showcaseMobileStep();
    if(!el||!step||!players.length)return;
    const normalized=((index%players.length)+players.length)%players.length;
    const logical=(players.length+normalized)*step;
    if(behavior==="instant"){
      el.style.scrollBehavior="auto";
      el.scrollLeft=logical;
      el.style.removeProperty("scroll-behavior");
    }else el.scrollTo({left:logical,behavior});
  };
  const showcaseFrame=useRef<number|null>(null);
  const showcasePendingX=useRef(0);
  const showcaseGesture=useRef<{pointerId:number;pointerType:string;startX:number;startY:number;lastX:number;lastAt:number;dragging:boolean}|null>(null);
  const showcaseIgnoreClick=useRef(false);
  useEffect(()=>{
    if(tab!=="players"||!players.length)return;
    showcaseMobileReady.current=false;
    const frame=requestAnimationFrame(()=>{
      centerMobileCard(showcaseIndexRef.current,"instant");
      showcaseMobileReady.current=true;
    });
    return ()=>cancelAnimationFrame(frame);
  },[tab,players.length]);
  const showcaseStep=()=>showcaseStageRef.current?.clientWidth&&showcaseStageRef.current.clientWidth<600?160:205;
  const showcaseDraw=(dx:number)=>{
    const stage=showcaseStageRef.current;
    if(!stage)return;
    const step=showcaseStep();
    const fractional=dx/step;
    const mobile=stage.clientWidth<760;
    stage.style.setProperty("--v121-progress",String(fractional));
    stage.querySelectorAll<HTMLElement>(".v119-showcase-card[data-showcase-offset]").forEach(card=>{
      const offset=Number(card.dataset.showcaseOffset)||0;
      const relative=offset+fractional;
      const magnitude=Math.abs(relative);
      const x=relative*step*(mobile?.83:1);
      const depth=mobile?0:-Math.min(magnitude,3)*85;
      const scale=Math.max(.51,1.07-Math.min(magnitude,3)*.16);
      const rotate=mobile?0:-Math.max(-2.8,Math.min(2.8,relative))*11;
      card.style.transform=`translate3d(${x}px,${mobile?0:Math.min(magnitude,3)*12}px,${depth}px) rotateY(${rotate}deg) scale(${scale})`;
      if(!mobile){
        card.style.opacity=String(Math.max(.16,1-Math.max(0,magnitude-1.6)*.44));
        card.style.filter=`brightness(${Math.max(.43,1.08-magnitude*.16)})`;
        card.style.zIndex=String(Math.round(100-magnitude*12));
      }
    });
  };
  const showcaseClearDrag=()=>{
    if(showcaseFrame.current!==null){cancelAnimationFrame(showcaseFrame.current);showcaseFrame.current=null;}
    const stage=showcaseStageRef.current;
    stage?.classList.remove("v120-dragging","v121-gesture-active");
    stage?.style.removeProperty("--v121-progress");
    stage?.querySelectorAll<HTMLElement>(".v119-showcase-card[data-showcase-offset]").forEach(card=>{
      card.style.removeProperty("transform");
      card.style.removeProperty("opacity");
      card.style.removeProperty("filter");
      card.style.removeProperty("z-index");
    });
    showcaseGesture.current=null;
  };
  const showcasePointerDown=(e:React.PointerEvent<HTMLDivElement>)=>{
    if(e.pointerType==="mouse"&&e.button!==0)return;
    if(players.length<2)return;
    showcaseIgnoreClick.current=false;
    showcaseGesture.current={pointerId:e.pointerId,pointerType:e.pointerType,startX:e.clientX,startY:e.clientY,lastX:e.clientX,lastAt:performance.now(),dragging:false};
  };
  const showcasePointerMove=(e:React.PointerEvent<HTMLDivElement>)=>{
    const g=showcaseGesture.current;
    if(!g||g.pointerId!==e.pointerId)return;
    const dx=e.clientX-g.startX,dy=e.clientY-g.startY;
    if(!g.dragging&&Math.abs(dy)>Math.abs(dx)&&Math.abs(dy)>12){showcaseClearDrag();return;}
    if(!g.dragging&&Math.abs(dx)>5&&Math.abs(dx)>Math.abs(dy)){
      g.dragging=true;showcaseIgnoreClick.current=true;
      e.currentTarget.classList.add("v120-dragging","v121-gesture-active");
      try{e.currentTarget.setPointerCapture(e.pointerId);}catch{}
    }
    if(g.dragging){
      if(e.cancelable)e.preventDefault();
      g.lastX=e.clientX;g.lastAt=performance.now();
      showcasePendingX.current=Math.max(-showcaseStep()*2.5,Math.min(showcaseStep()*2.5,dx));
      if(showcaseFrame.current===null){
        showcaseFrame.current=requestAnimationFrame(()=>{showcaseFrame.current=null;showcaseDraw(showcasePendingX.current);});
      }
    }
  };
  const showcasePointerEnd=(e:React.PointerEvent<HTMLDivElement>)=>{
    const g=showcaseGesture.current;
    if(!g||g.pointerId!==e.pointerId)return;
    const dx=e.clientX-g.startX;
    if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);
    if(g.dragging){
      const steps=Math.min(players.length-1,Math.max(0,Math.min(3,Math.round(Math.abs(dx)/showcaseStep()+.18))));
      if(steps>0)setShowcaseIndex(old=>(old+(dx<0?steps:-steps)+players.length*4)%players.length);
      showcaseIgnoreClick.current=true;
      // Keep the guard during the browser's synthesized click after a pointer gesture.
      window.setTimeout(()=>{showcaseIgnoreClick.current=false;},120);
    }
    showcaseClearDrag();
  };
  const showcasePointerCancel=()=>{showcaseIgnoreClick.current=false;showcaseClearDrag();};

  const [playerSection,setPlayerSection]=useState<"overview"|"cards"|"achievements"|"history"|"training">("overview");
  const [selectedCollectible,setSelectedCollectible]=useState<string|null>(null);
  const [selectedTrophy,setSelectedTrophy]=useState<string|null>(null);
  const [playerIntro,setPlayerIntro]=useState(false);
  const [packModalOpen,setPackModalOpen]=useState(false);
  const [unlockedPacksMap, setUnlockedPacksMap] = useState<Record<string, Record<CardTheme, boolean>>>({});

  const handleUnlockTheme = (playerId: string, theme: CardTheme) => {
    setUnlockedPacksMap(prev => {
      const current = prev[playerId] || { gold: false, inferno: false, legend: false };
      const updated = { ...current, [theme]: true };
      try {
        localStorage.setItem(`delta_packs_${playerId}`, JSON.stringify(updated));
      } catch {}
      return { ...prev, [playerId]: updated };
    });
  };

  const openPlayerProfile=(player:Player)=>{
    setPlayerSection("overview");
    setSelectedCollectible(null);
    setPlayerIntro(true);
    try {
      const saved = localStorage.getItem(`delta_packs_${player.id}`);
      if (saved) {
        setUnlockedPacksMap(prev => ({ ...prev, [player.id]: JSON.parse(saved) }));
      }
    } catch {}
    setSelectedPlayer(player);
  };
  // Oddzielny, pełnoekranowy widok profilu. Szczególnie na mobile blokuje scroll tła i zawsze otwiera pełny ekran.
  useEffect(()=>{
    if(!selectedPlayer)return;
    const introTimer=window.setTimeout(()=>setPlayerIntro(false),1100);
    const scrollY=window.scrollY;
    const html=document.documentElement;
    const body=document.body;
    const prevHtmlOverflow=html.style.overflow;
    const prevBodyOverflow=body.style.overflow;
    const prevBodyPosition=body.style.position;
    const prevBodyTop=body.style.top;
    const prevBodyLeft=body.style.left;
    const prevBodyRight=body.style.right;
    const prevBodyWidth=body.style.width;
    html.style.overflow="hidden";
    body.style.overflow="hidden";
    body.style.position="fixed";
    body.style.top=`-${scrollY}px`;
    body.style.left="0";
    body.style.right="0";
    body.style.width="100%";
    const onEscape=(event:KeyboardEvent)=>{if(event.key==="Escape")setSelectedPlayer(null);};
    window.addEventListener("keydown",onEscape);
    return ()=>{
      window.clearTimeout(introTimer);
      html.style.overflow=prevHtmlOverflow;
      body.style.overflow=prevBodyOverflow;
      body.style.position=prevBodyPosition;
      body.style.top=prevBodyTop;
      body.style.left=prevBodyLeft;
      body.style.right=prevBodyRight;
      body.style.width=prevBodyWidth;
      window.scrollTo({top:scrollY,left:0,behavior:"auto"});
      window.removeEventListener("keydown",onEscape);
    };
  },[selectedPlayer]);
  const [selectedMatch,setSelectedMatch]=useState<Match|null>(null);
  const [matchInitialTab,setMatchInitialTab]=useState<"summary"|"attendance"|"lineup"|"events"|"mvp">("summary");
  const [matchPlacement,setMatchPlacement]=useState<"home"|"overlay">("overlay");
  const [accountOpen,setAccountOpen]=useState(false);
  const [mobileMoreOpen,setMobileMoreOpen]=useState(false);
  const [now,setNow]=useState(()=>new Date());
  const [statsMetric,setStatsMetric]=useState<"ga"|"goals"|"assists"|"mvp"|"matches"|"captain">("ga");
  const [statsPlayerId,setStatsPlayerId]=useState<string>("");
  const [compareA,setCompareA]=useState<string>("");
  const [compareB,setCompareB]=useState<string>("");
  const [calendarView,setCalendarView]=useState<"month"|"list">("month");
  const [calendarMonth,setCalendarMonth]=useState(()=>new Date(new Date().getFullYear(),new Date().getMonth(),1));


  useEffect(()=>{
    showcaseIgnoreClick.current=false;
    showcaseClearDrag();
    setViewFx(true);
    setSelectedMatch(null);
    setSelectedPlayer(null);
    const timer=window.setTimeout(()=>setViewFx(false),520);
    return ()=>window.clearTimeout(timer);
  },[tab]);

  useEffect(()=>{
    const tick=window.setInterval(()=>setNow(new Date()),30000);
    return ()=>window.clearInterval(tick);
  },[]);
  const staff=props.profile.role==="admin"||props.profile.role==="coach";
  const canManageMatches=staff||props.userPermissions.can_manage_matches;
  const canEditMatchEvents=canManageMatches||props.userPermissions.can_edit_match_events;
  const canManageTraining=staff||props.userPermissions.can_manage_training;
  const canManageTrainingAttendance=canManageTraining||props.userPermissions.can_manage_training_attendance;
  const canOpenAdmin=staff||hasDelegatedAccess(props.userPermissions);

  useEffect(()=>{
    setPlayers(props.initialPlayers);setMatches(props.initialMatches);setAttendance(props.initialAttendance);
    setLineup(props.initialLineup);setEvents(props.initialEvents);setNews(props.initialNews);setClubUpdates(props.initialClubUpdates);setTeamEvents(props.initialTeamEvents);
    setTrainingSessions(props.initialTrainingSessions);setTrainingAttendance(props.initialTrainingAttendance);
    setTrainingGames(props.initialTrainingGames);setTrainingGamePlayers(props.initialTrainingGamePlayers);setTrainingEvents(props.initialTrainingEvents);
  },[props.initialPlayers,props.initialMatches,props.initialAttendance,props.initialLineup,props.initialEvents,props.initialNews,props.initialClubUpdates,props.initialTeamEvents,props.initialTrainingSessions,props.initialTrainingAttendance,props.initialTrainingGames,props.initialTrainingGamePlayers,props.initialTrainingEvents]);

  useEffect(()=>{
    let cancelled=false;
    const refreshMatchData=async()=>{
      const [matchResult,attendanceResult,lineupResult,eventResult]=await Promise.all([
        supabase.from("matches").select("id,round_no,match_date,match_time,venue,home_team,away_team,home_score,away_score,status").order("match_date"),
        supabase.from("match_attendance").select("match_id,player_id,status"),
        supabase.from("match_lineup").select("match_id,player_id,is_starter,is_captain"),
        supabase.from("match_events").select("id,match_id,event_type,player_id,assist_player_id,minute,created_at").order("created_at"),
      ]);
      if(cancelled)return;
      if(matchResult.data)setMatches(matchResult.data as Match[]);
      if(attendanceResult.data)setAttendance(attendanceResult.data as Attendance[]);
      if(lineupResult.data)setLineup(lineupResult.data as Lineup[]);
      if(eventResult.data)setEvents(eventResult.data as Event[]);
    };
    const onFocus=()=>{void refreshMatchData()};
    const onVisibility=()=>{if(document.visibilityState==="visible")void refreshMatchData()};
    const timer=window.setInterval(()=>{void refreshMatchData()},60000);
    window.addEventListener("focus",onFocus);
    document.addEventListener("visibilitychange",onVisibility);
    return()=>{
      cancelled=true;
      window.clearInterval(timer);
      window.removeEventListener("focus",onFocus);
      document.removeEventListener("visibilitychange",onVisibility);
    };
  },[supabase]);

  useEffect(()=>{
    let cancelled=false;
    const refreshClub=async()=>{
      const {data}=await supabase
        .from("club_updates")
        .select("id,source_key,source_name,source_url,title,body,priority,published_at,synced_at")
        .order("published_at",{ascending:false})
        .limit(30);
      if(!cancelled&&data)setClubUpdates(data as ClubUpdate[]);
    };
    const timer=window.setInterval(refreshClub,60000);
    return ()=>{cancelled=true;window.clearInterval(timer);};
  },[supabase]);

  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);
    const view=params.get("view");
    if(view==="club"){
      const key=params.get("club");
      setTab("club");
      if(key)setFocusedClubKey(key);
      window.setTimeout(()=>{
        const el=key?document.getElementById(`club-update-${key}`):document.getElementById("club-feed-top");
        el?.scrollIntoView({behavior:"smooth",block:"center"});
      },350);
    }else if(view==="matchday"&&(canManageMatches||canEditMatchEvents)){
      setTab("matchday");
    }else if(view==="training"){
      setTab("training");
    }else if(view==="calendar"){
      setTab("calendar");
    }else if(view==="mychild"&&props.parentPlayerIds.length){
      setTab("mychild");
    }
  },[]);

  async function enableClubPush(){
    setPushState("working");
    setPushMessage("");
    try{
      await subscribeToPush();
      setPushState("enabled");
      setPushMessage("Gotowe. Ten telefon jest zapisany do powiadomień „Z klubu”.");
    }catch(e:any){
      console.error("Push subscribe error",e);
      setPushState("error");
      if(e instanceof PushSetupError){
        const suffix=e.detail?` (${e.detail})`:"";
        setPushMessage(`${e.message}${suffix}`);
      }else{
        setPushMessage(`Nie udało się włączyć powiadomień: ${String(e?.message||e)}`);
      }
    }
  }

  async function repairClubPush(){
    setPushState("working");
    setPushMessage("Ponownie zapisuję ten telefon…");
    try{
      await resetPushSubscription();
      setPushState("enabled");
      setPushMessage("Gotowe. Stara subskrypcja została zastąpiona nową.");
    }catch(e:any){
      console.error("Push repair error",e);
      setPushState("error");
      if(e instanceof PushSetupError){
        const suffix=e.detail?` (${e.detail})`:"";
        setPushMessage(`${e.message}${suffix}`);
      }else{
        setPushMessage(`Nie udało się ponownie zapisać telefonu: ${String(e?.message||e)}`);
      }
    }
  }

  const stats=useMemo(()=>{
    const map:Record<string,{m:number;starts:number;captain:number;g:number;a:number;mvp:number}>={};
    players.forEach(p=>map[p.id]={m:0,starts:0,captain:0,g:0,a:0,mvp:0});
    matches.filter(m=>m.status==="played").forEach(m=>{
      attendance.filter(a=>a.match_id===m.id&&(a.status==="present"||a.status==="yes")).forEach(a=>{if(map[a.player_id])map[a.player_id].m++});
      lineup.filter(l=>l.match_id===m.id).forEach(l=>{if(map[l.player_id]){if(l.is_starter)map[l.player_id].starts++;if(l.is_captain)map[l.player_id].captain++;}});
      events.filter(e=>e.match_id===m.id).forEach(e=>{
        if(e.event_type==="goal"&&e.player_id&&map[e.player_id])map[e.player_id].g++;
        if(e.event_type==="goal"&&e.assist_player_id&&map[e.assist_player_id])map[e.assist_player_id].a++;
        if(e.event_type==="mvp"&&e.player_id&&map[e.player_id])map[e.player_id].mvp++;
      });
    });
    return map;
  },[players,matches,attendance,lineup,events]);

  const teamSummary=useMemo(()=>{
    let played=0,wins=0,draws=0,losses=0,goals=0,assists=0;
    matches.filter(m=>m.status==="played").forEach(m=>{
      played++;
      const ours=m.home_team===CLUB?(m.home_score||0):(m.away_score||0);
      const opp=m.home_team===CLUB?(m.away_score||0):(m.home_score||0);
      goals+=ours;
      if(ours>opp)wins++; else if(ours===opp)draws++; else losses++;
      assists+=events.filter(e=>e.match_id===m.id&&e.event_type==="goal"&&e.assist_player_id).length;
    });
    return {played,wins,draws,losses,goals,assists};
  },[matches,events]);

  const leagueSchedule=useMemo(()=>leagueScheduleWithMatches(matches),[matches]);
  const nextMatch=useMemo(()=>matches
    .filter(m=>m.status==="scheduled"&&parseLocalMatchDate(m.match_date,m.match_time).getTime()>=now.getTime()-3*60*60*1000)
    .sort((a,b)=>parseLocalMatchDate(a.match_date,a.match_time).getTime()-parseLocalMatchDate(b.match_date,b.match_time).getTime())[0],[matches,now]);
  const ourLeagueByes=useMemo<LeagueBye[]>(()=>LEAGUE_ROUNDS.flatMap(round=>{
    const date=leagueRoundDate(round,leagueSchedule);
    const team=leagueByeTeam(round,leagueSchedule);
    return team===CLUB&&date?[{round,date,team}]:[];
  }),[leagueSchedule]);
  const matchArchiveItems=useMemo(()=>[
    ...matches.map(match=>({key:`match-${match.id}`,date:match.match_date,match,bye:null as LeagueBye|null})),
    ...ourLeagueByes.map(bye=>({key:`bye-${bye.round}`,date:bye.date,match:null as Match|null,bye}))
  ].sort((a,b)=>a.date.localeCompare(b.date)),[matches,ourLeagueByes]);
  const currentSeason=seasonLabel(nextMatch?.match_date||matches[0]?.match_date);
  const nextMatchAt=nextMatch?parseLocalMatchDate(nextMatch.match_date,nextMatch.match_time):null;
  const isMatchDay=nextMatch?(()=>{
    const ms=new Date(`${nextMatch.match_date}T${(nextMatch.match_time||"12:00").slice(0,5)}:00`).getTime()-Date.now();
    return ms>=-3*60*60*1000&&ms<=24*60*60*1000;
  })():false;
  const nextMatchCountdown=nextMatchAt?formatCountdown(nextMatchAt.getTime()-now.getTime()):"—";
  const nextTraining=trainingSessions
    .map(session=>{
      const start=parseLocalMatchDate(session.training_date,session.start_time||"17:00");
      const end=session.end_time
        ? parseLocalMatchDate(session.training_date,session.end_time)
        : new Date(start.getTime()+90*60*1000);
      return {session,start,end,isLive:now>=start&&now<end};
    })
    .filter(item=>item.end.getTime()>=now.getTime())
    .sort((a,b)=>a.start.getTime()-b.start.getTime())[0]||null;
  const nextTrainingLabel=nextTraining
    ? [
        nextTraining.start.toLocaleDateString("pl-PL",{weekday:"long",day:"2-digit",month:"2-digit"}),
        `${nextTraining.start.toLocaleTimeString("pl-PL",{hour:"2-digit",minute:"2-digit"})}–${nextTraining.end.toLocaleTimeString("pl-PL",{hour:"2-digit",minute:"2-digit"})}`,
        nextTraining.session.location
      ].filter(Boolean).join(" • ")
    : "";

  const futureTeamEvents=teamEvents
    .map(e=>{
      const tm=e.start_time?.slice(0,5)||"00:00";
      return {...e,at:new Date(`${e.event_date}T${tm}:00`)};
    })
    .filter(e=>e.at.getTime()>=now.getTime()-60000)
    .sort((a,b)=>a.at.getTime()-b.at.getTime());

  const smartCandidates:{id?:string;kind:string;title:string;subtitle:string;at:Date;important?:boolean}[]=[
    ...(nextMatchAt&&nextMatchAt>now?[{
      kind:"match",
      title:`Mecz • ${nextMatch?(nextMatch.home_team===CLUB?nextMatch.away_team:nextMatch.home_team):""}`,
      subtitle:nextMatch?`${datePL(nextMatch.match_date)} • ${nextMatch.match_time||"godzina do ustalenia"}`:"",
      at:nextMatchAt
    }]:[]),
    ...(nextTraining?[{
      kind:"training",
      title:nextTraining.isLive?`${nextTraining.session.title||"Trening"} trwa`:nextTraining.session.title||"Trening drużyny",
      subtitle:nextTrainingLabel,
      at:nextTraining.isLive?now:nextTraining.start
    }]:[]),
    ...futureTeamEvents.map(e=>({
      id:e.id,
      kind:e.event_type,
      title:e.title,
      subtitle:[e.event_date,e.start_time?.slice(0,5),e.location].filter(Boolean).join(" • "),
      at:e.at,
      important:e.important
    }))
  ].sort((a,b)=>a.at.getTime()-b.at.getTime());

  const importantTeamEvent=futureTeamEvents.find(e=>e.important)||futureTeamEvents.find(e=>e.event_type==="birthday")||null;
  const homeAgendaItems=smartCandidates.filter(item=>item.kind!=="match"&&item.id!==importantTeamEvent?.id).slice(0,3);
  const nextTeamEvent=homeAgendaItems[0]||null;
  const teamClockCountdown=nextTeamEvent?formatCountdown(nextTeamEvent.at.getTime()-now.getTime()):"Brak wydarzeń";
  const isTeamLive=!!nextTeamEvent&&nextTeamEvent.at.getTime()-now.getTime()<=30*60*1000&&nextTeamEvent.at.getTime()-now.getTime()>=-2*60*60*1000;
  const recurringTrainingItems=useMemo<CalendarItem[]>(()=>{
    const items:CalendarItem[]=[];
    const start=new Date(now.getFullYear(),now.getMonth()-1,1,12);
    const end=new Date(now.getFullYear()+1,6,1,12);
    const existing=new Set(trainingSessions.map(s=>s.training_date));
    for(const cursor=new Date(start);cursor<=end;cursor.setDate(cursor.getDate()+1)){
      const day=cursor.getDay();
      if(day!==3&&day!==5)continue;
      const date=`${cursor.getFullYear()}-${String(cursor.getMonth()+1).padStart(2,"0")}-${String(cursor.getDate()).padStart(2,"0")}`;
      if(existing.has(date))continue;
      const wednesday=day===3;
      items.push({id:`routine-${date}`,kind:"training",date,time:"17:00",title:wednesday?"Trening • Warszawianka":"Trening • Wiktorska",location:wednesday?"Warszawianka, ul. Piaseczyńska 35":"Boisko, ul. Wiktorska 32",details:"17:00–18:30 • stały trening drużyny",important:false,match:null});
    }
    return items;
  },[trainingSessions,now.getFullYear(),now.getMonth()]);
  const calendarItems=useMemo<CalendarItem[]>(()=>[
    ...matches.filter(m=>m.status!=="cancelled").map(m=>({
      id:`match-${m.id}`,kind:"match",date:m.match_date,time:m.match_time?.slice(0,5)||"",title:`Mecz • ${m.home_team===CLUB?m.away_team:m.home_team}`,
      location:m.venue||"",details:`${m.home_team} — ${m.away_team}`,important:m.status==="scheduled",match:m
    })),
    ...ourLeagueByes.map(bye=>({
      id:`league-bye-${bye.round}`,kind:"bye",date:bye.date,time:"",title:`Pauza ligowa • kolejka ${bye.round}`,
      location:"",details:`${bye.team} nie rozgrywa meczu w tej kolejce.`,important:false,match:null
    })),
    ...trainingSessions.map(session=>({
      id:`training-${session.id}`,kind:"training",date:session.training_date,time:session.start_time?.slice(0,5)||"",title:session.title||"Trening",
      location:session.location||"",details:session.notes||"",important:false,match:null
    })),
    ...recurringTrainingItems,
    ...teamEvents.map(event=>({
      id:`event-${event.id}`,kind:event.event_type,date:event.event_date,time:event.start_time?.slice(0,5)||"",title:event.title,
      location:event.location||"",details:event.details||"",important:event.important,match:null
    }))
  ].sort((a,b)=>`${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)),[matches,ourLeagueByes,trainingSessions,teamEvents,recurringTrainingItems]);
  const calendarDays=useMemo(()=>{
    const first=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth(),1);
    const gridStart=new Date(first);
    gridStart.setDate(first.getDate()-((first.getDay()+6)%7));
    return Array.from({length:42},(_,index)=>{
      const date=new Date(gridStart);
      date.setDate(gridStart.getDate()+index);
      const key=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
      return {date,key,inMonth:date.getMonth()===calendarMonth.getMonth(),items:calendarItems.filter(item=>item.date===key)};
    });
  },[calendarItems,calendarMonth]);
  const nextPresent=nextMatch?attendance.filter(a=>a.match_id===nextMatch.id&&(a.status==="present"||a.status==="yes")).length:0;
  const nextResponses=nextMatch?attendance.filter(a=>a.match_id===nextMatch.id&&["yes","no","maybe","present"].includes(a.status)):[];
  const nextResponseCount=new Set(nextResponses.map(a=>a.player_id)).size;
  const parentPlayers=players.filter(p=>props.parentPlayerIds.includes(p.id));
  const attendanceStatus=(playerId:string)=>attendance.find(a=>a.match_id===nextMatch?.id&&a.player_id===playerId)?.status||"";
  const topScorer=players.slice().sort((a,b)=>(stats[b.id]?.g||0)-(stats[a.id]?.g||0))[0];
  const topAssister=players.slice().sort((a,b)=>(stats[b.id]?.a||0)-(stats[a.id]?.a||0))[0];
  const topMvp=players.slice().sort((a,b)=>(stats[b.id]?.mvp||0)-(stats[a.id]?.mvp||0))[0];
  const captainLeader=players.slice().sort((a,b)=>(stats[b.id]?.captain||0)-(stats[a.id]?.captain||0))[0];
  const scorersRanking=players
    .slice()
    .filter(p=>(stats[p.id]?.g||0)>0)
    .sort((a,b)=>{
      const dg=(stats[b.id]?.g||0)-(stats[a.id]?.g||0);
      if(dg!==0)return dg;
      const da=(stats[b.id]?.a||0)-(stats[a.id]?.a||0);
      if(da!==0)return da;
      return a.display_name.localeCompare(b.display_name,"pl");
    });

  const assistsRanking=players
    .slice()
    .filter(p=>(stats[p.id]?.a||0)>0)
    .sort((a,b)=>{
      const da=(stats[b.id]?.a||0)-(stats[a.id]?.a||0);
      if(da!==0)return da;
      const dg=(stats[b.id]?.g||0)-(stats[a.id]?.g||0);
      if(dg!==0)return dg;
      return a.display_name.localeCompare(b.display_name,"pl");
    });

  const topGoals=(stats[topScorer?.id]?.g||0);
  const topAssists=(stats[topAssister?.id]?.a||0);
  const topMvpCount=(stats[topMvp?.id]?.mvp||0);

  const seasonTopScorers=topGoals>0 ? players.filter(p=>(stats[p.id]?.g||0)===topGoals) : [];
  const seasonTopAssisters=topAssists>0 ? players.filter(p=>(stats[p.id]?.a||0)===topAssists) : [];
  const seasonTopMvp=topMvpCount>0 ? players.filter(p=>(stats[p.id]?.mvp||0)===topMvpCount) : [];


  const statsRanking=players.slice().sort((a,b)=>{
    const sa=stats[a.id]||{m:0,starts:0,captain:0,g:0,a:0,mvp:0};
    const sb=stats[b.id]||{m:0,starts:0,captain:0,g:0,a:0,mvp:0};
    const value=(s:any)=>{
      if(statsMetric==="goals")return s.g;
      if(statsMetric==="assists")return s.a;
      if(statsMetric==="mvp")return s.mvp;
      if(statsMetric==="matches")return s.m;
      if(statsMetric==="captain")return s.captain;
      return s.g+s.a;
    };
    const diff=value(sb)-value(sa);
    if(diff!==0)return diff;
    return ((stats[b.id]?.g||0)+(stats[b.id]?.a||0))-((stats[a.id]?.g||0)+(stats[a.id]?.a||0)) || a.display_name.localeCompare(b.display_name,"pl");
  });

  const statsMetricLabel=
    statsMetric==="goals"?"GOLE":
    statsMetric==="assists"?"ASYSTY":
    statsMetric==="mvp"?"MVP":
    statsMetric==="matches"?"MECZE":
    statsMetric==="captain"?"KAPITAN":
    "G+A";

  const statsMetricValue=(p:Player)=>{
    const s=stats[p.id]||{m:0,starts:0,captain:0,g:0,a:0,mvp:0};
    if(statsMetric==="goals")return s.g;
    if(statsMetric==="assists")return s.a;
    if(statsMetric==="mvp")return s.mvp;
    if(statsMetric==="matches")return s.m;
    if(statsMetric==="captain")return s.captain;
    return s.g+s.a;
  };
  const selectedStatsPlayer=players.find(p=>p.id===statsPlayerId)||statsRanking[0]||null;

  const comparePlayerA=players.find(p=>p.id===compareA) || players[0] || null;
  const comparePlayerB=players.find(p=>p.id===compareB) || players[1] || players[0] || null;

  const statMax={
    g:Math.max(1,...players.map(p=>stats[p.id]?.g||0)),
    a:Math.max(1,...players.map(p=>stats[p.id]?.a||0)),
    ga:Math.max(1,...players.map(p=>(stats[p.id]?.g||0)+(stats[p.id]?.a||0))),
    m:Math.max(1,...players.map(p=>stats[p.id]?.m||0)),
    starts:Math.max(1,...players.map(p=>stats[p.id]?.starts||0)),
    mvp:Math.max(1,...players.map(p=>stats[p.id]?.mvp||0)),
    captain:Math.max(1,...players.map(p=>stats[p.id]?.captain||0))
  };

  const topGA=players.slice().sort((a,b)=>((stats[b.id]?.g||0)+(stats[b.id]?.a||0))-((stats[a.id]?.g||0)+(stats[a.id]?.a||0)))[0];
  const playersWithGoal=players.filter(p=>(stats[p.id]?.g||0)>0).length;
  const playersWithAssist=players.filter(p=>(stats[p.id]?.a||0)>0).length;
  const winRate=teamSummary.played?Math.round((teamSummary.wins/teamSummary.played)*100):0;
  const goalsPerMatch=teamSummary.played?(teamSummary.goals/teamSummary.played):0;
  const assistsPerMatch=teamSummary.played?(teamSummary.assists/teamSummary.played):0;

  const biggestWin=matches
    .filter(m=>m.status==="played")
    .map(m=>{
      const ours=m.home_team===CLUB?(m.home_score||0):(m.away_score||0);
      const opp=m.home_team===CLUB?(m.away_score||0):(m.home_score||0);
      return {match:m,ours,opp,diff:ours-opp};
    })
    .filter(x=>x.diff>0)
    .sort((a,b)=>b.diff-a.diff)[0] || null;

  const highestScoringMatch=matches
    .filter(m=>m.status==="played")
    .map(m=>{
      const ours=m.home_team===CLUB?(m.home_score||0):(m.away_score||0);
      const opp=m.home_team===CLUB?(m.away_score||0):(m.home_score||0);
      return {match:m,ours,opp,total:ours+opp};
    })
    .sort((a,b)=>b.total-a.total)[0] || null;
  const recentMatches=matches
    .filter(m=>m.status==="played")
    .slice()
    .sort((a,b)=>new Date(b.match_date).getTime()-new Date(a.match_date).getTime())
    .slice(0,5);

  const recentResult=(m:Match)=>{
    const ours=m.home_team===CLUB?(m.home_score||0):(m.away_score||0);
    const opp=m.home_team===CLUB?(m.away_score||0):(m.home_score||0);
    if(ours>opp)return "W";
    if(ours===opp)return "R";
    return "P";
  };

  const recentOpponent=(m:Match)=>m.home_team===CLUB?m.away_team:m.home_team;

  const currentUnbeatenStreak=(()=>{
    let count=0;
    for(const m of recentMatches){
      if(recentResult(m)==="P")break;
      count++;
    }
    return count;
  })();

  const currentWinStreak=(()=>{
    let count=0;
    for(const m of recentMatches){
      if(recentResult(m)!=="W")break;
      count++;
    }
    return count;
  })();

  const playedMatchesChrono=matches
    .filter(m=>m.status==="played")
    .slice()
    .sort((a,b)=>new Date(a.match_date).getTime()-new Date(b.match_date).getTime());

  const advancedPlayerStats=useMemo(()=>{
    const result:Record<string,{
      goalGames:number;
      assistGames:number;
      contributionGames:number;
      doubles:number;
      hatTricks:number;
      bestMatchGA:number;
      bestMatchId:string|null;
      currentGoalStreak:number;
      currentGAStreak:number;
      attendanceStreak:number;
      starterStreak:number;
      winsPlayed:number;
      gaPerMatch:number;
      goalsPerMatch:number;
      assistsPerMatch:number;
    }>={};

    players.forEach(p=>{
      let goalGames=0,assistGames=0,contributionGames=0,doubles=0,hatTricks=0;
      let bestMatchGA=0,bestMatchId:string|null=null,winsPlayed=0;

      for(const m of playedMatchesChrono){
        const present=attendance.some(a=>a.match_id===m.id&&a.player_id===p.id&&(a.status==="present"||a.status==="yes"));
        const goals=events.filter(e=>e.match_id===m.id&&e.event_type==="goal"&&e.player_id===p.id).length;
        const assists=events.filter(e=>e.match_id===m.id&&e.event_type==="goal"&&e.assist_player_id===p.id).length;
        const ga=goals+assists;

        if(goals>0)goalGames++;
        if(assists>0)assistGames++;
        if(ga>0)contributionGames++;
        if(goals===2)doubles++;
        if(goals>=3)hatTricks++;
        if(ga>bestMatchGA){bestMatchGA=ga;bestMatchId=m.id;}

        const ours=m.home_team===CLUB?(m.home_score||0):(m.away_score||0);
        const opp=m.home_team===CLUB?(m.away_score||0):(m.home_score||0);
        if(present&&ours>opp)winsPlayed++;
      }

      let currentGoalStreak=0,currentGAStreak=0,attendanceStreak=0,starterStreak=0;
      for(let i=playedMatchesChrono.length-1;i>=0;i--){
        const m=playedMatchesChrono[i];
        const goals=events.filter(e=>e.match_id===m.id&&e.event_type==="goal"&&e.player_id===p.id).length;
        if(goals>0)currentGoalStreak++; else break;
      }
      for(let i=playedMatchesChrono.length-1;i>=0;i--){
        const m=playedMatchesChrono[i];
        const goals=events.filter(e=>e.match_id===m.id&&e.event_type==="goal"&&e.player_id===p.id).length;
        const assists=events.filter(e=>e.match_id===m.id&&e.event_type==="goal"&&e.assist_player_id===p.id).length;
        if(goals+assists>0)currentGAStreak++; else break;
      }
      for(let i=playedMatchesChrono.length-1;i>=0;i--){
        const m=playedMatchesChrono[i];
        const present=attendance.some(a=>a.match_id===m.id&&a.player_id===p.id&&(a.status==="present"||a.status==="yes"));
        if(present)attendanceStreak++; else break;
      }
      for(let i=playedMatchesChrono.length-1;i>=0;i--){
        const m=playedMatchesChrono[i];
        const starter=lineup.some(l=>l.match_id===m.id&&l.player_id===p.id&&l.is_starter);
        if(starter)starterStreak++; else break;
      }

      const base=stats[p.id]||{m:0,starts:0,captain:0,g:0,a:0,mvp:0};
      result[p.id]={
        goalGames,assistGames,contributionGames,doubles,hatTricks,bestMatchGA,bestMatchId,
        currentGoalStreak,currentGAStreak,attendanceStreak,starterStreak,winsPlayed,
        gaPerMatch:base.m?(base.g+base.a)/base.m:0,
        goalsPerMatch:base.m?base.g/base.m:0,
        assistsPerMatch:base.m?base.a/base.m:0,
      };
    });
    return result;
  },[players,playedMatchesChrono,attendance,events,lineup,stats]);

  const advancedLeaders={
    gaPerMatch:players.slice().sort((a,b)=>(advancedPlayerStats[b.id]?.gaPerMatch||0)-(advancedPlayerStats[a.id]?.gaPerMatch||0))[0]||null,
    contributionGames:players.slice().sort((a,b)=>(advancedPlayerStats[b.id]?.contributionGames||0)-(advancedPlayerStats[a.id]?.contributionGames||0))[0]||null,
    attendanceStreak:players.slice().sort((a,b)=>(advancedPlayerStats[b.id]?.attendanceStreak||0)-(advancedPlayerStats[a.id]?.attendanceStreak||0))[0]||null,
    bestMatchGA:players.slice().sort((a,b)=>(advancedPlayerStats[b.id]?.bestMatchGA||0)-(advancedPlayerStats[a.id]?.bestMatchGA||0))[0]||null,
  };

  const automaticMilestones=(p:Player)=>{
    const a=advancedPlayerStats[p.id];
    const s=stats[p.id]||{m:0,starts:0,captain:0,g:0,a:0,mvp:0};
    if(!a)return [];
    return [
      {label:"DUBLET",ok:a.doubles>0,value:a.doubles,icon:"2×"},
      {label:"HAT-TRICK",ok:a.hatTricks>0,value:a.hatTricks,icon:"3×"},
      {label:"SERIA GOLI",ok:a.currentGoalStreak>=2,value:a.currentGoalStreak,icon:"🔥"},
      {label:"SERIA G+A",ok:a.currentGAStreak>=2,value:a.currentGAStreak,icon:"⚡"},
      {label:"ŻELAZNA OBECNOŚĆ",ok:a.attendanceStreak>=3,value:a.attendanceStreak,icon:"✓"},
      {label:"STAŁY STARTER",ok:a.starterStreak>=3,value:a.starterStreak,icon:"6"},
      {label:"10 G+A",ok:s.g+s.a>=10,value:s.g+s.a,icon:"10"},
      {label:"3 MVP",ok:s.mvp>=3,value:s.mvp,icon:"★"},
    ].filter(x=>x.ok);
  };


  const teamGoalTarget=50;
  const teamGoalProgress=Math.min(100,Math.round((teamSummary.goals/teamGoalTarget)*100));


  const trainingPlayerStats=useMemo(()=>{
    const out:Record<string,{sessions:number;goals:number;assists:number;ga:number;attendanceStreak:number;games:number;wins:number}>={};
    players.forEach(p=>out[p.id]={sessions:0,goals:0,assists:0,ga:0,attendanceStreak:0,games:0,wins:0});

    trainingSessions.forEach(s=>{
      trainingAttendance
        .filter(a=>a.training_id===s.id&&a.status==="present")
        .forEach(a=>{if(out[a.player_id])out[a.player_id].sessions++;});
    });

    trainingEvents.forEach(e=>{
      if(e.event_type==="goal"&&e.player_id&&out[e.player_id])out[e.player_id].goals++;
      if(e.event_type==="goal"&&e.assist_player_id&&out[e.assist_player_id])out[e.assist_player_id].assists++;
    });

    trainingGames.forEach(g=>{
      const teamPlayers=trainingGamePlayers.filter(x=>x.game_id===g.id);
      teamPlayers.forEach(x=>{
        if(!out[x.player_id])return;
        out[x.player_id].games++;
        const won=x.team==="A"?g.team_a_score>g.team_b_score:g.team_b_score>g.team_a_score;
        if(won)out[x.player_id].wins++;
      });
    });

    players.forEach(p=>{
      out[p.id].ga=out[p.id].goals+out[p.id].assists;
      let streak=0;
      const chronological=trainingSessions.slice().sort((a,b)=>a.training_date.localeCompare(b.training_date));
      for(let i=chronological.length-1;i>=0;i--){
        const present=trainingAttendance.some(a=>a.training_id===chronological[i].id&&a.player_id===p.id&&a.status==="present");
        if(present)streak++; else break;
      }
      out[p.id].attendanceStreak=streak;
    });
    return out;
  },[players,trainingSessions,trainingAttendance,trainingGames,trainingGamePlayers,trainingEvents]);

  const trainingScorers=players.slice().sort((a,b)=>(trainingPlayerStats[b.id]?.goals||0)-(trainingPlayerStats[a.id]?.goals||0));
  const trainingAssisters=players.slice().sort((a,b)=>(trainingPlayerStats[b.id]?.assists||0)-(trainingPlayerStats[a.id]?.assists||0));
  const trainingGA=players.slice().sort((a,b)=>(trainingPlayerStats[b.id]?.ga||0)-(trainingPlayerStats[a.id]?.ga||0));
  const trainingAttendanceRank=players.slice().sort((a,b)=>(trainingPlayerStats[b.id]?.sessions||0)-(trainingPlayerStats[a.id]?.sessions||0));

  const trainingChemistry=useMemo(()=>{
    type Pair={a:Player;b:Player;games:number;wins:number;combinedGA:number;score:number};
    const pairs:Pair[]=[];
    for(let i=0;i<players.length;i++){
      for(let j=i+1;j<players.length;j++){
        const pa=players[i],pb=players[j];
        let games=0,wins=0,combinedGA=0;

        trainingGames.forEach(g=>{
          const xa=trainingGamePlayers.find(x=>x.game_id===g.id&&x.player_id===pa.id);
          const xb=trainingGamePlayers.find(x=>x.game_id===g.id&&x.player_id===pb.id);
          if(!xa||!xb||xa.team!==xb.team)return;

          games++;
          const teamWon=xa.team==="A"?g.team_a_score>g.team_b_score:g.team_b_score>g.team_a_score;
          if(teamWon)wins++;

          const eventsInGame=trainingEvents.filter(e=>e.game_id===g.id);
          combinedGA+=eventsInGame.filter(e=>e.player_id===pa.id||e.player_id===pb.id||e.assist_player_id===pa.id||e.assist_player_id===pb.id).length;
        });

        if(games>0){
          const winRate=wins/games;
          const contributionRate=Math.min(1,combinedGA/Math.max(1,games*4));
          const score=Math.round(winRate*70+contributionRate*30);
          pairs.push({a:pa,b:pb,games,wins,combinedGA,score});
        }
      }
    }
    return pairs.sort((x,y)=>y.score-x.score||y.games-x.games||y.combinedGA-x.combinedGA);
  },[players,trainingGames,trainingGamePlayers,trainingEvents]);

  const chemistryNetwork=useMemo(()=>{
    const linkedPlayers=new Map<string,Player>();
    trainingChemistry.slice(0,10).forEach(pair=>{
      if(linkedPlayers.size<6||linkedPlayers.has(pair.a.id))linkedPlayers.set(pair.a.id,pair.a);
      if(linkedPlayers.size<6||linkedPlayers.has(pair.b.id))linkedPlayers.set(pair.b.id,pair.b);
    });
    const networkPlayers=Array.from(linkedPlayers.values()).slice(0,6);
    const nodes=networkPlayers.map((player,index)=>{
      const angle=(Math.PI*2*index/Math.max(1,networkPlayers.length))-Math.PI/2;
      const radius=networkPlayers.length===1?0:36;
      return {player,x:50+Math.cos(angle)*radius,y:50+Math.sin(angle)*radius};
    });
    const positions=new Map(nodes.map(node=>[node.player.id,node]));
    const links=trainingChemistry
      .filter(pair=>positions.has(pair.a.id)&&positions.has(pair.b.id))
      .slice(0,10)
      .map(pair=>({pair,from:positions.get(pair.a.id)!,to:positions.get(pair.b.id)!}));
    return {nodes,links};
  },[trainingChemistry]);

  const totalTrainingAttendance=trainingAttendance.filter(a=>a.status==="present").length;
  const avgTrainingAttendance=trainingSessions.length?totalTrainingAttendance/trainingSessions.length:0;

  const unlockedCount=(p:Player)=>playerAchievements(p).filter(([,ok])=>ok).length;

  const playerAchievements=(p:Player)=>{
    const s=stats[p.id]||{m:0,starts:0,captain:0,g:0,a:0,mvp:0};
    const t=trainingPlayerStats[p.id]||{sessions:0,goals:0,assists:0,ga:0,attendanceStreak:0,games:0,wins:0};
    return [
      ["Debiut",s.m>=1,`${s.m}/1`],["5 meczów",s.m>=5,`${s.m}/5`],["Wyjściowa 6",s.starts>=1,`${s.starts}/1`],
      ["Stały starter",s.starts>=5,`${s.starts}/5`],["Kapitan",s.captain>=1,`${s.captain}/1`],["Lider zespołu",s.captain>=5,`${s.captain}/5`],
      ["Pierwszy gol",s.g>=1,`${s.g}/1`],["5 goli",s.g>=5,`${s.g}/5`],["Pierwsza asysta",s.a>=1,`${s.a}/1`],
      ["Kreator",s.a>=5,`${s.a}/5`],["MVP",s.mvp>=1,`${s.mvp}/1`],["Gwiazda",s.mvp>=3,`${s.mvp}/3`],
      ["Mistrz treningu",t.sessions>=5,`${t.sessions}/5`],["Żelazna seria",t.attendanceStreak>=3,`${t.attendanceStreak}/3`],
      ["Snajper treningu",t.goals>=5,`${t.goals}/5`],["Asysta treningu",t.assists>=5,`${t.assists}/5`]
    ];
  };

  const teamAchievements=[
    {name:"Pierwszy krok",description:"Rozpoczęcie sezonu i pierwszy oficjalny mecz.",category:"MECZE",current:teamSummary.played,target:1,Icon:Flame},
    {name:"Pierwsza wygrana",description:"Zwycięstwo, które uruchamia drużynową serię.",category:"ZWYCIĘSTWA",current:teamSummary.wins,target:1,Icon:Trophy},
    {name:"Trzy zwycięstwa",description:"Regularność i charakter potwierdzone wynikami.",category:"ZWYCIĘSTWA",current:teamSummary.wins,target:3,Icon:Crown},
    {name:"Dziesięć bramek",description:"Pierwszy ofensywny kamień milowy sezonu.",category:"BRAMKI",current:teamSummary.goals,target:10,Icon:Goal},
    {name:"Dwadzieścia pięć bramek",description:"Drużyna wchodzi na wyższy poziom skuteczności.",category:"BRAMKI",current:teamSummary.goals,target:25,Icon:Target},
    {name:"Pięćdziesiąt bramek",description:"Wielki wspólny cel całego zespołu.",category:"BRAMKI",current:teamSummary.goals,target:50,Icon:Medal},
    {name:"Dziesięć asyst",description:"Współpraca, która zamienia akcje w gole.",category:"DRUŻYNA",current:teamSummary.assists,target:10,Icon:Star},
    {name:"Sezon drużyny",description:"Dziesięć wspólnie rozegranych spotkań.",category:"MECZE",current:teamSummary.played,target:10,Icon:Users},
  ];
  const unlockedTeamAchievements=teamAchievements.filter(item=>item.current>=item.target);
  const nextTeamAchievement=teamAchievements.find(item=>item.current<item.target)||teamAchievements[teamAchievements.length-1];
  const chronicleMatches=matches.filter(m=>m.status==="played").slice().sort((a,b)=>b.match_date.localeCompare(a.match_date));
  const chronicleWins=chronicleMatches.filter(m=>recentResult(m)==="W").length;
  const chronicleGoals=chronicleMatches.reduce((sum,m)=>sum+(m.home_team===CLUB?(m.home_score||0):(m.away_score||0)),0);
  const seasonOptions=Array.from(new Set(chronicleMatches.map(m=>seasonLabel(m.match_date))));
  const visibleChronicle=chronicleSeason==="all"?chronicleMatches:chronicleMatches.filter(m=>seasonLabel(m.match_date)===chronicleSeason);
  const nextSmart=smartCandidates[0]||null;
  const ownMatchResponses=parentPlayers.map(p=>({player:p,status:attendanceStatus(p.id)}));
  const unanswered=nextMatch?ownMatchResponses.filter(x=>!x.status||x.status==="maybe"):[];
  const latestPlayed=chronicleMatches[0]||null;
  const nextOtherEvent=futureTeamEvents[0]||null;
  const teamNotices=[
    ...(nextMatch&&unanswered.length?[{id:`rsvp-${nextMatch.id}`,type:"action" as const,title:"Potwierdź obecność na meczu",detail:`${datePL(nextMatch.match_date)} · ${unanswered.map(x=>x.player.display_name).join(", ")}`,action:()=>openMatch(nextMatch,"attendance"),label:"POTWIERDŹ"}]:[]),
    ...(nextOtherEvent?.important?[{id:`event-${nextOtherEvent.id}`,type:"info" as const,title:nextOtherEvent.title,detail:[datePL(nextOtherEvent.event_date),nextOtherEvent.start_time?.slice(0,5),nextOtherEvent.location].filter(Boolean).join(" · "),action:()=>setTab("calendar"),label:"KALENDARZ"}]:[]),
    ...(nextMatch?[{id:`match-${nextMatch.id}`,type:"info" as const,title:"Najbliższy mecz",detail:`${datePL(nextMatch.match_date)} · ${nextMatch.home_team===CLUB?nextMatch.away_team:nextMatch.home_team}`,action:()=>openMatch(nextMatch,"summary"),label:"MECZ"}]:[])
  ];


  const primaryPlayer = parentPlayers[0] || players.find(p => isRyszardPlayer(p)) || players[0] || null;

  const maxGoalsSingleMatch = useMemo(() => {
    if (!primaryPlayer) return 0;
    const goalsByMatch: Record<string, number> = {};
    events.filter(e => e.player_id === primaryPlayer.id && e.event_type === "goal").forEach(e => {
      goalsByMatch[e.match_id] = (goalsByMatch[e.match_id] || 0) + 1;
    });
    const values = Object.values(goalsByMatch);
    return values.length ? Math.max(...values) : 0;
  }, [primaryPlayer, events]);

  const allPlayerAchievements = useMemo(() => {
    if (!primaryPlayer) return [];
    return calculatePlayerAchievements(primaryPlayer.id, stats, trainingPlayerStats, maxGoalsSingleMatch);
  }, [primaryPlayer, stats, trainingPlayerStats, maxGoalsSingleMatch]);

  const playerRecordsList = useMemo(() => {
    if (!primaryPlayer) return [];
    const unlockedAch = allPlayerAchievements.filter(a => a.isUnlocked).length;
    return calculatePlayerRecords(primaryPlayer.id, stats, trainingPlayerStats, maxGoalsSingleMatch, 8, unlockedAch);
  }, [primaryPlayer, stats, trainingPlayerStats, maxGoalsSingleMatch, allPlayerAchievements]);

  const [autoUnlockQueue, setAutoUnlockQueue] = useState<any[]>([]);
  const [autoUnlockIndex, setAutoUnlockIndex] = useState<number>(0);

  useEffect(() => {
    if (!primaryPlayer?.id) return;
    let isCancelled = false;
    const checkUnclaimedAchievements = async () => {
      try {
        const res = await fetch(`/api/achievements/sync?playerId=${primaryPlayer.id}`);
        const data = await res.json();
        if (!isCancelled && data.success && Array.isArray(data.achievements)) {
          const unclaimed = data.achievements.filter((a: any) => a.is_unlocked && !a.claimed_reward);
          if (unclaimed.length > 0) {
            setAutoUnlockQueue(unclaimed);
            setAutoUnlockIndex(0);
          }
        }
      } catch (err) {
        console.warn("Could not check unclaimed achievements", err);
      }
    };
    checkUnclaimedAchievements();
    return () => {
      isCancelled = true;
    };
  }, [primaryPlayer?.id]);

  const handleAutoUnlockClaim = async () => {
    const current = autoUnlockQueue[autoUnlockIndex];
    if (current) {
      try {
        await fetch("/api/achievements/claim-reward", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            achievementId: current.id,
            playerId: primaryPlayer?.id || null
          })
        });
        fetchGameProfile();
      } catch (e) {
        console.error("Auto-claim error", e);
      }
    }

    if (autoUnlockIndex + 1 < autoUnlockQueue.length) {
      setAutoUnlockIndex(prev => prev + 1);
    } else {
      setAutoUnlockQueue([]);
      setAutoUnlockIndex(0);
    }
  };

  function handleGoHomeTop() {
    setTab("home");
    setActiveDrawerCategory(null);
    setSelectedMatch(null);
    setMobileMoreOpen(false);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
      document.documentElement.scrollTo({ top: 0, left: 0, behavior: "smooth" });
      document.body.scrollTo({ top: 0, left: 0, behavior: "smooth" });
      const mainEl = document.querySelector(".hub-main") || document.querySelector("main");
      if (mainEl) {
        mainEl.scrollTo({ top: 0, left: 0, behavior: "smooth" });
      }
    }
  }

  function openMatch(match:Match,initial:"summary"|"attendance"|"lineup"|"events"|"mvp"="summary",placement:"home"|"overlay"="overlay"){
    setMatchInitialTab(initial);
    setMatchPlacement(placement);
    setSelectedMatch(match);
    if(placement==="home")window.setTimeout(()=>document.getElementById("home-match-center")?.scrollIntoView({behavior:"smooth",block:"start"}),90);
  }

  async function setParentAttendance(matchId:string,playerId:string,status:"yes"|"no"|"maybe"){
    const {error}=await supabase.from("match_attendance").upsert({match_id:matchId,player_id:playerId,status,updated_by:props.profile.id},{onConflict:"match_id,player_id"});
    if(!error)setAttendance(prev=>[...prev.filter(a=>!(a.match_id===matchId&&a.player_id===playerId)),{match_id:matchId,player_id:playerId,status}]);
  }
  useEffect(() => {
    // Load cached read map
    try {
      const saved = localStorage.getItem("delta_read_news");
      if (saved) {
        const list: string[] = JSON.parse(saved);
        const map: Record<string, boolean> = {};
        list.forEach(id => { map[id] = true; });
        setReadNewsMap(map);
      }
    } catch {}

    // Sync from database for current user
    const syncDbReads = async () => {
      try {
        const res = await fetch(`/api/events/read?userId=${props.profile.id || "guest_user"}`);
        const data = await res.json();
        if (data.success && data.readIds) {
          setReadNewsMap(prev => {
            const next = { ...prev };
            data.readIds.forEach((id: string) => { next[id] = true; });
            try {
              localStorage.setItem("delta_read_news", JSON.stringify(Object.keys(next)));
            } catch {}
            return next;
          });
        }
      } catch {}
    };
    syncDbReads();
  }, [props.profile.id]);

  async function handleToggleReadNews(newsId: string) {
    const nextState = !readNewsMap[newsId];
    setReadNewsMap(prev => {
      const next = { ...prev, [newsId]: nextState };
      try {
        const readList = Object.keys(next).filter(k => next[k]);
        localStorage.setItem("delta_read_news", JSON.stringify(readList));
      } catch {}
      return next;
    });

    // Save to database
    try {
      await fetch("/api/events/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: props.profile.id || "guest_user", eventId: newsId })
      });
    } catch {}
  }

  async function handleMarkAllNewsRead() {
    const allIds = [
      ...news.map(n => n.id),
      ...clubUpdates.map(c => c.id || c.source_key),
      ...systemEvents.map(e => e.id)
    ];
    const map: Record<string, boolean> = {};
    allIds.forEach(id => { map[id] = true; });
    setReadNewsMap(map);

    try {
      localStorage.setItem("delta_read_news", JSON.stringify(allIds));
      await fetch("/api/events/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: props.profile.id || "guest_user", eventIds: allIds })
      });
    } catch {}
  }

  function openAddNewsModal() {
    setEditingNewsItem(null);
    setNewsModalOpen(true);
  }

  function openEditNewsModal(item: News) {
    setEditingNewsItem(item);
    setNewsModalOpen(true);
  }

  function handleNewsSaved(savedItem: NewsItem) {
    setNews(prev => {
      const exists = prev.some(n => n.id === savedItem.id);
      if (exists) {
        return prev.map(n => n.id === savedItem.id ? { ...n, ...savedItem } : n);
      }
      return [savedItem as News, ...prev];
    });
  }

  function handleNewsDeleted(deletedId: string) {
    setNews(prev => prev.filter(n => n.id !== deletedId));
  }
  async function enablePush(){
    if(!("serviceWorker" in navigator)||!("PushManager" in window))return alert("Push nie jest wspierany w tej przeglądarce.");
    const permission=await Notification.requestPermission();if(permission!=="granted")return;await navigator.serviceWorker.register("/sw.js");
    alert("Zgoda na powiadomienia jest aktywna.");
  }

  useEffect(()=>{setMobileMoreOpen(false);},[tab]);
  useEffect(()=>{
    if(!mobileMoreOpen)return;
    const onEscape=(event:KeyboardEvent)=>{if(event.key==="Escape")setMobileMoreOpen(false);};
    window.addEventListener("keydown",onEscape);
    return ()=>window.removeEventListener("keydown",onEscape);
  },[mobileMoreOpen]);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const isMatchToday = useMemo(() => {
    return matches.some(m => m.match_date === todayStr);
  }, [matches, todayStr]);
  const isTrainingToday = useMemo(() => {
    return trainingSessions.some(t => t.training_date === todayStr);
  }, [trainingSessions, todayStr]);
  const unreadNoticeCount = unanswered.length;

  const unifiedNewsItems = useMemo(() => {
    const list: Array<{
      id: string;
      category: "matches" | "trainings" | "club" | "sync" | "fantasy" | "achievements" | "gallery" | "multimedia" | "general";
      title: string;
      body: string;
      published_at: string;
      source_name: string;
      source_url?: string;
      importance: EventImportance;
      typeLabel: string;
      deepLinkTab?: string;
      deepLinkPayload?: any;
      originalNewsItem?: News;
    }> = [];

    const seenKeys = new Set<string>();

    // 1. Team News
    news.forEach(n => {
      const isUrgent = n.priority === "urgent" || n.type === "wazne";
      const isImportant = n.priority === "important";
      seenKeys.add(n.id);
      seenKeys.add(n.title.trim().toLowerCase());
      list.push({
        id: n.id,
        category: "general",
        title: n.title,
        body: n.body || "",
        published_at: n.published_at,
        source_name: "DELTA 2018 GM",
        importance: isUrgent ? "URGENT" : isImportant ? "IMPORTANT" : "NORMAL",
        typeLabel: n.type.toUpperCase(),
        originalNewsItem: n
      });
    });

    // 2. Club Updates (DELTA Sync)
    clubUpdates.forEach(c => {
      const isUrgent = c.priority >= 90 || /odwołan|zmiana/i.test(c.title);
      const cleanTitle = decodeHtmlEntities(c.title);
      seenKeys.add(c.source_key);
      if (c.id) seenKeys.add(c.id);
      seenKeys.add(cleanTitle.trim().toLowerCase());

      list.push({
        id: c.id || c.source_key,
        category: "club",
        title: cleanTitle,
        body: decodeHtmlEntities(c.body || ""),
        published_at: c.published_at,
        source_name: "K.S. Delta Warszawa",
        source_url: c.source_url,
        importance: isUrgent ? "IMPORTANT" : "NORMAL",
        typeLabel: "Z KLUBU"
      });
    });

    // 3. Central System Events (Filtered by deduplication against existing keys)
    systemEvents.forEach(e => {
      // Deduplicate if this system event already mirrors an existing club article or news
      if (e.related_entity_id && seenKeys.has(e.related_entity_id)) return;
      if (seenKeys.has(e.id)) return;
      if (e.type === "CLUB_NEWS" && seenKeys.has(e.title.trim().toLowerCase())) return;

      seenKeys.add(e.id);

      let category: any = "general";
      let deepLinkTab = "news";

      if (e.type.startsWith("MATCH")) {
        category = "matches";
        deepLinkTab = "matches";
      } else if (e.type.startsWith("TRAINING")) {
        category = "trainings";
        deepLinkTab = "training";
      } else if (e.type === "PLAYER_CARD_UNLOCKED") {
        category = "fantasy";
        deepLinkTab = "collection";
      } else if (e.type === "PLAYER_ACHIEVEMENT") {
        category = "achievements";
        deepLinkTab = "achievements";
      } else if (e.type === "GALLERY_CREATED") {
        category = "gallery";
        deepLinkTab = "gallery";
      } else if (e.type === "VIDEO_PUBLISHED") {
        category = "multimedia";
        deepLinkTab = "tv";
      } else if (e.type === "SYNC_ERROR") {
        category = "sync";
      }

      list.push({
        id: e.id,
        category,
        title: e.title,
        body: e.message,
        published_at: e.created_at,
        source_name: e.source,
        importance: e.importance,
        typeLabel: e.type.replace(/_/g, " "),
        deepLinkTab,
        deepLinkPayload: e.metadata
      });
    });

    return list.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
  }, [news, clubUpdates, systemEvents]);

  const unreadNewsCount = useMemo(() => {
    return unifiedNewsItems.filter(item => !readNewsMap[item.id]).length;
  }, [unifiedNewsItems, readNewsMap]);

  const filteredNewsItems = useMemo(() => {
    if (newsFilter === "all") return unifiedNewsItems;
    return unifiedNewsItems.filter(item => item.category === newsFilter);
  }, [unifiedNewsItems, newsFilter]);

  const navCategories = useMemo(() => [
    {
      id: "main",
      title: "GŁÓWNE",
      shortLabel: "Pulpit",
      subtitle: "Pulpit i centrum drużyny",
      Icon: Home,
      items: [
        { id: "home", label: "Pulpit Główny", desc: "Najbliższy mecz, frekwencja i skróty", Icon: Home },
        { id: "teamcenter", label: "Centrum Drużyny", desc: "Frekwencja i status całego zespołu", Icon: UserCheck },
        ...(props.parentPlayerIds.length ? [
          { id: "mychild", label: "Moje Dziecko", desc: "Obecności i rozwój Twojego zawodnika", Icon: UserRound, badge: "RODZIC" }
        ] : []),
      ]
    },
    {
      id: "sport",
      title: "SPORT & MECZE",
      shortLabel: "Sport",
      subtitle: "Terminarze, zbiórki i treningi",
      Icon: CalendarDays,
      items: [
        ...(canManageMatches || canEditMatchEvents ? [
          { id: "matchday", label: "Match Day", desc: "Panel meczowy na żywo (składy, minuty, gole)", Icon: Flame, badge: "LIVE" }
        ] : []),
        { id: "matches", label: "Mecze & Wyniki", desc: "Terminarz ligowy, składy i wyniki meczów", Icon: CalendarDays },
        { id: "coach-corner-modal", label: "Kącik Trenera", desc: "Wyzwania Skill Master, zadania domowe i inspiracje", Icon: Award, badge: "SKILL MASTER", isGoldTag: true, isAction: "coachcorner" },
        { id: "calendar", label: "Kalendarz", desc: "Zbiórki, wydarzenia klubowe i terminy", Icon: CalendarDays },
        { id: "training", label: "Treningi", desc: "Frekwencja, historia gierek i ranking", Icon: Zap },
        { id: "league", label: "Rozgrywki / Tabela", desc: "Tabela grupy MZPN i mecze rywali", Icon: Trophy },
      ]
    },
    {
      id: "stats",
      title: "DRUŻYNA & DANE",
      shortLabel: "Drużyna",
      subtitle: "Karty zawodników, liczby i historia",
      Icon: Users,
      items: [
        { id: "players", label: "Skład Drużyny", desc: "Profile zawodników i interaktywne karty", Icon: Users },
        { id: "stats", label: "Statystyki", desc: "Bramki, asysty, minuty i wykresy", Icon: TrendingUp },
        { id: "hall", label: "Hall of Fame", desc: "Klubowe legendy i rekordy sezonu", Icon: Medal },
        { id: "chronicle", label: "Kronika Meczowa", desc: "Historia rozegranych spotkań i podsumowania", Icon: History },
      ]
    },
    {
      id: "gaming",
      title: "STREFA ROZRYWKI",
      shortLabel: "Strefa",
      subtitle: "Karty 3D, Typer i Osiągnięcia",
      Icon: Sparkles,
      items: [
        { id: "collection", label: "Kolekcja Kart", desc: "Klaser kart 3D, sklep z paczkami i album", Icon: Sparkles, badge: "3D", isGoldTag: true },
        { id: "competition-modal", label: "Centrum Rywalizacji & Ligi", desc: "Liga kartowa, turnieje, wyzwania 1v1/3v3, draft i cele drużyny", Icon: Trophy, badge: "LIGA & ARENA", isGoldTag: true, isAction: "competition" },
        { id: "missions-modal", label: "Centrum Misji", desc: "Dziennie i tygodniowe zadania, nagrody XP i paczki", Icon: Target, badge: "MISJE", isGoldTag: true, isAction: "missions" },
        { id: "battle-arena-modal", label: "Arena Kart (1v1 & 3v3)", desc: "Pojedynki statystyk kart przeciwko rywalom CPU", Icon: Flame, badge: "PVE ARENA", isGoldTag: true, isAction: "battle" },
        { id: "trophy-cabinet-modal", label: "Gablota Trofeów & Tytuły", desc: "Puchary, medale i wybór aktywnego tytułu profilu", Icon: Award, badge: "PROFIL", isGoldTag: true, isAction: "trophies" },
        { id: "safe-trading-modal", label: "Bezpieczna Giełda Wymian", desc: "Wymieniaj duplikaty kart 1-za-1 z kolegami z zespołu", Icon: Layers, badge: "TRADE", isGoldTag: true, isAction: "trading" },
        { id: "season-pass-modal", label: "DELTA Battle Pass", desc: "Sezonowa ścieżka nagród, poziomy 1–25 i XP", Icon: Trophy, badge: "SEZON 1", isGoldTag: true, isAction: "seasonpass" },
        { id: "weekly-summary-modal", label: "Podsumowanie Tygodnia", desc: "Infografika postępów, zdobyte XP i obecności", Icon: Award, badge: "RAPORT", isGoldTag: true, isAction: "weeklysummary" },
        { id: "typer-modal", label: "Klubowy Typer", desc: "Typuj wyniki spotkań i wygrywaj Delta Points", Icon: Crown, badge: "NOWOŚĆ", isGoldTag: true, isAction: "typer" },
        { id: "achievements-modal", label: "Osiągnięcia i Misje", desc: "30 misji, poziomy i nagrody w paczkach", Icon: Trophy, badge: "30 MISJI", isGoldTag: true, isAction: "achievements" },
      ]
    },
    {
      id: "club",
      title: "KLUB & MEDIA",
      shortLabel: "Klub",
      subtitle: "Aktualności i oficjalne komunikaty",
      Icon: Shield,
      items: [
        { id: "social-feed-modal", label: "Feed Drużyny (Tablica)", desc: "Oficjalne ogłoszenia, wyróżnienia i pozytywny doping", Icon: MessageSquare, badge: "SPOŁECZNOŚĆ", isGoldTag: true, isAction: "socialfeed" },
        { id: "photobooth-modal", label: "Foto-Budka DELTA", desc: "Twórz profesjonalne grafiki i relacje Instagram / WhatsApp", Icon: Camera, badge: "HD STUDIO", isGoldTag: true, isAction: "photobooth" },
        { id: "birthday-modal", label: "Strefa Urodzin", desc: "Świętujemy urodziny zawodników, życzenia i prezenty", Icon: Cake, badge: "ŚWIĘTUJEMY", isGoldTag: true, isAction: "birthday" },
        { id: "news", label: "Aktualności", desc: "Wiadomości z życia drużyny i ogłoszenia", Icon: Newspaper },
        { id: "club", label: "Z Klubu", desc: "Oficjalny feed ze strony głównej DELTA", Icon: Shield },
      ]
    },
  ], [props.parentPlayerIds, canManageMatches, canEditMatchEvents]);

  const activeCategory = useMemo(() => {
    if (["home", "teamcenter", "mychild"].includes(tab)) return "main";
    if (["matchday", "matches", "calendar", "training", "league"].includes(tab)) return "sport";
    if (["players", "stats", "hall", "chronicle"].includes(tab)) return "stats";
    if (["collection", "achievements"].includes(tab)) return "gaming";
    if (["news", "club"].includes(tab)) return "club";
    return "main";
  }, [tab]);

  const openCategoryData = navCategories.find(c => c.id === activeDrawerCategory) || null;

  return <div className="hub v8-hub v101-stadium-hub v104-hub">
    <StadiumFX
      intro
      cinematicIntro={cinematicActive}
      onCloseCinematic={() => setCinematicActive(false)}
    />
    {viewFx&&<div className="v101-cinematic-veil" aria-hidden="true"><span className="v101-cinematic-smoke"/><span className="v101-cinematic-flare"/></div>}

    {/* DESKTOP ICON RAIL DOCK (Modern Sidebar 2.0) */}
    <aside className="v200-rail-container" aria-label="Nawigacja główna">
      <button
        type="button"
        className="v200-rail-brand"
        onClick={handleGoHomeTop}
        title="Przejdź na stronę główną"
        aria-label="DELTA 2018 GM - Start"
      >
        <img src="/teamlogos/gm.png" alt="DELTA GM" />
        <span>GM</span>
      </button>

      <nav className="v200-rail-nav">
        {navCategories.map(cat => {
          const isCatActive = activeCategory === cat.id;
          const isCatOpen = activeDrawerCategory === cat.id;
          const CatIcon = cat.Icon;

          return (
            <button
              key={cat.id}
              type="button"
              className={`v200-rail-btn ${isCatActive ? "active" : ""} ${isCatOpen ? "open" : ""}`}
              onClick={() => {
                setActiveDrawerCategory(prev => prev === cat.id ? null : cat.id);
              }}
              title={`${cat.title} - ${cat.subtitle}`}
              aria-label={cat.title}
              aria-expanded={isCatOpen}
            >
              <CatIcon size={20} />
              <span className="v200-rail-label">{cat.shortLabel}</span>
              {cat.id === "main" && unanswered.length > 0 && (
                <span className="v200-rail-badge">{unanswered.length}</span>
              )}
              {cat.id === "sport" && (isMatchToday || isTrainingToday) && (
                <span className="v200-rail-badge" style={{ background: "#f6c952", color: "#000" }}>●</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="v200-rail-footer">
        <button
          type="button"
          className="v200-rail-devil-btn"
          onClick={() => setCinematicActive(true)}
          title="Odtwórz filmowe intro stadionowe"
          aria-label="Odtwórz filmowe intro"
        >
          <Flame size={18} />
          <span>INTRO</span>
        </button>
      </div>
    </aside>

    {/* FLYOUT DRAWER & BACKDROP */}
    {openCategoryData && (
      <>
        <div
          className="v200-drawer-backdrop"
          onClick={() => setActiveDrawerCategory(null)}
          aria-hidden="true"
        />
        <div
          className="v200-rail-drawer"
          role="region"
          aria-label={`Menu: ${openCategoryData.title}`}
        >
          <div className="v200-drawer-header">
            <div className="v200-drawer-header-left">
              <span className="v200-drawer-category-badge">{openCategoryData.title}</span>
              <span className="v200-drawer-title">{openCategoryData.subtitle}</span>
            </div>
            <button
              type="button"
              className="v200-drawer-close-btn"
              onClick={() => setActiveDrawerCategory(null)}
              aria-label="Zamknij menu"
            >
              <X size={15} />
            </button>
          </div>

          <div className="v200-drawer-items-list">
            {openCategoryData.items.map(item => {
              const ItemIcon = item.Icon;
              const isItemActive = tab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  className={`v200-drawer-card-btn ${isItemActive ? "active" : ""}`}
                  onClick={() => {
                    if ((item as any).isAction === "competition") {
                      setCompetitionHubOpen(true);
                      setActiveDrawerCategory(null);
                    } else if ((item as any).isAction === "trophies") {
                      setTrophyCabinetOpen(true);
                      setActiveDrawerCategory(null);
                    } else if ((item as any).isAction === "trading") {
                      setSafeTradingOpen(true);
                      setActiveDrawerCategory(null);
                    } else if ((item as any).isAction === "socialfeed") {
                      setSocialFeedOpen(true);
                      setActiveDrawerCategory(null);
                    } else if ((item as any).isAction === "missions") {
                      setMissionsModalOpen(true);
                      setActiveDrawerCategory(null);
                    } else if ((item as any).isAction === "battle") {
                      setBattleArenaModalOpen(true);
                      setActiveDrawerCategory(null);
                    } else if ((item as any).isAction === "weeklysummary") {
                      setWeeklySummaryModalOpen(true);
                      setActiveDrawerCategory(null);
                    } else if ((item as any).isAction === "typer") {
                      setTyperModalOpen(true);
                      setActiveDrawerCategory(null);
                    } else if ((item as any).isAction === "achievements") {
                      setAchievementsModalOpen(true);
                      setActiveDrawerCategory(null);
                    } else if ((item as any).isAction === "seasonpass") {
                      setSeasonPassModalOpen(true);
                      setActiveDrawerCategory(null);
                    } else if ((item as any).isAction === "photobooth") {
                      setPhotoBoothModalOpen(true);
                      setActiveDrawerCategory(null);
                    } else if ((item as any).isAction === "birthday") {
                      setBirthdayModalOpen(true);
                      setActiveDrawerCategory(null);
                    } else if ((item as any).isAction === "coachcorner") {
                      setCoachCornerModalOpen(true);
                      setActiveDrawerCategory(null);
                    } else {
                      setTab(item.id as any);
                      setActiveDrawerCategory(null);
                    }
                  }}
                >
                  <div className="v200-drawer-card-icon">
                    <ItemIcon size={18} />
                  </div>
                  <div className="v200-drawer-card-body">
                    <div className="v200-drawer-card-title-row">
                      <span className="v200-drawer-card-title">{item.label}</span>
                      {item.badge && (
                        <span className={`v200-drawer-card-tag ${(item as any).isGoldTag ? "gold" : ""}`}>
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <span className="v200-drawer-card-desc">{item.desc}</span>
                  </div>
                  <ChevronRight size={14} className="v200-drawer-card-chevron" />
                </button>
              );
            })}
          </div>
        </div>
      </>
    )}

    <header className="hub-top v8-topbar">
      <button className="v8-mini-brand v101-home-logo-btn" onClick={handleGoHomeTop} aria-label="Przejdź na stronę główną"><img src="/teamlogos/gm.png" alt="DELTA 2018 GM"/><div><b>DELTA 2018 GM</b><span>Górny Mokotów</span></div></button>
      
      {/* Central XP & Level Pill */}
      {gameProfile && (
        <div 
          className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/80 border border-amber-500/30 text-xs shadow-inner cursor-pointer hover:border-amber-500/60 transition-all"
          onClick={() => setWeeklySummaryModalOpen(true)}
          title="Kliknij, aby otworzyć Podsumowanie Tygodnia"
        >
          <span className="font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
            POZ. {gameProfile.levelInfo?.level || 1}
          </span>
          <div className="flex flex-col">
            <div className="flex items-center justify-between gap-2 text-[10px] text-slate-300 font-bold">
              <span>{gameProfile.levelInfo?.title || 'Zawodnik DELTA'}</span>
              <span className="text-amber-400">{gameProfile.levelInfo?.currentLevelXP || 0}/{gameProfile.levelInfo?.nextLevelXP || 100} XP</span>
            </div>
            <div className="w-24 h-1.5 bg-slate-950 rounded-full overflow-hidden border border-white/5">
              <div 
                className="h-full bg-gradient-to-r from-amber-400 to-red-500 rounded-full transition-all duration-500" 
                style={{ width: `${gameProfile.levelInfo?.progressPercent || 0}%` }}
              />
            </div>
          </div>
          {gameProfile.activityStreak > 0 && (
            <span className="flex items-center gap-0.5 text-xs font-black text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20 ml-1">
              <Flame size={12} className="text-red-500" /> {gameProfile.activityStreak}d
            </span>
          )}
        </div>
      )}

      <div className="v8-top-spacer"/>

      {/* Quick Game Buttons */}
      <button
        type="button"
        className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-red-500/20 border border-amber-500/30 text-amber-300 font-bold text-xs uppercase tracking-wider hover:border-amber-400 transition-all"
        onClick={() => setMissionsModalOpen(true)}
        title="Centrum Misji Dziennych i Tygodniowych"
      >
        <Target size={14} /> <span>MISJE</span>
      </button>

      <button
        type="button"
        className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-red-600/20 to-amber-600/20 border border-red-500/30 text-red-300 font-bold text-xs uppercase tracking-wider hover:border-red-400 transition-all"
        onClick={() => setBattleArenaModalOpen(true)}
        title="Arena Pojedynków Kart PvE"
      >
        <Flame size={14} /> <span>ARENA</span>
      </button>

      <button
        type="button"
        className="v101-hub-intro-btn"
        onClick={() => setCinematicActive(true)}
        title="Odtwórz filmowe intro stadionowe"
        aria-label="Odtwórz filmowe intro stadionowe"
      >
        <Flame size={15}/> <span>ZOBACZ INTRO</span>
      </button>
      {canOpenAdmin&&<a href="/admin" className="admin-link v8-admin-chip">{staff?"ADMIN":"POMOCNIK"}</a>}
      {canOpenAdmin&&<a href="/admin?tab=training" className="v105-mobile-training-shortcut" aria-label="Panel administratora: dodaj trening"><CalendarDays size={16}/> DODAJ TRENING</a>}
      
      {/* Notification Center Trigger */}
      <button 
        className="icon-btn v8-bell relative" 
        onClick={() => setNotificationsModalOpen(true)} 
        aria-label="Centrum powiadomień"
        title="Centrum powiadomień i nagród"
      >
        <Bell size={18}/>
        {gameProfile && gameProfile.unreadNotifications > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white font-black text-[9px] flex items-center justify-center border border-slate-900 shadow-sm">
            {gameProfile.unreadNotifications}
          </span>
        )}
      </button>

      <div className="v8-account-wrap">
        <button className="v8-account-btn" onClick={()=>setAccountOpen(v=>!v)} aria-label="Konto użytkownika"><UserRound size={17}/></button>
        {accountOpen&&<div className="v8-account-popover space-y-2">
          <div>
            <small>KONTO</small>
            <b>{props.profile.display_name||"Użytkownik"}</b>
            <span>{props.profile.role}</span>
          </div>
          <div className="border-t border-white/10 pt-2 space-y-1">
            {canOpenAdmin && (
              <a
                href="/admin"
                className="w-full text-left text-xs font-bold text-amber-400 hover:text-amber-300 py-1 flex items-center gap-1.5 transition-colors"
              >
                <Shield size={13} /> Panel administratora ({staff ? "ADMIN" : "POMOCNIK"})
              </a>
            )}
            <button
              onClick={() => { setAccountOpen(false); setNotifPrefsModalOpen(true); }}
              className="w-full text-left text-xs font-bold text-slate-300 hover:text-amber-400 py-1 transition-colors"
            >
              🔔 Preferencje powiadomień
            </button>
            <button
              onClick={() => { setAccountOpen(false); setChangelogModalOpen(true); }}
              className="w-full text-left text-xs font-bold text-slate-300 hover:text-amber-400 py-1 transition-colors"
            >
              🚀 Co nowego? (v1.8.0)
            </button>
          </div>
        </div>}
      </div>
      <button className="icon-btn v8-bell v151-notice-trigger" onClick={()=>setNoticesOpen(v=>!v)} aria-label="Komunikaty drużyny" aria-expanded={noticesOpen}><History size={18}/>{unanswered.length>0&&<i aria-hidden="true"/>}</button>
    </header>

    {noticesOpen&&<div className="v151-notices" role="region" aria-label="Komunikaty drużyny"><header><b>KOMUNIKATY DRUŻYNY</b><button onClick={()=>setNoticesOpen(false)} aria-label="Zamknij komunikaty"><X size={17}/></button></header><p>Aktualne sprawy na podstawie kalendarza i potwierdzeń. To nie są powiadomienia push.</p>{teamNotices.length?teamNotices.map(item=><button key={item.id} onClick={()=>{setNoticesOpen(false);item.action();}}><span className={item.type}><Bell size={15}/></span><span><b>{item.title}</b><small>{item.detail}</small><em>{item.label} →</em></span></button>):<div className="v151-notice-empty">Brak spraw wymagających uwagi.</div>}</div>}
    <main className={`hub-main v8-main ${viewFx?"v101-view-enter":""}`}>
      {/* IN-APP LIVE ALERTS (TOASTS / IMPORTANT BANNERS) */}
      <DeltaLiveAlertBanner
        events={systemEvents}
        onDismiss={(id) => {
          setSystemEvents(prev => prev.filter(e => e.id !== id));
        }}
        onNavigate={(targetTab, extra) => {
          setTab(targetTab as any);
        }}
      />

      {/* URGENT EVENT MODAL (CRITICAL MATCH/TRAINING NOTICES) */}
      <DeltaUrgentEventModal
        event={activeUrgentEvent}
        onClose={() => {
          if (activeUrgentEvent) {
            localStorage.setItem(`delta_urgent_dismissed_${activeUrgentEvent.id}`, "true");
          }
          setActiveUrgentEvent(null);
        }}
        onAction={(event) => {
          if (event.type.startsWith("MATCH")) {
            setTab("matches");
          } else if (event.type.startsWith("TRAINING")) {
            setTab("training");
          } else {
            setTab("news");
          }
        }}
      />

      <DeltaLiveBar
        matches={matches}
        trainingSessions={trainingSessions}
        news={news}
        unansweredNotices={unanswered}
        hasPublishedLineup={lineup.some(l => l.match_id === nextMatch?.id)}
        latestLineupMatch={nextMatch}
        onNavigate={(targetTab, extra) => {
          if (targetTab === "match_modal" && extra) {
            setSelectedMatch(extra);
            setMatchPlacement("overlay");
          } else if (targetTab === "matches") {
            setTab("matches");
            if (extra) {
              setSelectedMatch(extra);
              setMatchPlacement("overlay");
            }
          } else if (targetTab === "news") {
            setTab("news");
          } else if (targetTab === "training") {
            setTab("training");
          } else if (targetTab === "achievements") {
            setTab("achievements");
          } else if (targetTab === "collection") {
            setTab("collection");
          } else if (targetTab === "players") {
            setTab("players");
          } else if (targetTab === "teamcenter") {
            setTab("teamcenter");
          } else if (targetTab === "typer") {
            setTyperModalOpen(true);
          } else if (targetTab === "game") {
            window.location.href = "/game";
          } else if (targetTab === "gallery") {
            setPhotoBoothModalOpen(true);
          } else if (targetTab === "tv") {
            setSocialFeedOpen(true);
          } else if (targetTab === "chronicle") {
            setTab("chronicle");
          } else if (targetTab === "hall") {
            setTab("hall");
          } else if (targetTab === "settings") {
            setNotifPrefsModalOpen(true);
          } else if (targetTab === "knowledge") {
            setKnowledgeModalOpen(true);
          } else {
            setTab(targetTab as any);
          }
        }}
      />
      {tab==="teamcenter"&&<section className="section v151-team-center animate-fadeIn">
        <header className="v151-team-hero devil-card">
          <div className="v151-team-hero-bg" />
          <div className="v151-team-hero-content">
            <span className="eyebrow gold">DELTA 2018 GM · GÓRNY MOKOTÓW</span>
            <h1>CENTRUM <em>DRUŻYNY</em></h1>
            <p>Główny pulpit zespołu: najbliższy mecz, ostatnie wyniki, bilans sezonu i szybkie skróty.</p>
          </div>
        </header>

        {/* 1. NADCHODZĄCY MECZ & OSTATNI WYNIK */}
        <div className="v200-teamcenter-match-duo">
          {/* A. NAJBLIŻSZY MECZ */}
          {nextMatch ? (
            <SpotlightCard className="v200-teamcenter-card next-match devil-card" glowColor="gold" enableTilt={true}>
              <div className="v8-section-label">
                <span className="v200-live-pill-badge"><CalendarDays size={13}/> NAJBLIŻSZY MECZ</span>
                <span className="text-yellow-400 text-xs font-bold">Kolejka {nextMatch.round_no || "—"}</span>
              </div>
              <div className="v200-tc-match-teams">
                <div className="v200-tc-team">
                  <Logo team={nextMatch.home_team} size={48} />
                  <b>{formatTeamName(nextMatch.home_team)}</b>
                  <small>GOSPODARZ</small>
                </div>
                <div className="v200-tc-vs">
                  <strong>VS</strong>
                  <span>{datePL(nextMatch.match_date)}</span>
                  <small>{(nextMatch.match_time || "").slice(0, 5) || "Godz. do ustalenia"}</small>
                </div>
                <div className="v200-tc-team">
                  <Logo team={nextMatch.away_team} size={48} />
                  <b>{formatTeamName(nextMatch.away_team)}</b>
                  <small>GOŚĆ</small>
                </div>
              </div>
              <div className="v200-tc-match-footer">
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <UserCheck size={14} className="text-amber-400" /> Potwierdzeni: <b>{nextPresent}/{players.length}</b>
                </span>
                <button
                  type="button"
                  className="v200-tc-action-btn gold"
                  onClick={() => openMatch(nextMatch, "summary")}
                >
                  CENTRUM MECZU <ChevronRight size={14}/>
                </button>
              </div>
            </SpotlightCard>
          ) : (
            <div className="v200-teamcenter-card next-match devil-card empty">
              <CalendarDays size={32} className="text-slate-500 mb-2"/>
              <h3>Brak zaplanowanych meczów</h3>
              <p>Szczegóły kolejnych spotkań pojawią się w kalendarzu.</p>
              <button type="button" className="v200-tc-action-btn" onClick={() => setTab("calendar")}>
                OTWÓRZ KALENDARZ <ChevronRight size={14}/>
              </button>
            </div>
          )}

          {/* B. OSTATNI WYNIK */}
          {latestPlayed ? (
            <SpotlightCard className="v200-teamcenter-card last-match devil-card" glowColor="red" enableTilt={true}>
              <div className="v8-section-label">
                <span className="v200-live-pill-badge red"><History size={13}/> OSTATNI ROZEGRANY MECZ</span>
                <span className={`v200-tc-badge-result ${recentResult(latestPlayed).toLowerCase()}`}>
                  {recentResult(latestPlayed)}
                </span>
              </div>
              <div className="v200-tc-match-teams">
                <div className="v200-tc-team">
                  <Logo team={latestPlayed.home_team} size={48} />
                  <b>{formatTeamName(latestPlayed.home_team)}</b>
                  <strong className="v200-tc-score">{latestPlayed.home_score ?? "–"}</strong>
                </div>
                <div className="v200-tc-vs score-colon">
                  <span>:</span>
                  <small>{datePL(latestPlayed.match_date)}</small>
                </div>
                <div className="v200-tc-team">
                  <Logo team={latestPlayed.away_team} size={48} />
                  <b>{formatTeamName(latestPlayed.away_team)}</b>
                  <strong className="v200-tc-score">{latestPlayed.away_score ?? "–"}</strong>
                </div>
              </div>
              <div className="v200-tc-match-footer">
                <span className="text-xs text-slate-400">
                  Kolejka {latestPlayed.round_no || "—"} • {latestPlayed.venue || "Mecz ligowy"}
                </span>
                <button
                  type="button"
                  className="v200-tc-action-btn"
                  onClick={() => openMatch(latestPlayed, "summary")}
                >
                  SZCZEGÓŁY & STATS <ChevronRight size={14}/>
                </button>
              </div>
            </SpotlightCard>
          ) : (
            <div className="v200-teamcenter-card last-match devil-card empty">
              <History size={32} className="text-slate-500 mb-2"/>
              <h3>Brak rozegranych meczów</h3>
              <p>Historia wyników uaktualni się po pierwszym rozegranym spotkaniu.</p>
              <button type="button" className="v200-tc-action-btn" onClick={() => setTab("matches")}>
                TERMINARZ <ChevronRight size={14}/>
              </button>
            </div>
          )}
        </div>

        {/* 2. BILANS, FORMA I FREKWENCJA */}
        <div className="v200-tc-stats-grid">
          {/* BILANS SEZONU */}
          <article className="v200-tc-stats-box devil-card">
            <div className="v8-panel-title"><Trophy size={18}/> BILANS SEZONU</div>
            <div className="v200-tc-kpis">
              <div className="v200-tc-kpi">
                <strong>{teamSummary.played}</strong>
                <span>MECZE</span>
              </div>
              <div className="v200-tc-kpi gold">
                <strong>{teamSummary.wins}</strong>
                <span>WYGRANE</span>
              </div>
              <div className="v200-tc-kpi">
                <strong>{teamSummary.draws}</strong>
                <span>REMISY</span>
              </div>
              <div className="v200-tc-kpi">
                <strong>{teamSummary.losses}</strong>
                <span>PORAŻKI</span>
              </div>
              <div className="v200-tc-kpi red">
                <strong>{teamSummary.goals}</strong>
                <span>GOLE</span>
              </div>
            </div>
            <div className="v200-tc-form-row">
              <small>Ostatnia forma:</small>
              <div className="v871-team-form-dots">
                {recentMatches.slice(0, 5).map(m => (
                  <i key={m.id} className={`form-${recentResult(m).toLowerCase()}`}>
                    {recentResult(m)}
                  </i>
                ))}
                {recentMatches.length === 0 && <span className="text-xs text-slate-500">Brak danych</span>}
              </div>
            </div>
          </article>

          {/* FREKWENCJA TRENINGOWA I GRY */}
          <article className="v200-tc-stats-box devil-card">
            <div className="v8-panel-title"><Users size={18}/> FREKWENCJA I TRENINGI</div>
            <div className="v200-tc-kpis">
              <div className="v200-tc-kpi gold">
                <strong>{trainingSessions.length}</strong>
                <span>TRENINGÓW</span>
              </div>
              <div className="v200-tc-kpi">
                <strong>{avgTrainingAttendance.toFixed(1)}</strong>
                <span>ŚR. OBECNYCH</span>
              </div>
              <div className="v200-tc-kpi">
                <strong>{trainingGames.length}</strong>
                <span>GIERKI</span>
              </div>
              <div className="v200-tc-kpi red">
                <strong>{trainingEvents.filter(e => e.event_type === "goal").length}</strong>
                <span>GOLE TRN.</span>
              </div>
            </div>
            <div className="v200-tc-box-footer">
              <button type="button" className="v200-tc-link-btn" onClick={() => setTab("training")}>
                CENTRUM TRENINGOWE <ChevronRight size={14}/>
              </button>
            </div>
          </article>

          {/* MOJE SPRAWY / STREFA RODZICA */}
          <article className="v200-tc-stats-box devil-card">
            <div className="v8-panel-title"><UserCheck size={18}/> MOJE SPRAWY (RODZIC)</div>
            {parentPlayers.length > 0 ? (
              nextMatch ? (
                <div className="v200-tc-parent-box">
                  <small className="text-amber-400 font-bold">NAJBLIŻSZY MECZ · {datePL(nextMatch.match_date)}</small>
                  {ownMatchResponses.map(x => (
                    <div className="v151-rsvp-row" key={x.player.id}>
                      <b>{x.player.display_name}</b>
                      <span className={x.status === "yes" ? "ok" : x.status === "no" ? "no" : "pending"}>
                        {x.status === "yes" ? "✓ Obecność potwierdzona" : x.status === "no" ? "✕ Nieobecny" : x.status === "maybe" ? "Do potwierdzenia" : "Brak odpowiedzi"}
                      </span>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="v200-tc-action-btn gold mt-2"
                    onClick={() => openMatch(nextMatch, "attendance")}
                  >
                    POTWIERDŹ OBECNOŚĆ <ChevronRight size={14}/>
                  </button>
                </div>
              ) : (
                <div className="v200-tc-parent-box">
                  <p className="text-sm text-slate-400">Brak meczu wymagającego potwierdzenia obecności.</p>
                  <button type="button" className="v200-tc-link-btn mt-2" onClick={() => setTab("calendar")}>
                    OTWÓRZ KALENDARZ <ChevronRight size={14}/>
                  </button>
                </div>
              )
            ) : (
              <div className="v200-tc-parent-box">
                <p className="text-sm text-slate-400">Jesteś zalogowany jako kibic / sztab. Powiąż profil dziecka w ustawieniach, aby zgłaszać obecności.</p>
                <button type="button" className="v200-tc-link-btn mt-2" onClick={() => setTab("players")}>
                  KADRA ZESPOŁU <ChevronRight size={14}/>
                </button>
              </div>
            )}
          </article>
        </div>

        {/* 3. SZYBKIE SKRÓTY DO GŁÓWNYCH MODUŁÓW */}
        <div className="v200-tc-shortcuts">
          <div className="v8-section-label">
            <span className="eyebrow gold">SZYBKIE SKRÓTY</span>
          </div>
          <div className="v200-tc-shortcuts-grid">
            <button type="button" className="v200-tc-shortcut-tile" onClick={() => setTab("collection")}>
              <Sparkles size={22} className="text-amber-400" />
              <div>
                <strong>Kolekcja Kart 3D</strong>
                <small>Karty, paczki i album</small>
              </div>
            </button>
            <button type="button" className="v200-tc-shortcut-tile" onClick={() => setTab("stats")}>
              <TrendingUp size={22} className="text-red-400" />
              <div>
                <strong>Statystyki & Rankingi</strong>
                <small>G+A, strzelcy, asysty</small>
              </div>
            </button>
            <button type="button" className="v200-tc-shortcut-tile" onClick={() => setTab("hall")}>
              <Trophy size={22} className="text-yellow-400" />
              <div>
                <strong>Hall of Fame</strong>
                <small>Gablota chwały i rekordy</small>
              </div>
            </button>
            <button type="button" className="v200-tc-shortcut-tile" onClick={() => setKnowledgeModalOpen(true)}>
              <BookOpen size={22} className="text-blue-400" />
              <div>
                <strong>Kącik Wiedzy</strong>
                <small>Quizy, taktyka i zasady</small>
              </div>
            </button>
            <button type="button" className="v200-tc-shortcut-tile" onClick={() => setBirthdayModalOpen(true)}>
              <Cake size={22} className="text-pink-400" />
              <div>
                <strong>Strefa Urodzin</strong>
                <small>Kalendarz i życzenia</small>
              </div>
            </button>
            <button type="button" className="v200-tc-shortcut-tile" onClick={() => setTyperModalOpen(true)}>
              <Target size={22} className="text-emerald-400" />
              <div>
                <strong>Typer DELTA</strong>
                <small>Typuj mecze i zbieraj DP</small>
              </div>
            </button>
          </div>
        </div>
      </section>}
      {tab==="home"&&<>
        <section className="v8-hero v82-hero-clean v101-logged-hero" aria-label="DELTA 2018 GM — Górny Mokotów">
          <div className="v82-hero-vignette"/>
          <img className="v106-logged-players" src="/assets/hero-team-v105.png" alt="Zawodnicy DELTA 2018 GM"/>
          <div className="v104-logged-hero-copy">
            <span>RAZEM DO WIELKICH RZECZY</span>
            <h1>DELTA 2018 GM</h1>
            <p>GÓRNY MOKOTÓW • OFICJALNY PANEL DRUŻYNY</p>
            <div style={{ marginTop: 12 }}>
              <button
                type="button"
                className="v101-hero-intro-btn"
                onClick={() => setCinematicActive(true)}
                title="Odtwórz filmowe intro stadionowe"
              >
                <Flame size={14}/> ZOBACZ INTRO
              </button>
            </div>
          </div>
          <div className="v101-hero-club-identity" onClick={() => setCinematicActive(true)} role="button" title="Odtwórz filmowe intro stadionowe" style={{ cursor: "pointer" }}>
            <div className="v101-hero-crest-wrap">
              <span className="v101-hero-crest-fire"/>
              <img src="/teamlogos/gm.png" alt="K.S. Delta Warszawa"/>
            </div>
            <div className="v101-hero-identity-copy">
              <span>K.S. DELTA WARSZAWA</span>
              <strong>GÓRNY MOKOTÓW</strong>
              <b>2018</b>
            </div>
          </div>
        </section>

        {nextMatch&&<><section className="v105-home-command-grid">
          <SpotlightCard className="v8-match-card devil-card v101-logged-match v200-match-hero" glowColor="gold" enableTilt={true}>
            <div className="v8-section-label">
              <span className="v200-live-pill-badge"><CalendarDays size={13}/> NAJBLIŻSZY MECZ</span>
              <span style={{ color: "#f6c952", fontWeight: 900, fontSize: "11px" }}>Kolejka {nextMatch.round_no||"—"}</span>
            </div>
            <div className="v8-match-stage">
              <div className="v8-team">
                <Logo team={nextMatch.home_team} size={155}/>
                <b>{formatTeamName(nextMatch.home_team)}</b>
                <small>GOSPODARZ</small>
              </div>
              <div className="v8-vs">
                <strong>VS</strong>
                <span>{datePL(nextMatch.match_date)} • {(nextMatch.match_time||"").slice(0, 5)||"—"}</span>
                <small>{nextMatch.venue||"Miejsce do ustalenia"}</small>
              </div>
              <div className="v8-team">
                <Logo team={nextMatch.away_team} size={155}/>
                <b>{formatTeamName(nextMatch.away_team)}</b>
                <small>GOŚĆ</small>
              </div>
            </div>

            <div className="v891-match-tools">
              <div className="v891-match-clock">
                <span>DO MECZU</span>
                <b>{nextMatchCountdown}</b>
                <small>{datePL(nextMatch.match_date)} • {(nextMatch.match_time||"").slice(0, 5)||"godzina do ustalenia"}</small>
              </div>

              <button type="button" className="v891-attendance-mini" onClick={()=>openMatch(nextMatch,"attendance","home")}>
                <span><UserCheck size={16}/> OBECNOŚĆ</span>
                <strong>{nextPresent}<em>/ {players.length}</em></strong>
                <div className="v891-attendance-progress"><i style={{width:`${players.length?Math.min(100,nextPresent/players.length*100):0}%`}}/></div>
                <small>{staff?"Zobacz obecności i skład":"Potwierdź udział dziecka"} <ChevronRight size={12}/></small>
              </button>
            </div>

            <button className="v8-red-cta" onClick={()=>openMatch(nextMatch,"summary","home")}>CENTRUM MECZU <ChevronRight size={17}/></button>
          </SpotlightCard>
          {(nextTeamEvent||importantTeamEvent)&&<div className="v105-command-side">
          {nextTeamEvent&&<article className={`v891-team-clock devil-card event-${nextTeamEvent.kind||"other"}`} onClick={()=>setTab("calendar")}>
            <div className="v891-clock-icon"><CalendarDays size={22}/></div>
            <div className="v891-clock-copy">
              <span>PLAN TYGODNIA</span>
              <h3>{nextTeamEvent.title}</h3>
              <p>{nextTeamEvent.subtitle}</p>
            </div>
            <div className="v891-clock-time">
              <small>DO WYDARZENIA</small>
              <b>{teamClockCountdown}</b>
            </div>
            <ChevronRight size={18}/>
          </article>}

          {importantTeamEvent&&<article className="v891-important-note devil-card has-event" onClick={()=>setTab("calendar")}>
            <div className="v8-panel-title"><Bell size={16}/> WAŻNE</div>
            <>
              <b>{importantTeamEvent.title}</b>
              <span>{[importantTeamEvent.event_date,importantTeamEvent.start_time?.slice(0,5),importantTeamEvent.location].filter(Boolean).join(" • ")}</span>
              {importantTeamEvent.details&&<p>{importantTeamEvent.details}</p>}
            </>
          </article>}
          </div>}
        </section>
        {selectedMatch&&matchPlacement==="home"&&<div id="home-match-center" className="v110-home-match-center"><MatchCenterModal
          embedded match={selectedMatch} players={players} attendance={attendance} lineup={lineup} events={events}
          currentUserId={props.profile.id} currentUserRole={props.profile.role} canManageMatch={canManageMatches} canEditEvents={canEditMatchEvents}
          parentPlayerIds={props.parentPlayerIds} initialTab={matchInitialTab} onClose={()=>setSelectedMatch(null)}
          onDataChange={(d)=>{if(d.match){setMatches(prev=>prev.map(m=>m.id===d.match!.id?d.match!:m));setSelectedMatch(d.match);}if(d.attendance)setAttendance(d.attendance);if(d.lineup)setLineup(d.lineup);if(d.events)setEvents(d.events);}}
        /></div>}
        </>}

        <section className="v8-stats-row">
          {[
            { label: "MECZE", val: teamSummary.played, Icon: Target, glow: "gold", note: "Rozegrane" },
            { label: "WYGRANE", val: teamSummary.wins, Icon: Trophy, glow: "emerald", note: "Zwycięstwa" },
            { label: "REMISY", val: teamSummary.draws, Icon: Shield, glow: "blue", note: "Podział pkt" },
            { label: "PORAŻKI", val: teamSummary.losses, Icon: X, glow: "red", note: "Przegrane" },
            { label: "BRAMKI", val: teamSummary.goals, Icon: Goal, glow: "gold", note: `${teamSummary.goals > 0 && teamSummary.played > 0 ? (teamSummary.goals / teamSummary.played).toFixed(1) : "0"} / mecz` },
            { label: "ASYSTY", val: teamSummary.assists, Icon: Star, glow: "gold", note: "Kluczowe podania" }
          ].map((item) => (
            <SpotlightCard className={`v200-stat-card ${item.glow}`} glowColor={item.glow as any} enableTilt={true} key={item.label}>
              <div className="v200-stat-head">
                <span className="v200-stat-label">{item.label}</span>
                <div className="v200-stat-icon-wrap">
                  <item.Icon size={16}/>
                </div>
              </div>
              <div className="v200-stat-body">
                <b className="v200-stat-val">{item.val}</b>
                <span className="v200-stat-note">{item.note}</span>
              </div>
            </SpotlightCard>
          ))}
        </section>

        <div className="v200-home-duo-grid">
          <SpotlightCard className="v200-feature-banner team-center" glowColor="red" enableTilt={true} onClick={()=>setTab("teamcenter")}>
            <div className="v200-feature-avatar red">
              <UserCheck size={26}/>
            </div>
            <div className="v200-feature-content">
              <div className="v200-feature-badge red">
                <span>STREFA DRUŻYNY</span>
              </div>
              <h3>CENTRUM DRUŻYNY</h3>
              <p>Frekwencja na treningach, status powołań oraz sprawy zespołu</p>
            </div>
            <div className="v200-feature-cta red">
              <span>OTWÓRZ</span>
              <ChevronRight size={18}/>
            </div>
          </SpotlightCard>

          <SpotlightCard className="v200-feature-banner typer-vip" glowColor="gold" enableTilt={true} onClick={()=>setTyperModalOpen(true)}>
            <div className="v200-feature-avatar gold">
              <Crown size={26}/>
            </div>
            <div className="v200-feature-content">
              <div className="v200-feature-badge gold">
                <Flame size={12}/>
                <span>ZGARNIAJ PUNKTY DP</span>
              </div>
              <h3>KLUBOWY TYPER MECZOWY</h3>
              <p>Typuj dokładny wynik meczu, zdobywaj punkty i otwieraj paczki kart!</p>
            </div>
            <div className="v200-feature-cta gold">
              <span>ZATYPUJ</span>
              <ChevronRight size={18}/>
            </div>
          </SpotlightCard>

          <SpotlightCard className="v200-feature-banner knowledge-academy" glowColor="gold" enableTilt={true} onClick={()=>setKnowledgeModalOpen(true)}>
            <div className="v200-feature-avatar gold">
              <BookOpen size={26}/>
            </div>
            <div className="v200-feature-content">
              <div className="v200-feature-badge gold">
                <Sparkles size={12}/>
                <span>AKADEMIA & QUIZY</span>
              </div>
              <h3>KĄCIK WIEDZY I ZASAD</h3>
              <p>Zasady gry, zdrowe żywienie i regeneracja. Zrób test i odbierz punkty DP!</p>
            </div>
            <div className="v200-feature-cta gold">
              <span>CZYTAJ & TEST</span>
              <ChevronRight size={18}/>
            </div>
          </SpotlightCard>

          <SpotlightCard className="v200-feature-banner season-pass-vip" glowColor="gold" enableTilt={true} onClick={()=>setSeasonPassModalOpen(true)}>
            <div className="v200-feature-avatar gold">
              <Flame size={26}/>
            </div>
            <div className="v200-feature-content">
              <div className="v200-feature-badge gold">
                <Crown size={12}/>
                <span>SEZON 1: MŁODE WILKI</span>
              </div>
              <h3>DELTA BATTLE PASS 🏆</h3>
              <p>Zdobywaj XP za mecze i quizy, awansuj poziomy 1–20 i odbieraj Złote Skrzynie!</p>
            </div>
            <div className="v200-feature-cta gold">
              <span>BATTLE PASS</span>
              <ChevronRight size={18}/>
            </div>
          </SpotlightCard>

          <SpotlightCard className="v200-feature-banner photobooth-vip" glowColor="gold" enableTilt={true} onClick={()=>setPhotoBoothModalOpen(true)}>
            <div className="v200-feature-avatar gold">
              <Camera size={26}/>
            </div>
            <div className="v200-feature-content">
              <div className="v200-feature-badge gold">
                <Sparkles size={12}/>
                <span>STUDIO GRAFIK HD</span>
              </div>
              <h3>FOTO-BUDKA DELTA 📸</h3>
              <p>Twórz profesjonalne plakaty, relacje na Instagram / WhatsApp i karty meczowe!</p>
            </div>
            <div className="v200-feature-cta gold">
              <span>STWÓRZ PLAKAT</span>
              <ChevronRight size={18}/>
            </div>
          </SpotlightCard>

          <SpotlightCard className="v200-feature-banner birthday-vip" glowColor="gold" enableTilt={true} onClick={()=>setBirthdayModalOpen(true)}>
            <div className="v200-feature-avatar gold">
              <Cake size={26}/>
            </div>
            <div className="v200-feature-content">
              <div className="v200-feature-badge gold">
                <Cake size={12}/>
                <span>ŚWIĘTUJEMY RAZEM</span>
              </div>
              <h3>STREFA URODZIN DRUŻYNY 🎉</h3>
              <p>Składaj sportowe życzenia kolegom, świętuj urodziny i odbieraj prezenty w kartach!</p>
            </div>
            <div className="v200-feature-cta gold">
              <span>ŻYCZENIA</span>
              <ChevronRight size={18}/>
            </div>
          </SpotlightCard>

          <SpotlightCard className="v200-feature-banner coach-vip" glowColor="gold" enableTilt={true} onClick={()=>setCoachCornerModalOpen(true)}>
            <div className="v200-feature-avatar gold">
              <Award size={26}/>
            </div>
            <div className="v200-feature-content">
              <div className="v200-feature-badge gold">
                <Crown size={12}/>
                <span>SZTAB SZKOLENIOWY</span>
              </div>
              <h3>KĄCIK TRENERA & SKILL MASTER ⚽</h3>
              <p>Wyzwania techniczne zatwierdzane przez trenera, zadania domowe i inspiracje!</p>
            </div>
            <div className="v200-feature-cta gold">
              <span>WYZWANIA</span>
              <ChevronRight size={18}/>
            </div>
          </SpotlightCard>

          <SpotlightCard className="v200-feature-banner tactics-whiteboard" glowColor="red" enableTilt={true} onClick={()=>setTacticsModalOpen(true)}>
            <div className="v200-feature-avatar red">
              <Target size={26}/>
            </div>
            <div className="v200-feature-content">
              <div className="v200-feature-badge red">
                <Shield size={12}/>
                <span>ODPRAWA PRZEDMECZOWA</span>
              </div>
              <h3>TABLICA TAKTYCZNA ORLIKA</h3>
              <p>Formacje 1-2-3-1, rozstawienie składu na boisku i zadania meczowe</p>
            </div>
            <div className="v200-feature-cta red">
              <span>TABLICA</span>
              <ChevronRight size={18}/>
            </div>
          </SpotlightCard>
        </div>
        <div className="v104-league-feature">
        <LeagueHome matches={matches} onOpen={()=>setTab("league")}/>
        </div>

        <section className={`v8-dashboard-grid ${homeAgendaItems.length?"has-week-pulse":"without-week-pulse"}`}>
          {homeAgendaItems.length>0&&<article className={`v8-panel v101-now-card v108-week-pulse devil-card ${isTeamLive?"is-live":""}`} onClick={()=>setTab("calendar")}>
            <div className="v8-panel-title"><Flame size={18}/> {isTeamLive?"DZIEJE SIĘ TERAZ":"RYTM TYGODNIA"} {isTeamLive&&<span className="v101-live-dot">LIVE</span>}</div>
            <div className="v108-week-list">
              {homeAgendaItems.map((item,index)=><div className="v108-week-row" key={`${item.kind}-${item.at.toISOString()}`}>
                <span className="v108-week-index">0{index+1}</span>
                <div><small>{item.kind==="training"?"TRENING":item.important?"WAŻNE":"WYDARZENIE"}</small><b>{item.title}</b><p>{item.subtitle}</p></div>
                <ChevronRight size={15}/>
              </div>)}
            </div>
            <div className="v101-now-footer"><span><Bell size={13}/>Następny punkt planu: {teamClockCountdown}</span><ChevronRight size={15}/></div>
          </article>}

          <article className="v8-panel v86-recent-matches devil-card">
            <div className="v8-panel-title"><History size={18}/> OSTATNIE MECZE <button onClick={()=>setTab("matches")}>WSZYSTKIE</button></div>
            <div className="v86-form-strip">
              {recentMatches.length>0?recentMatches.map(m=>{
                const result=recentResult(m);
                const opponent=recentOpponent(m);
                const ours=m.home_team===CLUB?(m.home_score??0):(m.away_score??0);
                const opp=m.home_team===CLUB?(m.away_score??0):(m.home_score??0);
                return <button className={`v86-match-chip result-${result.toLowerCase()}`} key={m.id} onClick={()=>setSelectedMatch(m)}>
                  <span className="v86-result-badge">{result}</span>
                  <div className="v86-match-logo"><Logo team={opponent} size={42}/></div>
                  <b>{ours}:{opp}</b>
                  <span>{opponent}</span>
                  <small>{datePL(m.match_date)}</small>
                </button>
              }):<div className="v86-no-matches"><History size={28}/><b>Sezon dopiero się zaczyna</b><span>Ostatnie wyniki pojawią się tutaj po rozegranych meczach.</span></div>}
            </div>
            {recentMatches.length>0&&<div className="v86-form-summary">
              <span>FORMA</span>
              <div>{recentMatches.map(m=><i key={m.id} className={`form-${recentResult(m).toLowerCase()}`}>{recentResult(m)}</i>)}</div>
              <small>ostatnie {recentMatches.length} {recentMatches.length===1?"spotkanie":"spotkania"}</small>
            </div>}
          </article>

        </section>

        <section className="v8-lower-grid v885-rankings-grid">
          <article className="v8-panel devil-card v885-ranking-panel">
            <div className="v8-panel-title"><Target size={18}/> STRZELCY BRAMEK</div>
            <div className="v885-ranking-list">
              {scorersRanking.length>0?scorersRanking.map((p,index)=>{
                const s=stats[p.id];
                return <button type="button" className={`v885-ranking-row ${index<3?"top-three":""}`} key={p.id} onClick={()=>openPlayerProfile(p)}>
                  <span className="v885-rank-number">{index+1}</span>
                  <span className="v885-rank-photo">
                    {isRyszardPlayer(p)?<img src="/assets/ryszard-player-card.png" alt={p.display_name}/>:<PlayerPhoto playerId={p.id}/>}
                  </span>
                  <span className="v885-rank-name"><b>{p.display_name}</b><small>{s?.m||0} {s?.m===1?"mecz":"mecze"}</small></span>
                  <span className="v885-rank-value"><b>{s?.g||0}</b><small>GOLE</small></span>
                  <ChevronRight size={15}/>
                </button>
              }):<div className="v885-ranking-empty">Pierwsze gole uruchomią ranking.</div>}
            </div>
          </article>

          <article className="v8-panel devil-card v885-ranking-panel">
            <div className="v8-panel-title"><Star size={18}/> ASYSTY</div>
            <div className="v885-ranking-list">
              {assistsRanking.length>0?assistsRanking.map((p,index)=>{
                const s=stats[p.id];
                return <button type="button" className={`v885-ranking-row ${index<3?"top-three":""}`} key={p.id} onClick={()=>openPlayerProfile(p)}>
                  <span className="v885-rank-number">{index+1}</span>
                  <span className="v885-rank-photo">
                    {isRyszardPlayer(p)?<img src="/assets/ryszard-player-card.png" alt={p.display_name}/>:<PlayerPhoto playerId={p.id}/>}
                  </span>
                  <span className="v885-rank-name"><b>{p.display_name}</b><small>{s?.m||0} {s?.m===1?"mecz":"mecze"}</small></span>
                  <span className="v885-rank-value"><b>{s?.a||0}</b><small>ASYSTY</small></span>
                  <ChevronRight size={15}/>
                </button>
              }):<div className="v885-ranking-empty">Pierwsza asysta uruchomi ranking.</div>}
            </div>
          </article>

          <article className="v8-quote devil-card"><span>„</span><p>Drużyna to nie tylko zawodnicy. To rodzina.</p></article>
          <article className="v8-banner-small devil-card"><div>JEDEN ZESPÓŁ</div><b>WIELE MOŻLIWOŚCI</b></article>
        </section>


        <section className="v87-season-grid">
          <SpotlightCard className="v87-leaders devil-card v885-season-best v113-season-podium-panel" glowColor="gold" enableTilt={true}>
            <div className="v8-panel-title"><Medal size={18}/> PODIUM SEZONU <span>DELTA 2018 GM</span></div>
            <div className="v142-gala-tabs" role="group" aria-label="Wybierz kategorię podium sezonu">
              {([['goals','Strzelcy bramek',Goal],['assists','Asysty',Star],['mvp','MVP',Trophy]] as const).map(([metric,label,Icon])=><button key={metric} type="button" className={homePodiumMetric===metric?'active':''} aria-pressed={homePodiumMetric===metric} onClick={()=>setHomePodiumMetric(metric)}><Icon size={17}/>{label}</button>)}
            </div>
            <div className="v142-gala-caption"><span>{homePodiumMetric==='goals'?'STRZELCY BRAMEK':homePodiumMetric==='assists'?'ASYSTY':'MVP'}</span><small>Wybierz kartę zawodnika, aby otworzyć jego profil</small></div>
            <PremiumPodium players={players} stats={stats} metric={homePodiumMetric} onOpen={openPlayerProfile}/>
            <button type="button" className="v142-hall-link" onClick={()=>setTab('hall')}>PRZEJDŹ DO HALL OF FAME <ChevronRight size={16}/></button>
          </SpotlightCard>

          <SpotlightCard className="v877-club-home devil-card" glowColor="blue" enableTilt={true}>
            <div className="v8-panel-title"><Shield size={18}/> Z KLUBU <span>DELTA SYNC</span></div>
            {clubUpdates.length>0?<>
              <div className="v877-club-home-list">
                {clubUpdates.slice(0,3).map(item=><button type="button" key={item.id} onClick={()=>{setTab("club");setFocusedClubKey(item.source_key);window.setTimeout(()=>document.getElementById(`club-update-${item.source_key}`)?.scrollIntoView({behavior:"smooth",block:"center"}),250)}}>
                  <span>{new Date(item.published_at).toLocaleDateString("pl-PL")}</span>
                  <b>{decodeHtmlEntities(item.title)}</b>
                  <ChevronRight size={14}/>
                </button>)}
              </div>
              <button className="v877-club-all" type="button" onClick={()=>setTab("club")}>WSZYSTKIE INFORMACJE Z KLUBU <ChevronRight size={14}/></button>
            </>:<div className="v877-club-home-empty"><Shield size={24}/><div><b>DELTA Sync</b><span>Uruchom synchronizację w panelu Admin.</span></div></div>}
          </SpotlightCard>

          <SpotlightCard className="v87-team-goal devil-card" glowColor="gold" enableTilt={true}>
            <div className="v8-panel-title"><Target size={18}/> CEL DRUŻYNY</div>
            <div className="v87-goal-number"><b>{teamSummary.goals}</b><span>/ {teamGoalTarget}</span></div>
            <h3>50 BRAMEK W SEZONIE</h3>
            <p>Każdy gol przybliża Diabełki do wspólnego celu.</p>
            <div className="v87-goal-track v200-flame-meter">
              <i style={{width:`${teamGoalProgress}%`}}>
                <em>{teamGoalProgress}%</em>
                <span className="v200-flame-tip"><Flame size={14} color="#ff202b"/></span>
              </i>
            </div>
            <small>Do celu pozostało {Math.max(0,teamGoalTarget-teamSummary.goals)} bramek</small>
          </SpotlightCard>

          <SpotlightCard className="v87-streak devil-card" glowColor="red" enableTilt={true}>
            <div className="v8-panel-title"><TrendingUp size={18}/> SERIA DRUŻYNY</div>
            <div className="v87-streak-main">
              <Zap size={32} style={{color:"#ff202b",filter:"drop-shadow(0 0 10px rgba(255,32,43,0.7))"}}/>
              <div>
                <b>{currentWinStreak>0?currentWinStreak:currentUnbeatenStreak}</b>
                <span>{currentWinStreak>0?(currentWinStreak===1?"WYGRANA Z RZĘDU":"WYGRANE Z RZĘDU"):(currentUnbeatenStreak>0?"MECZE BEZ PORAŻKI":"NOWA SERIA CZEKA")}</span>
              </div>
            </div>
            <div className="v87-form-dots">
              {recentMatches.map(m=><i key={m.id} className={`form-${recentResult(m).toLowerCase()}`}>{recentResult(m)}</i>)}
              {recentMatches.length===0&&<small>Pierwszy wynik uruchomi serię.</small>}
            </div>
          </SpotlightCard>
        </section>

        <section className="v8-bottom-grid">
          <article className="v8-panel devil-card"><div className="v8-panel-title"><Award size={18}/> OSIĄGNIĘCIA</div><div className="v8-achievement-preview"><Trophy/><div><b>{teamSummary.wins>=1?"Pierwsze sukcesy zapisane":"Pierwsze trofea czekają"}</b><span>{teamSummary.wins} zwycięstw • {teamSummary.goals} bramek</span></div></div><button className="v8-link-btn" onClick={()=>setTab("achievements")}>ZOBACZ WSZYSTKIE <ChevronRight size={14}/></button></article>
          <article className="v8-panel devil-card">
            <div className="v8-panel-title">
              <Newspaper size={18}/> AKTUALNOŚCI 
              {staff && <button onClick={openAddNewsModal}>DODAJ</button>}
            </div>
            <div className="v8-news-list">
              {news.slice(0,3).map(n=>{
                const isRead = !!readNewsMap[n.id];
                const isUrgent = n.priority === "urgent" || n.type === "wazne";
                return (
                  <div key={n.id} onClick={()=>setTab("news")} style={{cursor:"pointer",display:"flex",alignItems:"center",gap:8}}>
                    <i style={{background: isUrgent ? "#ef4444" : isRead ? "#4b5563" : "#f6c952"}}/>
                    <div style={{flex:1}}>
                      <b>{n.title}</b>
                      <span>{new Date(n.published_at).toLocaleDateString("pl-PL")} {isRead ? "• ✓ Odczytane" : isUrgent ? "• 🔴 PILNE" : ""}</span>
                    </div>
                  </div>
                );
              })}
              {news.length===0&&<p className="muted">Brak aktualności.</p>}
            </div>
          </article>
          <article className="v8-panel devil-card"><div className="v8-panel-title"><History size={18}/> KRONIKA</div><div className="v8-chronicle-preview">{matches.filter(m=>m.status==="played").slice(-2).reverse().map(m=><div key={m.id}><b>{datePL(m.match_date)}</b><span>{m.home_team} {m.home_score}:{m.away_score} {m.away_team}</span></div>)}{matches.filter(m=>m.status==="played").length===0&&<p className="muted">Historia sezonu dopiero się zaczyna.</p>}</div></article>
        </section>
      </>}

      {tab==="collection"&&<DeltaCollectionAlbum
        currentUserId={props.profile.id}
        players={players}
        matches={matches}
        onOpenPlayerProfile={(pid)=>{
          const p=players.find(x=>x.id===pid);
          if(p)openPlayerProfile(p);
        }}
      />}
      {tab==="league"&&<LeagueCenter matches={matches} isAdmin={props.profile.role==="admin"}/>}
      {tab==="mychild"&&<MyChildCenter
        players={players} parentPlayerIds={props.parentPlayerIds} stats={stats} trainingStats={trainingPlayerStats}
        matches={matches} attendance={attendance} events={events} trainingSessions={trainingSessions} trainingAttendance={trainingAttendance}
        chemistry={trainingChemistry} onOpenMatch={(m,t)=>openMatch(m,t)} onOpenPlayer={openPlayerProfile}
      />}

      {tab==="matchday"&&<MatchDayMode
        match={nextMatch||null} players={players} attendance={attendance} lineup={lineup} events={events}
        canManage={canManageMatches} canEvents={canEditMatchEvents} onOpen={(m,t)=>openMatch(m,t)}
      />}

      {tab==="hall"&&<HallOfFame
        players={players} stats={stats} trainingStats={trainingPlayerStats} chemistry={trainingChemistry} matches={matches} trainingSessions={trainingSessions} onOpenPlayer={openPlayerProfile}
      />}

      {tab==="matches"&&<section className="section v8-section-page v105-match-archive"><header className="v105-section-hero devil-card"><div className="v105-section-hero-content"><span className="eyebrow gold">DELTA 2018 GM • MATCH CENTER</span><h2>WSZYSTKIE <em>MECZE</em></h2><p>Każda kolejka. Każdy wynik. Jedna drużyna.</p><div className="v105-section-hero-meta"><span><Trophy size={15}/>{teamSummary.played} rozegranych</span><span><Goal size={15}/>{teamSummary.goals} bramek</span><span><CalendarDays size={15}/>{matches.filter(m=>m.status==="scheduled").length} zaplanowanych</span></div></div><div className="v105-section-hero-icon" aria-hidden="true"><img src="/teamlogos/gm.png" alt=""/></div></header><div className="list">{matchArchiveItems.map(item=>item.match?(()=>{const m=item.match;return <article className={`match-row devil-card v105-broadcast-fixture ${m.status==="played"?"is-played":"is-upcoming"}`} key={item.key}><div className="teamline"><Logo team={m.home_team} size={38}/><strong>{m.home_team}</strong></div><div className="score">{m.status==="played"?`${m.home_score}:${m.away_score}`:"–:–"}</div><div className="teamline right"><strong>{m.away_team}</strong><Logo team={m.away_team} size={38}/></div><div className="match-meta">Kolejka {m.round_no||"—"} • {datePL(m.match_date)} {m.match_time||""} • {m.venue||"—"}</div><div className="match-actions-row"><button className="open-match-btn" onClick={()=>openMatch(m,"summary")}>{canManageMatches||canEditMatchEvents?"EDYTUJ MECZ / CENTRUM MECZU":"SZCZEGÓŁY MECZU"}</button></div></article>})():<article className="devil-card v105-bye-card" key={item.key}><CalendarDays size={30}/><div><span>KOLEJKA {item.bye!.round} • {datePL(item.bye!.date)}</span><h3>DELTA GM PAUZUJE</h3><p>W tej kolejce drużyna nie rozgrywa meczu.</p></div></article>)}</div></section>}

      {tab==="calendar"&&<section className="section v8-section-page v891-calendar-page">
        <div className="v891-calendar-hero devil-card">
          <div>
            <span className="eyebrow gold">DELTA 2018 GM • PLAN DRUŻYNY</span>
            <h2>Kalendarz drużyny</h2>
            <p>Mecze, treningi, turnieje, urodziny i ważne informacje w jednym miejscu.</p>
          </div>
          <div className="v891-calendar-next">
            <span>NAJBLIŻSZE</span>
            <b>{nextTeamEvent?.title||"Brak wydarzeń"}</b>
            <strong>{teamClockCountdown}</strong>
          </div>
        </div>

        <div className="v103-calendar-toolbar devil-card">
          <div className="v103-calendar-nav">
            <button aria-label="Poprzedni miesiąc" onClick={()=>setCalendarMonth(value=>new Date(value.getFullYear(),value.getMonth()-1,1))}><ChevronLeft size={18}/></button>
            <strong>{calendarMonth.toLocaleDateString("pl-PL",{month:"long",year:"numeric"})}</strong>
            <button aria-label="Następny miesiąc" onClick={()=>setCalendarMonth(value=>new Date(value.getFullYear(),value.getMonth()+1,1))}><ChevronRight size={18}/></button>
            <button className="v103-calendar-today" onClick={()=>setCalendarMonth(new Date(new Date().getFullYear(),new Date().getMonth(),1))}>DZISIAJ</button>
          </div>
          <div className="v103-calendar-views" role="group" aria-label="Widok kalendarza">
            <button className={calendarView==="month"?"active":""} onClick={()=>setCalendarView("month")}><Grid3X3 size={15}/> MIESIĄC</button>
            <button className={calendarView==="list"?"active":""} onClick={()=>setCalendarView("list")}><List size={15}/> LISTA</button>
          </div>
        </div>

        {calendarView==="month"?<div className="v104-calendar-layout"><div className="v103-calendar-month devil-card">
          <div className="v103-calendar-weekdays">{["PN","WT","ŚR","CZ","PT","SOB","ND"].map(day=><span key={day}>{day}</span>)}</div>
          <div className="v103-calendar-days">
            {calendarDays.map(day=>{
              const isToday=day.key===`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
              return <div key={day.key} className={`v103-calendar-day ${day.inMonth?"":"outside"} ${isToday?"today":""}`}>
                <span className="v103-day-number">{day.date.getDate()}</span>
                <div className="v103-day-events">
                  {day.items.slice(0,3).map(item=>item.match
                    ?<button key={item.id} className={`v103-day-event type-${item.kind}`} title={`${item.title} ${item.time}`} onClick={()=>openMatch(item.match!,"summary")}><i/>{item.time&&<time>{item.time}</time>}<b>{item.title}</b></button>
                    :<div key={item.id} className={`v103-day-event type-${item.kind}`} title={`${item.title} ${item.time}`}><i/>{item.time&&<time>{item.time}</time>}<b>{item.title}</b></div>)}
                  {day.items.length>3&&<small>+{day.items.length-3} więcej</small>}
                </div>
              </div>;
            })}
          </div>
        </div><aside className="v104-calendar-agenda devil-card"><span className="eyebrow gold">NADCHODZĄCE WYDARZENIA</span><h3>Najbliższe w drużynie</h3><div>{calendarItems.filter(item=>`${item.date} ${item.time}`>=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`).slice(0,6).map(item=><article key={item.id} className={`type-${item.kind}`}><time><b>{new Date(`${item.date}T12:00:00`).getDate()}</b><span>{new Date(`${item.date}T12:00:00`).toLocaleDateString("pl-PL",{month:"short"}).replace(".","").toUpperCase()}</span></time><div><small>{calendarKindLabel(item.kind)}</small><b>{item.title}</b><span>{[item.time,item.location].filter(Boolean).join(" • ")}</span></div>{item.match&&<button onClick={()=>openMatch(item.match!,"summary")}><ChevronRight size={15}/></button>}</article>)}</div></aside></div>:<div className="v891-calendar-grid v103-calendar-list">
          {calendarItems.length?calendarItems.map(item=><article key={item.id} className={`v891-calendar-event devil-card type-${item.kind} ${item.important?"important":""}`}>
            <div className="v891-event-date">
              <b>{new Date(`${item.date}T12:00:00`).toLocaleDateString("pl-PL",{day:"2-digit"})}</b>
              <span>{new Date(`${item.date}T12:00:00`).toLocaleDateString("pl-PL",{month:"short"}).replace(".","").toUpperCase()}</span>
            </div>
            <div className="v891-event-main">
              <span className="v891-event-type">{calendarKindLabel(item.kind)}</span>
              <h3>{item.title}</h3>
              <p>{[item.time,item.location].filter(Boolean).join(" • ")||"Szczegóły do ustalenia"}</p>
              {item.details&&<small>{item.details}</small>}
            </div>
            {item.match?<button onClick={()=>openMatch(item.match!,"summary")}>CENTRUM MECZU <ChevronRight size={13}/></button>:null}
          </article>):<div className="v891-calendar-empty devil-card"><CalendarDays size={34}/><h3>Kalendarz jest pusty</h3><p>Administrator może zaplanować treningi, turnieje, urodziny i inne wydarzenia.</p></div>}
        </div>}
      </section>}

      {tab==="training"&&<section className="section v8-section-page v900-training-center">
        <div className="v900-training-hero devil-card">
          <div className="v900-training-hero-bg"/>
          <div className="v900-training-copy">
            <span className="eyebrow gold">DELTA 2018 GM • PERFORMANCE LAB</span>
            <h2>CENTRUM <span>TRENINGOWE</span></h2>
            <p>Frekwencja, gry kontrolne, gole treningowe, asysty i chemia zespołu — całkowicie oddzielone od statystyk meczów oficjalnych.</p>
          </div>
          <div className="v900-training-kpis">
            <div><strong>{trainingSessions.length}</strong><span>TRENINGI</span></div>
            <div><strong>{avgTrainingAttendance.toFixed(1)}</strong><span>ŚR. OBECNOŚĆ</span></div>
            <div><strong>{trainingGames.length}</strong><span>GRY KONTROLNE</span></div>
            <div><strong>{trainingEvents.filter(e=>e.event_type==="goal").length}</strong><span>GOLE TRENINGOWE</span></div>
          </div>
          <div style={{ marginTop: "14px", display: "flex", gap: "10px" }}>
            <button 
              type="button" 
              className="v200-btn-claim-chest" 
              onClick={() => setTrainingKingModalOpen(true)}
              style={{ fontSize: "12px", padding: "10px 18px" }}
            >
              <Trophy size={16}/> OTWÓRZ RANKING: KRÓL TRENINGU & GIERKI
            </button>
          </div>
        </div>

        <div className="v900-training-grid">
          <article className="v900-training-card devil-card">
            <div className="v8-panel-title"><Users size={18}/> FREKWENCJA TRENINGOWA</div>
            <div className="v900-training-ranking">
              {trainingAttendanceRank.map((p,index)=>{
                const s=trainingPlayerStats[p.id];
                return <button key={p.id} onClick={()=>openPlayerProfile(p)}>
                  <span className="rank">{index+1}</span>
                  <span className="photo">{isRyszardPlayer(p)?<img src="/assets/ryszard-player-card.png" alt={p.display_name}/>:<PlayerPhoto playerId={p.id}/>}</span>
                  <span className="name"><b>{p.display_name}</b><small>seria: {s?.attendanceStreak||0}</small></span>
                  <strong>{s?.sessions||0}</strong>
                </button>
              })}
            </div>
          </article>

          <article className="v900-training-card devil-card">
            <div className="v8-panel-title"><Goal size={18}/> GOLE TRENINGOWE</div>
            <div className="v900-training-ranking compact">
              {trainingScorers.slice(0,8).map((p,index)=>{
                const s=trainingPlayerStats[p.id];
                return <button key={p.id} onClick={()=>openPlayerProfile(p)}>
                  <span className="rank">{index+1}</span>
                  <span className="name"><b>{p.display_name}</b><small>{s?.games||0} gier</small></span>
                  <strong>{s?.goals||0}</strong>
                </button>
              })}
            </div>
          </article>

          <article className="v900-training-card devil-card">
            <div className="v8-panel-title"><Star size={18}/> ASYSTY TRENINGOWE</div>
            <div className="v900-training-ranking compact">
              {trainingAssisters.slice(0,8).map((p,index)=>{
                const s=trainingPlayerStats[p.id];
                return <button key={p.id} onClick={()=>openPlayerProfile(p)}>
                  <span className="rank">{index+1}</span>
                  <span className="name"><b>{p.display_name}</b><small>{s?.ga||0} G+A</small></span>
                  <strong>{s?.assists||0}</strong>
                </button>
              })}
            </div>
          </article>

          <article className="v900-training-card devil-card">
            <div className="v8-panel-title"><Zap size={18}/> G+A TRENINGOWE</div>
            <div className="v900-training-ranking compact">
              {trainingGA.slice(0,8).map((p,index)=>{
                const s=trainingPlayerStats[p.id];
                return <button key={p.id} onClick={()=>openPlayerProfile(p)}>
                  <span className="rank">{index+1}</span>
                  <span className="name"><b>{p.display_name}</b><small>{s?.goals||0}G • {s?.assists||0}A</small></span>
                  <strong>{s?.ga||0}</strong>
                </button>
              })}
            </div>
          </article>
        </div>

        <article className="v900-chemistry devil-card">
          <div className="v900-chemistry-head">
            <div><span className="eyebrow gold">PAIR PERFORMANCE</span><h3>Chemia zespołu</h3></div>
            <p>Wynik oparty na wspólnych grach kontrolnych: zwycięstwach oraz wspólnym udziale przy golach. To wskaźnik zabawowy, nie ocena zawodnika.</p>
          </div>

          {chemistryNetwork.nodes.length>1&&<div className="v103-chemistry-network" aria-label="Mapa połączeń między zawodnikami">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              {chemistryNetwork.links.map(({pair,from,to})=><line
                key={`${pair.a.id}-${pair.b.id}`}
                x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                className={pair.score>=70?"strong":pair.score>=45?"medium":"developing"}
                style={{strokeWidth:Math.max(1.1,pair.score/28)}}
              />)}
            </svg>
            {chemistryNetwork.nodes.map(node=><button
              key={node.player.id}
              className="v103-chemistry-node"
              style={{left:`${node.x}%`,top:`${node.y}%`}}
              onClick={()=>openPlayerProfile(node.player)}
              title={`Otwórz profil: ${node.player.display_name}`}
            >
              <span>{isRyszardPlayer(node.player)?<img src="/assets/ryszard-player-card.png" alt=""/>:<PlayerPhoto playerId={node.player.id}/>}</span>
              <b>{node.player.display_name}</b>
            </button>)}
            <div className="v103-chemistry-legend"><span className="strong">silne</span><span className="medium">dobre</span><span className="developing">rozwijane</span></div>
          </div>}

          <div className="v900-chemistry-grid">
            {trainingChemistry.slice(0,10).map((pair,index)=><button className="v900-pair-card" key={`${pair.a.id}-${pair.b.id}`}>
              <span className="v900-pair-rank">#{index+1}</span>
              <div className="v900-pair-players">
                <span>{isRyszardPlayer(pair.a)?<img src="/assets/ryszard-player-card.png" alt={pair.a.display_name}/>:<PlayerPhoto playerId={pair.a.id}/>}</span>
                <i>+</i>
                <span>{isRyszardPlayer(pair.b)?<img src="/assets/ryszard-player-card.png" alt={pair.b.display_name}/>:<PlayerPhoto playerId={pair.b.id}/>}</span>
              </div>
              <b>{pair.a.display_name} + {pair.b.display_name}</b>
              <strong>{pair.score}%</strong>
              <div className="v900-chem-bar"><i style={{width:`${pair.score}%`}}/></div>
              <small>{pair.games} wspólnych gier • {pair.wins} wygranych • {pair.combinedGA} akcji G/A</small>
            </button>)}
            {trainingChemistry.length===0&&<div className="v900-no-chemistry">Chemia pojawi się po zapisaniu pierwszych gier kontrolnych i składów.</div>}
          </div>
        </article>

        <article className="v900-training-history devil-card">
          <div className="v8-panel-title"><History size={18}/> OSTATNIE TRENINGI</div>
          <div className="v900-training-history-list">
            {trainingSessions.slice(0,8).map(s=>{
              const present=trainingAttendance.filter(a=>a.training_id===s.id&&a.status==="present").length;
              const games=trainingGames.filter(g=>g.training_id===s.id);
              return <div key={s.id}>
                <span className="date">{datePL(s.training_date)}</span>
                <div><b>{s.title||"Trening"}</b><small>{[s.start_time?.slice(0,5),s.location].filter(Boolean).join(" • ")}</small></div>
                <strong>{present}/{players.length}</strong>
                <em>{games.length} {games.length===1?"gra":"gry"}</em>
              </div>
            })}
            {trainingSessions.length===0&&<p className="muted">Pierwszy trening dodasz w panelu Admin.</p>}
          </div>
        </article>
      </section>}

      {tab==="players"&&<section className="section v8-section-page v87-players-page v871-team-page">
        <div className="v871-team-hero v108-team-hero devil-card">
          <div className="v871-team-hero-overlay"/>
          <img className="v108-team-players" src="/assets/hero-team-v105.png" alt="Zawodnicy DELTA 2018 GM"/>
          <div className="v871-team-crest"><img src="/teamlogos/gm.png" alt="DELTA 2018 GM"/></div>
          <div className="v871-team-copy">
            <span className="eyebrow gold">POZNAJ DIABEŁKI • GÓRNY MOKOTÓW</span>
            <h2>DELTA <span>2018</span> GM</h2>
            <p>Pasja, charakter i przyjaźń. Jedna drużyna, która rośnie z każdym treningiem.</p>
            <div className="v871-team-pills">
              <span><Users size={14}/>{players.length} zawodników</span>
              <span><Goal size={14}/>{teamSummary.goals} bramek</span>
              <span><Star size={14}/>{teamSummary.assists} asyst</span>
              <span><Trophy size={14}/>{teamSummary.wins} zwycięstw</span>
            </div>
          </div>
        </div>

        <section className="v119-showcase devil-card" aria-label="Karuzela zawodników DELTA 2018 GM">
          <div className="v119-showcase-heading">
            <div><span>DELTA PLAYER SHOWCASE · SEZON {seasonLabel()}</span><h3>POZNAJ <em>DIABEŁKI</em></h3><p>Wybierz zawodnika i otwórz jego kartę postaci.</p></div>
            <div className="v119-showcase-count"><b>{players.length?String((showcaseIndex%players.length)+1).padStart(2,"0"):"00"}</b><span>/ {String(players.length).padStart(2,"0")}</span></div>
          </div>
          {players.length>0?(()=>{
            const active=((showcaseIndex%players.length)+players.length)%players.length;
            const move=(direction:number)=>{
              const next=(showcaseIndexRef.current+direction+players.length)%players.length;
              showcaseIndexRef.current=next;
              setShowcaseIndex(next);
              centerMobileCard(next);
            };
            const visibleOffsets=players.length===1?[0]:players.length===2?[-1,0]:players.length===3?[-1,0,1]:players.length===4?[-2,-1,0,1]:players.length===5?[-2,-1,0,1,2]:players.length===6?[-3,-2,-1,0,1,2]:[-3,-2,-1,0,1,2,3];
            return <>
              <div ref={showcaseStageRef} className="v119-showcase-stage v120-showcase-stage v121-showcase-stage" tabIndex={0} onDragStart={e=>e.preventDefault()} aria-label="Karuzela zawodników. Przeciągnij myszką lub przesuń palcem w lewo albo w prawo. Klawisze strzałek także działają." onKeyDown={e=>{if(e.key==="ArrowLeft"){e.preventDefault();move(-1);}if(e.key==="ArrowRight"){e.preventDefault();move(1);}}} onPointerDown={showcasePointerDown} onPointerMove={showcasePointerMove} onPointerUp={showcasePointerEnd} onPointerCancel={showcasePointerCancel} onClickCapture={e=>{if(showcaseIgnoreClick.current){e.stopPropagation();e.preventDefault();showcaseIgnoreClick.current=false;}}}>
                <span className="v119-stage-smoke" aria-hidden="true"/>
                {visibleOffsets.map(offset=>{
                  const player=players[(active+offset+players.length)%players.length];
                  const center=offset===0;
                  const s=stats[player.id]||{m:0,starts:0,captain:0,g:0,a:0,mvp:0};
                  return <button type="button" key={player.id} data-showcase-offset={offset} draggable={false} onDragStart={e=>e.preventDefault()} className={`v119-showcase-card ${center?"is-active":""} v119-offset-${offset<0?`m${Math.abs(offset)}`:`p${offset}`}`} onClick={()=>center?openPlayerProfile(player):move(offset)} aria-label={center?`Otwórz profil: ${player.display_name}`:`Wybierz zawodnika: ${player.display_name}`} aria-current={center?"true":undefined}>
                    <span className="v119-showcase-art">{isRyszardPlayer(player)?<img src="/assets/ryszard-player-card.png" alt=""/>:<PlayerPhoto playerId={player.id}/>}</span>
                    <span className="v119-showcase-card-overlay" aria-hidden="true"/>
                    <span className="v119-showcase-card-top"><img src="/teamlogos/gm.png" alt=""/><b>{player.shirt_number?`#${player.shirt_number}`:"GM"}</b></span>
                    <span className="v119-showcase-card-bottom"><small>DELTA 2018 GM</small><strong>{player.display_name}</strong><span>{player.position||"Zawodnik"}</span>{center&&<em>{s.m} MECZE · {s.g} GOLE · {s.a} ASYSTY</em>}</span>
                  </button>;
                })}
              </div>
              {/* V10.24: three repeated runs. Native swipe remains browser-managed;
                  when a duplicate is selected we silently return to the middle run. */}
              <div ref={showcaseMobileRef} className="v123-mobile-showcase" aria-label="Zawodnicy — zapętlona karuzela, przesuń palcem" onScroll={e=>{
                if(!showcaseMobileReady.current||showcaseMobileRebasing.current||!players.length)return;
                const el=e.currentTarget;const step=showcaseMobileStep();if(!step)return;
                let raw=Math.round(el.scrollLeft/step);
                if(raw<players.length||raw>=players.length*2){
                  showcaseMobileRebasing.current=true;
                  const before=el.scrollLeft;
                  el.style.scrollBehavior="auto";
                  el.scrollLeft=before+(raw<players.length?players.length:-players.length)*step;
                  el.style.removeProperty("scroll-behavior");
                  raw=Math.round(el.scrollLeft/step);
                  requestAnimationFrame(()=>{showcaseMobileRebasing.current=false;});
                }
                const index=((raw%players.length)+players.length)%players.length;
                showcaseIndexRef.current=index;
                setShowcaseIndex(old=>old===index?old:index);
              }}>
                {Array.from({length:3},(_,cycle)=>players.map((player,index)=>{
                  const s=stats[player.id]||{m:0,starts:0,captain:0,g:0,a:0,mvp:0};
                  const ordinal=cycle*players.length+index;
                  return <button key={`${cycle}-${player.id}`} type="button" className={`v123-mobile-card ${showcaseIndex===index?"is-active":""}`} onClick={()=>{
                    const el=showcaseMobileRef.current;const step=showcaseMobileStep();
                    if(!el||!step)return;
                    const center=el.scrollLeft+el.clientWidth/2;
                    const item=el.querySelector<HTMLElement>(`[data-mobile-player-index="${ordinal}"]`);
                    if(!item)return;
                    const target=item.offsetLeft+item.offsetWidth/2-el.clientWidth/2;
                    if(Math.abs(target-el.scrollLeft)>16){el.scrollTo({left:target,behavior:"smooth"});return;}
                    openPlayerProfile(player);
                  }} data-mobile-player-index={ordinal} aria-label={`Karta zawodnika ${player.display_name}`}>
                    <span className="v123-mobile-art">{isRyszardPlayer(player)?<img src="/assets/ryszard-player-card.png" alt="" draggable={false}/>:<PlayerPhoto playerId={player.id}/>}</span>
                    <span className="v123-mobile-shade" aria-hidden="true"/>
                    <span className="v123-mobile-top"><img src="/teamlogos/gm.png" alt="" draggable={false}/><b>{player.shirt_number?`#${player.shirt_number}`:"GM"}</b></span>
                    <span className="v123-mobile-bottom"><small>DELTA 2018 GM</small><strong>{player.display_name}</strong><span>{player.position||"Zawodnik"}</span><em>{s.m} MECZE · {s.g} GOLE · {s.a} ASYSTY</em></span>
                  </button>;
                }))}
              </div>
              <div className="v119-showcase-controls">
                <button type="button" onClick={()=>move(-1)} aria-label="Poprzedni zawodnik"><ChevronLeft size={22}/></button>
                <div className="v119-showcase-progress"><span>{players[active].display_name}</span><small>PRZECIĄGNIJ MYSZKĄ LUB PRZESUŃ PALCEM</small></div>
                <button type="button" onClick={()=>move(1)} aria-label="Następny zawodnik"><ChevronRight size={22}/></button>
              </div>
              <button type="button" className="v119-showcase-open" onClick={()=>openPlayerProfile(players[active])}>OTWÓRZ KARTĘ ZAWODNIKA <ChevronRight size={16}/></button>
            </>;
          })():<p className="v119-showcase-empty">Karty zawodników pojawią się po dodaniu składu.</p>}
        </section>

        <div className="v871-team-dashboard">
          <article className="v871-team-leader devil-card">
            <div className="v8-panel-title"><Crown size={18}/> LIDER KAPITAŃSKI</div>
            {captainLeader?<button onClick={()=>openPlayerProfile(captainLeader)}>
              <div className="v871-team-leader-photo"><span className="v873-flares"/><span className="v873-embers"/><span className="v873-corner tl"/><span className="v873-corner tr"/><span className="v873-plate">CAPTAIN</span>{isRyszardPlayer(captainLeader)?
      <img src="/assets/ryszard-player-card.png" alt={captainLeader.display_name} className="v884-leader-featured-img"/>:
      <PlayerPhoto playerId={captainLeader.id}/>
    }</div>
              <div><span>DELTA 2018 GM</span><b>{captainLeader.display_name}</b><small>{stats[captainLeader.id]?.captain||0} × kapitan</small></div>
              <ChevronRight size={16}/>
            </button>:<p className="muted">Brak danych.</p>}
          </article>

          <article className="v871-team-leader devil-card v876-clickable-leader" role="button" tabIndex={0}
            onClick={()=>topScorer&&stats[topScorer.id]?.g>0&&openPlayerProfile(topScorer)}
            onKeyDown={e=>{if((e.key==="Enter"||e.key===" ")&&topScorer&&stats[topScorer.id]?.g>0)openPlayerProfile(topScorer)}}>
            <div className="v8-panel-title"><Goal size={18}/> NAJLEPSZY STRZELEC</div>
            {topScorer&&stats[topScorer.id]?.g>0?<button type="button" onClick={e=>{e.stopPropagation();openPlayerProfile(topScorer)}}>
              <div className="v871-team-leader-photo"><span className="v873-flares"/><span className="v873-embers"/><span className="v873-corner tl"/><span className="v873-corner tr"/><span className="v873-plate">TOP SCORER</span>{isRyszardPlayer(topScorer)?
      <img src="/assets/ryszard-player-card.png" alt={topScorer.display_name} className="v884-leader-featured-img"/>:
      <PlayerPhoto playerId={topScorer.id}/>
    }</div>
              <div><span>DELTA 2018 GM</span><b>{topScorer.display_name}</b><small>{stats[topScorer.id]?.g||0} goli</small></div>
              <ChevronRight size={16}/>
            </button>:<p className="muted">Pierwszy lider strzelców jeszcze przed nami.</p>}
          </article>

          <article className="v871-team-leader devil-card v876-clickable-leader" role="button" tabIndex={0}
            onClick={()=>topAssister&&stats[topAssister.id]?.a>0&&openPlayerProfile(topAssister)}
            onKeyDown={e=>{if((e.key==="Enter"||e.key===" ")&&topAssister&&stats[topAssister.id]?.a>0)openPlayerProfile(topAssister)}}>
            <div className="v8-panel-title"><Star size={18}/> LIDER ASYST</div>
            {topAssister&&stats[topAssister.id]?.a>0?<button type="button" onClick={e=>{e.stopPropagation();openPlayerProfile(topAssister)}}>
              <div className="v871-team-leader-photo"><span className="v873-flares"/><span className="v873-embers"/><span className="v873-corner tl"/><span className="v873-corner tr"/><span className="v873-plate">TOP ASSIST</span>{isRyszardPlayer(topAssister)?
      <img src="/assets/ryszard-player-card.png" alt={topAssister.display_name} className="v884-leader-featured-img"/>:
      <PlayerPhoto playerId={topAssister.id}/>
    }</div>
              <div><span>DELTA 2018 GM</span><b>{topAssister.display_name}</b><small>{stats[topAssister.id]?.a||0} asyst</small></div>
              <ChevronRight size={16}/>
            </button>:<p className="muted">Pierwsza asysta uruchomi ranking.</p>}
          </article>

          <article className="v871-team-form devil-card">
            <div className="v8-panel-title"><TrendingUp size={18}/> FORMA DRUŻYNY</div>
            <div className="v871-team-form-dots">
              {recentMatches.map(m=><i key={m.id} className={`form-${recentResult(m).toLowerCase()}`}>{recentResult(m)}</i>)}
              {recentMatches.length===0&&<span>Brak rozegranych meczów</span>}
            </div>
            <small>{currentWinStreak>0?`${currentWinStreak} zwycięstw z rzędu`:currentUnbeatenStreak>0?`${currentUnbeatenStreak} mecz(e) bez porażki`:"Nowa seria czeka"}</small>
          </article>
        </div>

        <div className="v871-roster-title">
          <div><span className="eyebrow gold">KADRA</span><h2>Zawodnicy</h2></div>
          <span>{players.length} kart zawodników</span>
        </div>

        <div className="v87-player-grid">{players.map(p=>{
          const s=stats[p.id]||{m:0,starts:0,captain:0,g:0,a:0,mvp:0};
          const achievements=unlockedCount(p);
          return <article className="v87-player-card" key={p.id} onClick={()=>openPlayerProfile(p)}>
            <div className="v87-player-card-bg"/>
            <div className="v87-player-top">
              <span className="v874-club-mark"><img src="/teamlogos/gm.png" alt=""/></span>
              <span className="v87-player-position">{p.position||"ZAWODNIK"}</span>
            </div>
            {isRyszardPlayer(p)?
              <div className="v874-featured-card-image"><img src="/assets/players/ryszard-card.png" alt={`Karta zawodnika ${p.display_name}`}/><span className="v874-featured-badge">FEATURED PLAYER</span></div>
              :<div className={`v87-player-photo ${isRyszardPlayer(p)?"v883-home-featured-media":""}`}>
              {isRyszardPlayer(p)
                ? <img src="/assets/ryszard-player-card.png" alt={p.display_name} className="v883-home-featured-img"/>
                : <PlayerPhoto playerId={p.id}/>
              }
            </div>}
            <div className="v87-player-content">
              <h3>{p.display_name}</h3>
              <div className="v87-player-primary">
                <div><b>{s.g+s.a}</b><span>G+A</span></div>
                <div><b>{s.g}</b><span>GOLE</span></div>
                <div><b>{s.a}</b><span>ASYSTY</span></div>
              </div>
              <div className="v87-player-secondary">
                <span><b>{s.m}</b> mecze</span>
                <span><b>{s.captain}</b> kapitan</span>
                <span><b>{s.mvp}</b> MVP</span>
              </div>
              <div className="v87-player-achievements"><Award size={13}/><span>{achievements} odblokowanych osiągnięć</span></div>
              <button>PROFIL ZAWODNIKA <ChevronRight size={14}/></button>
            </div>
          </article>
        })}</div>
      </section>}

      {tab==="stats"&&<section className="section v8-section-page v890-stats-center">
        <div className="v890-stats-hero">
          <div className="v890-stats-hero-bg"/>
          <div className="v890-stats-copy">
            <span className="eyebrow gold">DELTA 2018 GM • DATA STUDIO</span>
            <h2>CENTRUM <span>STATYSTYK</span></h2>
            <p>Sezon {currentSeason} • liczby, liderzy, rekordy i forma drużyny w jednym miejscu.</p>
          </div>
          <div className="v890-stats-hero-metrics">
            <div><strong>{teamSummary.played}</strong><span>MECZE</span></div>
            <div><strong>{teamSummary.goals}</strong><span>GOLE</span></div>
            <div><strong>{teamSummary.assists}</strong><span>ASYSTY</span></div>
            <div><strong>{winRate}%</strong><span>WYGRANE</span></div>
          </div>
          <div className="v890-form-strip">
            <span>FORMA</span>
            <div>{recentMatches.length?recentMatches.map(m=><i key={m.id} className={`form-${recentResult(m).toLowerCase()}`}>{recentResult(m)}</i>):<em>—</em>}</div>
          </div>
        </div>

        <div className="v890-kpi-grid">
          <article className="v890-kpi devil-card"><Goal size={22}/><span>ŚREDNIA GOLI / MECZ</span><b>{goalsPerMatch.toFixed(1)}</b></article>
          <article className="v890-kpi devil-card"><Star size={22}/><span>ŚREDNIA ASYST / MECZ</span><b>{assistsPerMatch.toFixed(1)}</b></article>
          <article className="v890-kpi devil-card"><Users size={22}/><span>ZAWODNICY Z GOLEM</span><b>{playersWithGoal}</b></article>
          <article className="v890-kpi devil-card"><Zap size={22}/><span>ZAWODNICY Z ASYSTĄ</span><b>{playersWithAssist}</b></article>
        </div>

        <div className="v890-main-grid">
          <article className="v890-podium devil-card v113-stats-podium-panel">
            <div className="v8-panel-title"><Trophy size={18}/> PODIUM SEZONU <span>GOLE + ASYSTY</span></div>
            <PremiumPodium players={players} stats={stats} metric="ga" onOpen={openPlayerProfile}/>
          </article>

          <article className="v890-records devil-card">
            <div className="v8-panel-title"><Award size={18}/> REKORDY SEZONU</div>
            <div className="v890-record-list">
              <div><span>Najwięcej G+A</span><b>{topGA?topGA.display_name:"—"}</b><strong>{topGA?(stats[topGA.id]?.g||0)+(stats[topGA.id]?.a||0):0}</strong></div>
              <div><span>Najwięcej MVP</span><b>{topMvp&&stats[topMvp.id]?.mvp>0?topMvp.display_name:"—"}</b><strong>{topMvp?stats[topMvp.id]?.mvp||0:0}</strong></div>
              <div><span>Najwięcej razy kapitan</span><b>{captainLeader&&stats[captainLeader.id]?.captain>0?captainLeader.display_name:"—"}</b><strong>{captainLeader?stats[captainLeader.id]?.captain||0:0}</strong></div>
              <div><span>Największe zwycięstwo</span><b>{biggestWin?recentOpponent(biggestWin.match):"—"}</b><strong>{biggestWin?`${biggestWin.ours}:${biggestWin.opp}`:"—"}</strong></div>
              <div><span>Najwięcej goli w meczu</span><b>{highestScoringMatch?recentOpponent(highestScoringMatch.match):"—"}</b><strong>{highestScoringMatch?highestScoringMatch.ours:0}</strong></div>
              <div><span>Seria zwycięstw</span><b>DELTA 2018 GM</b><strong>{currentWinStreak}</strong></div>
            </div>
          </article>
        </div>

        <article className="v890-ranking-hub devil-card">
          <div className="v890-ranking-head">
            <div>
              <span className="eyebrow gold">RANKING ZAWODNIKÓW</span>
              <h3>{statsMetricLabel}</h3>
            </div>
            <div className="v890-metric-tabs">
              {[
                ["ga","G+A"],["goals","Gole"],["assists","Asysty"],["mvp","MVP"],["matches","Mecze"],["captain","Kapitan"]
              ].map(([id,label])=><button key={id} className={statsMetric===id?"active":""} onClick={()=>setStatsMetric(id as any)}>{label}</button>)}
            </div>
          </div>

          <div className="v109-player-stat-picker">
            <label>WYBIERZ ZAWODNIKA
              <select value={selectedStatsPlayer?.id||""} onChange={e=>setStatsPlayerId(e.target.value)}>
                {players.slice().sort((a,b)=>a.display_name.localeCompare(b.display_name,"pl")).map(p=><option key={p.id} value={p.id}>{p.display_name}</option>)}
              </select>
            </label>
            {selectedStatsPlayer&&(()=>{const p=selectedStatsPlayer;const s=stats[p.id]||{m:0,starts:0,captain:0,g:0,a:0,mvp:0};return <button className="v109-player-stat-card" onClick={()=>openPlayerProfile(p)}>
              <span className="v109-stat-photo">{isRyszardPlayer(p)?<img src="/assets/ryszard-player-card.png" alt={p.display_name}/>:<PlayerPhoto playerId={p.id}/>}</span>
              <span className="v109-stat-name"><small>INDYWIDUALNE STATYSTYKI</small><b>{p.display_name}</b><em>{p.position||"Zawodnik"} • #{p.shirt_number||"—"}</em></span>
              <span className="v109-stat-numbers"><i><b>{s.m}</b><small>MECZE</small></i><i><b>{s.g}</b><small>GOLE</small></i><i><b>{s.a}</b><small>ASYSTY</small></i><i><b>{s.g+s.a}</b><small>G+A</small></i><i><b>{s.mvp}</b><small>MVP</small></i></span>
              <ChevronRight size={20}/>
            </button>})()}
          </div>
        </article>

        <section className="v893-advanced-zone">
          <div className="v893-zone-head">
            <div>
              <span className="eyebrow gold">AUTOMATYCZNIE Z MECZÓW</span>
              <h3>Advanced Stats</h3>
            </div>
            <p>Bez dodatkowego wpisywania danych — liczone z obecności, składu, goli, asyst i wyników.</p>
          </div>

          <div className="v893-leader-strip">
            <article className="devil-card">
              <span>G+A / MECZ</span>
              <b>{advancedLeaders.gaPerMatch?.display_name||"—"}</b>
              <strong>{advancedLeaders.gaPerMatch?(advancedPlayerStats[advancedLeaders.gaPerMatch.id]?.gaPerMatch||0).toFixed(2):"0.00"}</strong>
            </article>
            <article className="devil-card">
              <span>MECZE Z G+A</span>
              <b>{advancedLeaders.contributionGames?.display_name||"—"}</b>
              <strong>{advancedLeaders.contributionGames?advancedPlayerStats[advancedLeaders.contributionGames.id]?.contributionGames||0:0}</strong>
            </article>
            <article className="devil-card">
              <span>SERIA OBECNOŚCI</span>
              <b>{advancedLeaders.attendanceStreak?.display_name||"—"}</b>
              <strong>{advancedLeaders.attendanceStreak?advancedPlayerStats[advancedLeaders.attendanceStreak.id]?.attendanceStreak||0:0}</strong>
            </article>
            <article className="devil-card">
              <span>NAJLEPSZY MECZ G+A</span>
              <b>{advancedLeaders.bestMatchGA?.display_name||"—"}</b>
              <strong>{advancedLeaders.bestMatchGA?advancedPlayerStats[advancedLeaders.bestMatchGA.id]?.bestMatchGA||0:0}</strong>
            </article>
          </div>

          <div className="v893-player-advanced-grid">
            {players.map(p=>{
              const s=stats[p.id]||{m:0,starts:0,captain:0,g:0,a:0,mvp:0};
              const a=advancedPlayerStats[p.id];
              const badges=automaticMilestones(p);
              return <article className="v893-player-advanced devil-card" key={p.id}>
                <button className="v893-player-head" onClick={()=>openPlayerProfile(p)}>
                  <span className="v893-mini-photo">
                    {isRyszardPlayer(p)?<img src="/assets/ryszard-player-card.png" alt={p.display_name}/>:<PlayerPhoto playerId={p.id}/>}
                  </span>
                  <span><b>{p.display_name}</b><small>{s.m} mecze • {s.g+s.a} G+A</small></span>
                  <ChevronRight size={15}/>
                </button>

                <div className="v893-metrics">
                  <div><strong>{a?.gaPerMatch.toFixed(2)||"0.00"}</strong><span>G+A / MECZ</span></div>
                  <div><strong>{a?.goalGames||0}</strong><span>MECZE Z GOLEM</span></div>
                  <div><strong>{a?.assistGames||0}</strong><span>MECZE Z ASYSTĄ</span></div>
                  <div><strong>{a?.contributionGames||0}</strong><span>MECZE Z G+A</span></div>
                  <div><strong>{a?.doubles||0}</strong><span>DUBLETY</span></div>
                  <div><strong>{a?.hatTricks||0}</strong><span>HAT-TRICKI</span></div>
                  <div><strong>{a?.winsPlayed||0}</strong><span>WYGRANE Z UDZIAŁEM</span></div>
                  <div><strong>{a?.bestMatchGA||0}</strong><span>BEST MATCH G+A</span></div>
                </div>

                <div className="v893-streaks">
                  <span><b>{a?.currentGoalStreak||0}</b> seria goli</span>
                  <span><b>{a?.currentGAStreak||0}</b> seria G+A</span>
                  <span><b>{a?.attendanceStreak||0}</b> obecność</span>
                  <span><b>{a?.starterStreak||0}</b> starter</span>
                </div>

                <div className="v893-auto-badges">
                  {badges.length?badges.map(x=><span key={x.label} title={x.label}><i>{x.icon}</i><b>{x.label}</b><em>{x.value}</em></span>):<small>Pierwsze automatyczne wyróżnienia jeszcze przed nami.</small>}
                </div>

                {a?.bestMatchId&&<button className="v893-best-match" onClick={()=>{
                  const m=matches.find(x=>x.id===a.bestMatchId);
                  if(m)openMatch(m,"summary");
                }}>NAJLEPSZY MECZ <ChevronRight size={12}/></button>}
              </article>
            })}
          </div>
        </section>

        <div className="v890-compare-record-grid">
          <article className="v890-compare devil-card">
            <div className="v8-panel-title"><Users size={18}/> PORÓWNAJ ZAWODNIKÓW</div>
            <div className="v890-compare-selects">
              <select value={comparePlayerA?.id||""} onChange={e=>setCompareA(e.target.value)}>
                {players.map(p=><option value={p.id} key={p.id}>{p.display_name}</option>)}
              </select>
              <span>VS</span>
              <select value={comparePlayerB?.id||""} onChange={e=>setCompareB(e.target.value)}>
                {players.map(p=><option value={p.id} key={p.id}>{p.display_name}</option>)}
              </select>
            </div>

            {comparePlayerA&&comparePlayerB&&<div className="v890-compare-board">
              {[["GOLE","g"],["ASYSTY","a"],["G+A","ga"],["MECZE","m"],["STARTY","starts"],["MVP","mvp"],["KAPITAN","captain"]].map(([label,key])=>{
                const sa=stats[comparePlayerA.id]||{m:0,starts:0,captain:0,g:0,a:0,mvp:0};
                const sb=stats[comparePlayerB.id]||{m:0,starts:0,captain:0,g:0,a:0,mvp:0};
                const va=key==="ga"?sa.g+sa.a:(sa as any)[key];
                const vb=key==="ga"?sb.g+sb.a:(sb as any)[key];
                const max=(statMax as any)[key]||1;
                return <div className="v890-compare-row" key={key}>
                  <span className="left"><b>{va}</b><i style={{width:`${(va/max)*100}%`}}/></span>
                  <small>{label}</small>
                  <span className="right"><i style={{width:`${(vb/max)*100}%`}}/><b>{vb}</b></span>
                </div>
              })}
            </div>}

            <div className="v890-compare-names">
              <button onClick={()=>comparePlayerA&&openPlayerProfile(comparePlayerA)}>{comparePlayerA?.display_name||"—"}</button>
              <button onClick={()=>comparePlayerB&&openPlayerProfile(comparePlayerB)}>{comparePlayerB?.display_name||"—"}</button>
            </div>
          </article>

          <article className="v890-team-form devil-card">
            <div className="v8-panel-title"><TrendingUp size={18}/> FORMA DRUŻYNY</div>
            <div className="v890-form-timeline">
              {recentMatches.length?recentMatches.map(m=>{
                const result=recentResult(m);
                const ours=m.home_team===CLUB?(m.home_score??0):(m.away_score??0);
                const opp=m.home_team===CLUB?(m.away_score??0):(m.home_score??0);
                return <button key={m.id} onClick={()=>setSelectedMatch(m)}>
                  <span className={`result result-${result.toLowerCase()}`}>{result}</span>
                  <div><b>{recentOpponent(m)}</b><small>{datePL(m.match_date)}</small></div>
                  <strong>{ours}:{opp}</strong>
                </button>
              }):<p className="muted">Pierwsze wyniki pojawią się tutaj po rozegranym meczu.</p>}
            </div>
            <div className="v890-streaks">
              <div><span>Bez porażki</span><b>{currentUnbeatenStreak}</b></div>
              <div><span>Zwycięstwa z rzędu</span><b>{currentWinStreak}</b></div>
              <div><span>Bilans bramek</span><b>{teamSummary.goals}</b></div>
            </div>
          </article>
        </div>
      </section>}

      {tab==="achievements"&&<section className="section v8-section-page v108-achievements-page v114-trophy-room">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24,flexWrap:"wrap",gap:12}}>
          <div>
            <span className="eyebrow gold"><Trophy size={14} className="inline mr-1"/> SYSTEM NAGRÓD & PROGRESU 2.0</span>
            <h2 style={{fontSize:22,margin:"4px 0 0 0"}}>KLUBOWE <em>OSIĄGNIĘCIA I ODZNAKI</em></h2>
          </div>
          <button 
            type="button" 
            onClick={()=>{
              setAchievementsTargetPlayer(primaryPlayer || null);
              setAchievementsModalOpen(true);
            }}
            className="btn gold-btn shadow-lg"
            style={{display:"inline-flex",alignItems:"center",gap:8,padding:"10px 20px",fontWeight:900,fontSize:13,borderRadius:12,cursor:"pointer"}}
          >
            <Sparkles size={16}/> OTWÓRZ CENTRUM ODZNAK & ODBIERZ NAGRODY
          </button>
        </div>

        <AchievementsHub 
          playerAchievements={allPlayerAchievements}
          playerName={primaryPlayer?.display_name || "Zawodnik DELTA"}
          onOpenCard={() => {
            setTab("collection");
          }}
        />

        <div style={{ marginTop: 28 }}>
          <div className="v114-trophy-hero devil-card"><span className="eyebrow gold">DELTA 2018 GM · WSPÓLNA GABLOTKA</span><Trophy size={42}/><h2>DRUŻYNOWE <em>KAMIENIE MILOWE</em></h2><p>Wszystkie nasze małe kroki. Jeden wielki sezon.</p><div><b>{unlockedTeamAchievements.length}</b> z {teamAchievements.length} celów zrealizowanych</div></div>
          <div className="v114-trophy-shelf">{teamAchievements.map((item,index)=>{const ok=item.current>=item.target;return <button type="button" className={`v114-trophy-item ${ok?"earned":"waiting"} ${selectedTrophy===item.name?"selected":""}`} key={item.name} onClick={()=>setSelectedTrophy(item.name===selectedTrophy?null:item.name)} aria-expanded={selectedTrophy===item.name}>
            <span className="v114-shelf-spotlight"/><span className="v114-trophy-number">{String(index+1).padStart(2,"0")}</span><span className="v114-trophy-cup"><item.Icon size={49}/></span><strong>{item.name}</strong><small>{ok?"ODKRYTE":"PRZED NAMI"} · {item.category}</small><span className="v114-trophy-plinth">{ok?"★":"◇"}</span>
          </button>})}</div>
          {selectedTrophy&&(()=>{const item=teamAchievements.find(x=>x.name===selectedTrophy);if(!item)return null;const ok=item.current>=item.target;return <article className="v114-trophy-detail devil-card" role="region" aria-label={`Szczegóły: ${item.name}`}><div><span className="eyebrow gold">{ok?"ZDOBYTE TROFEUM":"CEL DRUŻYNY"}</span><h3>{item.name}</h3><p>{item.description}</p><div className="v108-progress"><i style={{width:`${Math.min(100,item.current/item.target*100)}%`}}/></div><small>{item.current} / {item.target} · {ok?"osiągnięcie odblokowane":"w drodze do celu"}</small></div><button type="button" onClick={()=>setSelectedTrophy(null)} aria-label="Zamknij szczegóły trofeum"><X size={20}/></button></article>;})()}
        </div>
      </section>}

      {tab==="chronicle"&&<section className="section v8-section-page v108-chronicle-page">
        <div className="v108-chronicle-hero devil-card"><div><span className="eyebrow gold">KRONIKA SEZONU • {currentSeason}</span><h2>KAŻDY MECZ.<br/><em>NOWY ROZDZIAŁ.</em></h2><p>Nie zapisujemy wyłącznie wyników. Zbieramy emocje, bohaterów, gole i chwile, do których drużyna będzie wracać.</p><span className="v110-chronicle-sign">DELTA 2018 GM • ARCHIWUM DRUŻYNY</span></div><div className="v108-season-minute"><span>SEZON W JEDNEJ MINUCIE</span><div><b>{chronicleMatches.length}<small>MECZÓW</small></b><b>{chronicleWins}<small>WYGRANYCH</small></b><b>{chronicleGoals}<small>GOLI</small></b></div></div></div>
        <nav className="v151-chronicle-seasons" aria-label="Wybierz sezon kroniki"><button className={chronicleSeason==="all"?"active":""} onClick={()=>setChronicleSeason("all")}>CAŁA HISTORIA</button>{seasonOptions.map(label=><button key={label} className={chronicleSeason===label?"active":""} onClick={()=>setChronicleSeason(label)}>SEZON {label}</button>)}</nav>
        <div className="v151-chronicle-gallery">{visibleChronicle.slice(0,6).map((m,index)=><button key={m.id} className="v151-chronicle-cover devil-card" onClick={()=>openMatch(m,"summary")}><span>ROZDZIAŁ {String(visibleChronicle.length-index).padStart(2,"0")}</span><b>{m.home_score}:{m.away_score}</b><strong>{m.home_team===CLUB?m.away_team:m.home_team}</strong><small>{datePL(m.match_date)} · KOLEJKA {m.round_no||"—"}</small></button>)}{visibleChronicle.length===0&&<p>Brak rozegranych spotkań w tym sezonie.</p>}</div>
        <div className="v200-chronicle-timeline">
          {visibleChronicle.length ? (
            visibleChronicle.map((m, index) => {
              const matchEvents = events.filter(e => e.match_id === m.id);
              const goals = matchEvents.filter(e => e.event_type === "goal");
              const starters = lineup.filter(l => l.match_id === m.id && l.is_starter).map(l => players.find(p => p.id === l.player_id)?.display_name).filter(Boolean);
              const captain = lineup.find(l => l.match_id === m.id && l.is_captain);
              const captainName = players.find(p => p.id === captain?.player_id)?.display_name;
              const mvpEvent = matchEvents.find(e => e.event_type === "mvp");
              const mvpPlayer = players.find(p => p.id === mvpEvent?.player_id);
              const heroPlayer = mvpPlayer || (captain ? players.find(p => p.id === captain.player_id) : null) || (goals[0] ? players.find(p => p.id === goals[0].player_id) : null) || players[0];
              const result = recentResult(m);

              return (
                <article className={`v200-chronicle-card devil-card result-${result.toLowerCase()}`} key={m.id}>
                  {/* TOP CHAPTER BANNER */}
                  <div className="chronicle-card-top-bar">
                    <div className="chronicle-chapter-tag">
                      <span className="chapter-badge">ROZDZIAŁ {String(visibleChronicle.length - index).padStart(2, "0")}</span>
                      <span className="round-badge">KOLEJKA {m.round_no || "—"}</span>
                    </div>
                    <div className="chronicle-date-badge">
                      <CalendarDays size={14} className="text-amber-400" />
                      <span>{datePL(m.match_date)}</span>
                      {m.match_time && <small>• {m.match_time.slice(0, 5)}</small>}
                    </div>
                    <div className={`chronicle-result-pill ${result.toLowerCase()}`}>
                      {result === "W" ? "🏆 ZWYCIĘSTWO DELTY" : result === "R" ? "🤝 REMIS" : "🛡️ LEKCJA NA PRZYSZŁOŚĆ"}
                    </div>
                  </div>

                  {/* MAIN MATCH BROADCAST STAGE */}
                  <div className="chronicle-score-stage">
                    {/* Home Team */}
                    <div className="chronicle-team-box home">
                      <div className="team-logo-wrap">
                        <Logo team={m.home_team} size={64} />
                      </div>
                      <strong className="team-name">{m.home_team}</strong>
                      <span className="team-role-tag">GOSPODARZ</span>
                    </div>

                    {/* Center Score Core */}
                    <div className="chronicle-score-center">
                      <div className="score-numbers-display">
                        <span className="score-num">{m.home_score ?? 0}</span>
                        <span className="score-divider">:</span>
                        <span className="score-num">{m.away_score ?? 0}</span>
                      </div>
                      <div className="score-venue-tag">
                        <span>{m.venue || "Twierdza Jordanek / Boisko ligowe"}</span>
                      </div>
                    </div>

                    {/* Away Team */}
                    <div className="chronicle-team-box away">
                      <div className="team-logo-wrap">
                        <Logo team={m.away_team} size={64} />
                      </div>
                      <strong className="team-name">{m.away_team}</strong>
                      <span className="team-role-tag">GOŚĆ</span>
                    </div>
                  </div>

                  {/* THREE-COLUMN STORY & STATS HIGHLIGHTS */}
                  <div className="chronicle-details-grid">
                    {/* Col 1: Hero of the Match (Bohater Spotkania) */}
                    <div className="chronicle-hero-panel">
                      <div className="panel-title-chip">
                        <Star size={14} className="text-amber-400" />
                        <span>BOHATER SPOTKANIA (MVP)</span>
                      </div>
                      <div className="hero-player-showcase">
                        <div className="hero-avatar-circle">
                          {heroPlayer ? (
                            isRyszardPlayer(heroPlayer) ? (
                              <img src="/assets/ryszard-player-card.png" alt="" className="hero-avatar-img" />
                            ) : (
                              <PlayerPhoto playerId={heroPlayer.id} className="hero-avatar-img" />
                            )
                          ) : (
                            <Users size={28} className="text-amber-400" />
                          )}
                        </div>
                        <div className="hero-player-info">
                          <h4 className="hero-name">{mvpPlayer?.display_name || captainName || "Cała Drużyna DELTA"}</h4>
                          <p className="hero-quote">
                            {result === "W"
                              ? "Wspólna praca, odwaga i determinacja przyniosły drużynie zasłużone punkty."
                              : "Cenne doświadczenie boiskowe, które buduje charakter i siłę zespołu."}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Col 2: Goals & Timeline (Bramki i Asysty) */}
                    <div className="chronicle-goals-panel">
                      <div className="panel-title-chip">
                        <Goal size={14} className="text-amber-400" />
                        <span>BRAMKI I WYDARZENIA ({goals.length})</span>
                      </div>
                      <div className="goals-timeline-scroll">
                        {goals.length > 0 ? (
                          goals.slice(0, 4).map((ev, gIdx) => {
                            const scorer = players.find(p => p.id === ev.player_id);
                            const assist = players.find(p => p.id === ev.assist_player_id);
                            return (
                              <div key={ev.id || gIdx} className="goal-timeline-row">
                                <span className="goal-minute-badge">{ev.minute ? `${ev.minute}'` : `⚽`}</span>
                                <div className="goal-scorer-info">
                                  <strong className="scorer-name">{scorer?.display_name || "Gol drużyny"}</strong>
                                  {assist && <small className="assist-name">Asysta: {assist.display_name}</small>}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="no-goals-msg">
                            <Shield size={16} className="text-slate-500" />
                            <span>Brak zarejestrowanych bramek</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Col 3: Lineup & Match Facts (Skład & Fakty) */}
                    <div className="chronicle-facts-panel">
                      <div className="panel-title-chip">
                        <Shield size={14} className="text-amber-400" />
                        <span>FAKTY MECZOWE</span>
                      </div>
                      <div className="facts-chips-list">
                        <div className="fact-item-chip">
                          <Crown size={14} className="text-amber-400" />
                          <span>Kapitan: <b>{captainName || "Brak"}</b></span>
                        </div>
                        <div className="fact-item-chip">
                          <Users size={14} className="text-blue-400" />
                          <span>W wyjściowym: <b>{starters.length} zawodników</b></span>
                        </div>
                        <div className="fact-item-chip">
                          <Zap size={14} className="text-emerald-400" />
                          <span>Akcji bramkowych: <b>{goals.length}</b></span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="chronicle-open-center-btn"
                        onClick={() => openMatch(m, "summary")}
                      >
                        <span>OTWÓRZ CENTRUM MECZU</span>
                        <ChevronRight size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Optional Photo Gallery if images exist */}
                  <MatchGallery matchId={m.id} media={matchMedia} />
                </article>
              );
            })
          ) : (
            <div className="v108-chronicle-empty devil-card">
              <History size={42} />
              <h3>Pierwszy rozdział jeszcze przed nami</h3>
              <p>Po rozegranym meczu pojawi się tutaj wynik, bohaterowie i historia spotkania.</p>
            </div>
          )}
        </div>
      </section>}

      {tab==="club"&&<section className="section v8-section-page v876-club-page">
        <div className="v876-club-hero devil-card">
          <div>
            <span className="eyebrow gold">OFICJALNE INFORMACJE</span>
            <h2>Z klubu</h2>
            <p>Aktualności pobierane automatycznie z oficjalnej strony K.S. Delta Warszawa.</p>
          </div>
          <div className="v879-club-actions">
            <button type="button" className="v879-push-btn" onClick={enableClubPush} disabled={pushState==="working"||pushState==="enabled"}>
              <Bell size={17}/>
              {pushState==="working"?"Włączanie…":pushState==="enabled"?"Powiadomienia włączone":"Włącz powiadomienia na tym urządzeniu"}
            </button>
            {pushMessage&&<span className={pushState==="enabled"?"v880-push-ok":"v879-push-error"}>{pushMessage}</span>}
            <button type="button" className="v882-repair-push" disabled={pushState==="working"} onClick={repairClubPush}>
              NAPRAW / ZAPISZ TELEFON PONOWNIE
            </button>
          </div>
          <div className="v876-sync-status">
            <Shield size={22}/>
            <div><b>DELTA Sync</b><span>{clubUpdates[0]?.synced_at?`Ostatnia synchronizacja ${new Date(clubUpdates[0].synced_at).toLocaleString("pl-PL")}`:"Oczekiwanie na pierwszą synchronizację"}</span></div>
          </div>
        </div>

        <div className="v876-club-feed" id="club-feed-top">
          {clubUpdates.length===0&&<article className="v876-club-empty devil-card">
            <Shield size={32}/><h3>Brak zsynchronizowanych wiadomości</h3><p>Po uruchomieniu DELTA Sync informacje z klubu pojawią się tutaj automatycznie.</p>
          </article>}
          {clubUpdates.map(item=><article id={`club-update-${item.source_key}`} className={`v876-club-card devil-card ${focusedClubKey===item.source_key?"v881-club-focus":""}`} key={item.id}>
            <div className="v876-club-meta">
              <span>K.S. DELTA WARSZAWA</span>
              <time>{new Date(item.published_at).toLocaleDateString("pl-PL")}</time>
            </div>
            {decodeHtmlEntities(item.title).includes("2018 Górny Mokotów")&&<div className="v878-direct-badge">2018 GÓRNY MOKOTÓW</div>}
            <h3>{decodeHtmlEntities(item.title)}</h3>
            {item.body&&<p>{decodeHtmlEntities(item.body)}</p>}
            <a href={item.source_url} target="_blank" rel="noreferrer">ŹRÓDŁO: DELTA.WARSZAWA.PL <ChevronRight size={13}/></a>
          </article>)}
        </div>
      </section>}

      {tab==="news"&&<section className="section v8-section-page">
        <div className="section-title flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="eyebrow gold">CENTRUM WIADOMOŚCI & POWIADOMIEŃ</span>
              {unreadNewsCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black tracking-wider">
                  {unreadNewsCount} NOWYCH
                </span>
              )}
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-wider m-0">Wiadomości & Zdarzenia</h2>
            <p className="v141-hof-intro text-xs text-slate-400 mt-1">
              Oficjalne komunikaty, aktualności klubowe ze strony DELTY, powołania, zmiany terminów i alerty.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {unreadNewsCount > 0 && (
              <button
                type="button"
                className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-white/10 text-xs font-bold text-slate-300 hover:text-white transition-all flex items-center gap-1.5"
                onClick={handleMarkAllNewsRead}
              >
                <Check size={14} className="text-emerald-400" />
                <span>Oznacz wszystkie jako przeczytane</span>
              </button>
            )}
            {staff && (
              <button
                type="button"
                className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-xs font-black text-amber-400 hover:bg-amber-500/30 transition-all flex items-center gap-1.5"
                onClick={() => setSyncControlModalOpen(true)}
              >
                <RefreshCw size={14} />
                <span>DELTA SYNC 2.0</span>
              </button>
            )}
            {(staff||props.userPermissions.can_manage_news)&&(
              <button className="btn gold-btn" onClick={openAddNewsModal}>
                <Newspaper size={16}/> Dodaj komunikat
              </button>
            )}
          </div>
        </div>

        {/* 9 FILTER CHIPS */}
        <div className="v200-news-filter-chips flex items-center gap-2 overflow-x-auto py-3 no-scrollbar">
          {[
            { id: "all", label: "Wszystkie", count: unifiedNewsItems.length },
            { id: "matches", label: "Mecze", count: unifiedNewsItems.filter(i => i.category === "matches").length },
            { id: "trainings", label: "Treningi", count: unifiedNewsItems.filter(i => i.category === "trainings").length },
            { id: "club", label: "Klub", count: unifiedNewsItems.filter(i => i.category === "club").length },
            { id: "sync", label: "DELTA Sync", count: unifiedNewsItems.filter(i => i.category === "sync").length },
            { id: "fantasy", label: "Fantasy", count: unifiedNewsItems.filter(i => i.category === "fantasy").length },
            { id: "achievements", label: "Osiągnięcia", count: unifiedNewsItems.filter(i => i.category === "achievements").length },
            { id: "gallery", label: "Galeria", count: unifiedNewsItems.filter(i => i.category === "gallery").length },
            { id: "multimedia", label: "Multimedia", count: unifiedNewsItems.filter(i => i.category === "multimedia").length },
          ].map(chip => (
            <button
              key={chip.id}
              type="button"
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                newsFilter === chip.id
                  ? "bg-red-600 text-white shadow-lg shadow-red-600/30 font-black border border-red-500"
                  : "bg-slate-900/80 text-slate-400 border border-white/10 hover:border-white/20 hover:text-white"
              }`}
              onClick={() => setNewsFilter(chip.id)}
            >
              <span>{chip.label}</span>
              {chip.count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${newsFilter === chip.id ? "bg-black/40 text-white" : "bg-white/10 text-slate-400"}`}>
                  {chip.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* UNIFIED NEWS FEED GRID */}
        <div className="news-grid mt-2">
          {filteredNewsItems.map(item => {
            const isRead = !!readNewsMap[item.id];
            const isUrgent = item.importance === "URGENT";
            const isImportant = item.importance === "IMPORTANT";
            return (
              <article 
                className={`news-card devil-card ${isUrgent ? "is-urgent" : isImportant ? "is-important" : ""} ${isRead ? "is-read" : "is-unread"}`} 
                key={item.id}
              >
                <div className="v200-news-topline">
                  <div className="flex items-center gap-2">
                    <span className={`tag ${isUrgent ? "priority-urgent" : isImportant ? "priority-important" : "bg-slate-800 text-slate-300"}`}>
                      {isUrgent ? "🔴 PILNE" : isImportant ? "🟡 WAŻNE" : item.typeLabel}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      {item.source_name}
                    </span>
                  </div>

                  <div className="v200-news-actions-mini">
                    {staff && item.originalNewsItem && (
                      <button 
                        type="button" 
                        className="v200-news-edit-btn" 
                        onClick={() => openEditNewsModal(item.originalNewsItem!)} 
                        title="Edytuj wiadomość"
                      >
                        ✏️ Edytuj
                      </button>
                    )}
                    <button 
                      type="button" 
                      className={`v200-read-toggle-btn ${isRead ? "is-confirmed" : ""}`}
                      onClick={() => handleToggleReadNews(item.id)}
                      title={isRead ? "Wiadomość została odczytana" : "Kliknij, aby potwierdzić przeczytanie"}
                    >
                      {isRead ? "✓ Przeczytano" : "Potwierdź odczytanie"}
                    </button>
                  </div>
                </div>

                <h3 className="text-white font-bold text-base mt-2 mb-1">{item.title}</h3>
                {item.body && <p style={{whiteSpace:"pre-wrap"}} className="text-xs text-slate-300 leading-relaxed">{item.body}</p>}
                
                <div className="v200-news-meta mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                  <small className="text-slate-500 text-[11px]">
                    {new Date(item.published_at).toLocaleString("pl-PL", {day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit"})}
                  </small>
                  <div className="flex items-center gap-2">
                    {item.deepLinkTab && (
                      <button
                        type="button"
                        className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
                        onClick={() => {
                          setTab(item.deepLinkTab as any);
                        }}
                      >
                        <span>Przejdź</span>
                        <ChevronRight size={13} />
                      </button>
                    )}
                    {item.source_url && (
                      <a 
                        href={item.source_url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                      >
                        <span>DELTA.WARSZAWA.PL</span>
                        <ExternalLink size={12} />
                      </a>
                    )}
                    {isRead && <span className="v200-read-badge text-[10px] text-emerald-400 font-bold">✓ Odczytane</span>}
                  </div>
                </div>
              </article>
            );
          })}
          {filteredNewsItems.length === 0 && (
            <div className="v101-empty-stage">
              <Newspaper size={34}/>
              <b>Brak wiadomości w wybranej kategorii.</b>
            </div>
          )}
        </div>
      </section>}
    </main>

    {/* NAVIGATION 2.0: KAFELKOWY HUB "WIĘCEJ" (KAFELKI PREMIUM + ADMIN ACCESS) */}
    <DeltaMoreMenuSheet
      isOpen={mobileMoreOpen}
      onClose={() => setMobileMoreOpen(false)}
      activeTab={tab}
      collectionCount={{ owned: 18, total: 66 }}
      achievementsCount={{ unlocked: 14, total: 22 }}
      hasNewGalleryPhoto={true}
      tvTransmissionsCount={2}
      playersCount={players.length}
      canOpenAdmin={canOpenAdmin}
      adminRoleLabel={staff ? "ADMIN" : "POMOCNIK"}
      onNavigate={(targetTab, extra) => {
        if (targetTab === "admin") {
          window.location.href = "/admin";
        } else if (targetTab === "players") {
          setTab("players");
        } else if (targetTab === "typer") {
          setTyperModalOpen(true);
        } else if (targetTab === "game") {
          window.location.href = "/game";
        } else if (targetTab === "collection") {
          setTab("collection");
        } else if (targetTab === "achievements") {
          setTab("achievements");
        } else if (targetTab === "gallery") {
          setPhotoBoothModalOpen(true);
        } else if (targetTab === "tv") {
          setSocialFeedOpen(true);
        } else if (targetTab === "chronicle") {
          setTab("chronicle");
        } else if (targetTab === "hall") {
          setTab("hall");
        } else if (targetTab === "settings") {
          setNotifPrefsModalOpen(true);
        } else if (targetTab === "knowledge") {
          setKnowledgeModalOpen(true);
        } else {
          setTab(targetTab as any);
        }
      }}
    />

    {/* NAVIGATION 2.0: DOKŁADNIE 5 GŁÓWNYCH ELEMENTÓW (BOTTOM BAR) */}
    <nav className="bottom-nav v200-bottom-nav" aria-label="Główna nawigacja drużyny">
      {/* 1. HOME */}
      <button 
        type="button" 
        className={`v200-nav-btn ${tab === "home" ? "active" : ""}`} 
        onClick={handleGoHomeTop}
        aria-label="HOME"
      >
        <div className="v200-nav-icon-wrap">
          <Home size={20} />
        </div>
        <span>HOME</span>
      </button>

      {/* 2. MECZE (z poświatą Matchday gdy mecz dziś) */}
      <button 
        type="button" 
        className={`v200-nav-btn ${tab === "matches" || tab === "calendar" ? "active" : ""} ${isMatchToday ? "matchday-glow" : ""}`} 
        onClick={() => { setMobileMoreOpen(false); setTab("matches"); }}
        aria-label="MECZE"
      >
        <div className="v200-nav-icon-wrap">
          <CalendarDays size={20} />
          {isMatchToday && <span className="v200-live-dot" title="Dziś mecz!" />}
        </div>
        <span>MECZE</span>
      </button>

      {/* 3. TRENING (z kropką LIVE gdy trwa trening) */}
      <button 
        type="button" 
        className={`v200-nav-btn ${tab === "training" ? "active" : ""}`} 
        onClick={() => { setMobileMoreOpen(false); setTab("training"); }}
        aria-label="TRENING"
      >
        <div className="v200-nav-icon-wrap">
          <Zap size={20} />
          {isTrainingToday && <span className="v200-live-dot" title="Trening w toku" />}
        </div>
        <span>TRENING</span>
      </button>

      {/* 4. WIADOMOŚCI (z licznikiem nieprzeczytanych / nowych) */}
      <button 
        type="button" 
        className={`v200-nav-btn ${tab === "news" ? "active" : ""}`} 
        onClick={() => { setMobileMoreOpen(false); setTab("news"); }}
        aria-label="WIADOMOŚCI"
      >
        <div className="v200-nav-icon-wrap">
          <Newspaper size={20} />
          {unreadNewsCount > 0 && (
            <span className="v200-nav-badge">
              {unreadNewsCount > 9 ? "9+" : unreadNewsCount}
            </span>
          )}
        </div>
        <span>WIADOMOŚCI</span>
      </button>

      {/* 5. WIĘCEJ (Kafelkowy Hub) */}
      <button 
        type="button" 
        className={`v200-nav-btn ${mobileMoreOpen || !["home", "matches", "calendar", "training", "news"].includes(tab) ? "active" : ""}`} 
        onClick={() => setMobileMoreOpen(v => !v)}
        aria-label="WIĘCEJ"
        aria-expanded={mobileMoreOpen}
        aria-controls="delta-mobile-more-menu"
      >
        <div className="v200-nav-icon-wrap">
          <LayoutGrid size={20} />
        </div>
        <span>WIĘCEJ</span>
      </button>
    </nav>

    {selectedPlayer&&createPortal(<section className="v111-player-screen v112-player-screen" role="dialog" aria-modal="true" aria-label={`Profil zawodnika: ${selectedPlayer.display_name}`}>
      {playerIntro&&<div className="v112-intro" aria-hidden="true"><span className="v112-intro-glow"/><img src="/teamlogos/gm.png" alt=""/><strong>{selectedPlayer.shirt_number?`#${selectedPlayer.shirt_number}`:"DELTA"}</strong><span>{selectedPlayer.display_name}</span><small>DELTA PLAYER EXPERIENCE</small></div>}
      <div className="v111-player-scroll v112-player-scroll" key={selectedPlayer.id}>
        <div className="v111-profile-container v112-profile-container">
          <header className="v111-profile-toolbar v112-toolbar">
            <button type="button" className="v111-profile-back" onClick={()=>setSelectedPlayer(null)}><ChevronLeft size={19}/> Wróć do drużyny</button>
            <span><img src="/teamlogos/gm.png" alt=""/> DELTA 2018 GM <span className="v111-toolbar-accent">/ PLAYER EXPERIENCE</span></span>
          </header>
          <div className="v112-player-banner"><span>DELTA PLAYER EXPERIENCE · {seasonLabel()}</span><h1>{selectedPlayer.display_name}</h1><p>Każdy zawodnik. Własna historia. Jedna drużyna.</p></div>
          <div className="v113-mobile-command" aria-hidden="true">
            <div className="v113-mobile-command-main">
              <span className="v113-mobile-kicker">PLAYER DOSSIER</span>
              <strong>{selectedPlayer.display_name}</strong>
              <small>{selectedPlayer.position||"Zawodnik"} · {selectedPlayer.shirt_number?`#${selectedPlayer.shirt_number}`:"DELTA GM"}</small>
            </div>
            <img src="/teamlogos/gm.png" alt=""/>
          </div>
          <div className="v111-profile-grid v112-profile-grid">
            <div className="v112-character-side">
              <PlayerCard3D
                player={selectedPlayer}
                stats={{
                  matches: stats[selectedPlayer.id]?.m || 0,
                  goals: stats[selectedPlayer.id]?.g || 0,
                  assists: stats[selectedPlayer.id]?.a || 0,
                  trainings: trainingPlayerStats[selectedPlayer.id]?.sessions || 0,
                  mvp: stats[selectedPlayer.id]?.mvp || 0,
                  captain: stats[selectedPlayer.id]?.captain || 0,
                  streak: trainingPlayerStats[selectedPlayer.id]?.attendanceStreak || 0
                }}
                unlockedBadgesCount={unlockedCount(selectedPlayer)}
                theme="gold"
                unlockedThemes={unlockedPacksMap[selectedPlayer.id] || { gold: false, inferno: false, legend: false }}
                onUnlockTheme={(theme) => handleUnlockTheme(selectedPlayer.id, theme)}
                onOpenPackModal={()=>setPackModalOpen(true)}
              />
              <div style={{marginTop:10,display:"flex",flexDirection:"column",gap:6,width:"100%",alignItems:"center"}}>
                <button
                  type="button"
                  onClick={()=>setDpRulesModalOpen(true)}
                  style={{display:"inline-flex",alignItems:"center",gap:6,padding:"7px 12px",fontSize:11,fontWeight:800,background:"rgba(246,201,82,0.08)",border:"1px solid rgba(246,201,82,0.25)",color:"#f6c952",borderRadius:6,cursor:"pointer"}}
                >
                  <Coins size={14}/> <span>Zasady punktów DP & Nagrody</span>
                </button>
                {staff && (
                  <a 
                    href="/dev/inferno-walkout" 
                    target="_blank" 
                    rel="noreferrer"
                    style={{display:"inline-flex",alignItems:"center",gap:6,padding:"7px 12px",fontSize:11,fontWeight:800,background:"rgba(226,46,48,0.15)",border:"1px solid rgba(226,46,48,0.35)",color:"#ff8088",borderRadius:6,textDecoration:"none"}}
                  >
                    <span>🎨 Otwórz Edytor Kart 3D / Walkout</span>
                  </a>
                )}
              </div>
            </div>
            <div className="v111-player-content v112-player-content">
              <nav className="v112-profile-tabs" aria-label="Sekcje profilu zawodnika">
                {([["overview","Profil","shield"],["cards","Moje karty","layers"],["achievements","Odznaki","award"],["history","Historia","history"],["training","Trening","training"]] as const).map(([id,label])=><button type="button" key={id} className={playerSection===id?"active":""} onClick={()=>setPlayerSection(id)} aria-current={playerSection===id?"page":undefined}>{label}</button>)}
              </nav>
              {(()=>{
                const p=selectedPlayer;
                const s=stats[p.id]||{m:0,starts:0,captain:0,g:0,a:0,mvp:0};
                const t=trainingPlayerStats[p.id]||{sessions:0,goals:0,assists:0,ga:0,attendanceStreak:0,games:0,wins:0};
                const involved=matches.filter(m=>m.status==="played"&&(attendance.some(a=>a.match_id===m.id&&a.player_id===p.id&&(a.status==="present"||a.status==="yes"))||lineup.some(l=>l.match_id===m.id&&l.player_id===p.id)||events.some(e=>e.match_id===m.id&&(e.player_id===p.id||e.assist_player_id===p.id)))).slice().sort((a,b)=>b.match_date.localeCompare(a.match_date));
                const milestones=[
                  {name:"Pierwszy występ",match:involved[involved.length-1]},
                  {name:"Pierwszy gol",match:involved.slice().reverse().find(m=>events.some(e=>e.match_id===m.id&&e.event_type==="goal"&&e.player_id===p.id))},
                  {name:"Pierwsza asysta",match:involved.slice().reverse().find(m=>events.some(e=>e.match_id===m.id&&e.event_type==="goal"&&e.assist_player_id===p.id))},
                  {name:"Pierwsza szóstka",match:involved.slice().reverse().find(m=>lineup.some(l=>l.match_id===m.id&&l.player_id===p.id&&l.is_starter))},
                  {name:"Pierwszy mecz jako kapitan",match:involved.slice().reverse().find(m=>lineup.some(l=>l.match_id===m.id&&l.player_id===p.id&&l.is_captain))},
                ].filter((x):x is {name:string;match:Match}=>Boolean(x.match));
                const achieved=playerAchievements(p);
                const archetype=playerArchetype(s,t);
                const unlocked=unlockedCount(p);
                return <>
                <div className="v112-intro-summary">
                  <span>SEZON {seasonLabel()}</span>
                  <h2>{p.display_name}</h2>
                  <p><img src="/teamlogos/gm.png" alt=""/> {p.position||"Zawodnik"} <span>·</span> {p.shirt_number?`Numer ${p.shirt_number}`:"DELTA GM"}</p>
                  <div className="v113-profile-ribbon">
                    <span><b>{archetype}</b><small>profil zawodnika</small></span>
                    <span><b>{unlocked}</b><small>odblokowane odznaki</small></span>
                    <span><b>{s.g+s.a}</b><small>akcje G+A</small></span>
                  </div>
                </div>
                {playerSection==="overview"&&<>
                  <div className="v111-profile-section-heading"><Trophy size={18}/> LICZBY Z BOISKA <span>OFICJALNE MECZE · TRYB PREMIUM</span></div>
                  <div className="v111-player-kpis v112-player-kpis">
                    <div><span>MECZE</span><b>{s.m}</b><small>Występy</small></div><div><span>GOLE</span><b>{s.g}</b><small>Strzelone</small></div>
                    <div><span>ASYSTY</span><b>{s.a}</b><small>Podania do bramki</small></div><div><span>G + A</span><b>{s.g+s.a}</b><small>Razem</small></div>
                  </div>
                  <div className="v111-player-milestones v112-milestones"><div><Crown size={22}/><span><b>{s.captain}</b> razy kapitan</span></div><div><Users size={22}/><span><b>{s.starts}</b> razy w pierwszej szóstce</span></div><div><Star size={22}/><span><b>{s.mvp}</b> wyróżnień MVP</span></div></div>
                  
                  {/* RADAR UMIEJĘTNOŚCI (EA FC SKILL RADAR) */}
                  <PlayerSkillRadar
                    stats={{
                      matches: s.m,
                      starts: s.starts,
                      captain: s.captain,
                      goals: s.g,
                      assists: s.a,
                      mvp: s.mvp,
                      trainings: t.sessions,
                      trainingGoals: t.goals,
                      trainingAssists: t.assists,
                      streak: t.attendanceStreak
                    }}
                    playerName={p.display_name}
                    position={p.position}
                  />

                  {/* MOJE REKORDY (PLAYER RECORDS) */}
                  <PlayerRecordsView 
                    records={calculatePlayerRecords(p.id, stats, trainingPlayerStats, maxGoalsSingleMatch, 8, unlockedCount(p))}
                    playerName={p.display_name}
                    seasonLabel={`Sezon ${seasonLabel()}`}
                  />

                  <div className="v112-highlight-card"><div><span>MOJA DROGA W DELCIE</span><strong>{milestones.length?`${milestones.length} pierwszych kroków w historii` :"Pierwsze piłkarskie historie przed nami"}</strong><p>Każde osiągnięcie ma swój mecz i swoją datę.</p></div><button onClick={()=>setPlayerSection("history")}>Zobacz historię <ChevronRight size={15}/></button></div>
                  <div className="v111-profile-section-heading"><Award size={18}/> MOJA GABLOTKA <span>{unlockedCount(p)} / {achieved.length} ODKRYTYCH</span></div>
                  <div className="v112-quick-badges">{achieved.filter(([,ok])=>ok).slice(0,4).map(([name])=><span key={String(name)}><Medal size={17}/>{name}</span>)}{unlockedCount(p)===0&&<p>Pierwsza odznaka czeka na odkrycie.</p>}</div>
                  <button className="v112-wide-action" onClick={()=>setPlayerSection("cards")}>Otwórz kolekcję kart zawodnika <ChevronRight size={16}/></button><button className="v112-wide-action" onClick={()=>setPlayerSection("achievements")}>Otwórz gablotkę odznak <ChevronRight size={16}/></button>
                </>}
                {playerSection==="cards"&&<>
                  <div className="v111-profile-section-heading"><Medal size={18}/> MOJA KOLEKCJA <span>PIŁKARSKIE MOMENTY (KLIKNIJ ABY OTWORZYĆ)</span></div>
                  <p className="v112-section-note">Każda karta przedstawia prawdziwe wydarzenie z historii zawodnika. Wszystkie karty są wyjątkowe — bez ocen umiejętności i rywalizacji między dziećmi.</p>
                  <div className="v114-collection-grid">{([
                    {id:"debut",name:"Pierwszy mecz",icon:Shield,match:milestones.find(x=>x.name==="Pierwszy występ")?.match,theme:"rookie",rarity:"rare" as const,desc:"Pierwszy oficjalny występ w barwach DELTA GM."},
                    {id:"goal",name:"Pierwszy gol",icon:Goal,match:milestones.find(x=>x.name==="Pierwszy gol")?.match,theme:"fire",rarity:"epic" as const,desc:"Pierwsza zdobyta bramka dla drużyny w oficjalnym spotkaniu."},
                    {id:"assist",name:"Pierwsza asysta",icon:Star,match:milestones.find(x=>x.name==="Pierwsza asysta")?.match,theme:"gold",rarity:"rare" as const,desc:"Kluczowe podanie, które otworzyło drogę do bramki."},
                    {id:"six",name:"Pierwsza szóstka",icon:Users,match:milestones.find(x=>x.name==="Pierwsza szóstka")?.match,theme:"squad",rarity:"rare" as const,desc:"Wyjściowy skład i rozpoczęcie meczu od pierwszej minuty."},
                    {id:"captain",name:"Pierwszy raz kapitan",icon:Crown,match:milestones.find(x=>x.name==="Pierwszy mecz jako kapitan")?.match,theme:"captain",rarity:"legendary" as const,desc:"Wyprowadzenie zespołu na murawę z opaską kapitańską."},
                  ] as const).map(card=><button type="button" key={card.id} className={`v114-collectible ${card.theme} ${card.match?"earned":"locked"} ${selectedCollectible===card.id?"selected":""}`} onClick={()=>{
                    setSelectedCollectible(selectedCollectible===card.id?null:card.id);
                    setSelectedBadgeDetail({
                      id: card.id,
                      name: card.name,
                      category: "KARTA ZAWODNIKA",
                      description: card.match ? `${card.desc} Zapisano w meczu z ${recentOpponent(card.match)}.` : "Ta karta zostanie odblokowana automatycznie po odpowiednim występie w meczu.",
                      date: card.match ? datePL(card.match.match_date) : undefined,
                      opponent: card.match ? recentOpponent(card.match) : undefined,
                      unlocked: Boolean(card.match),
                      rarity: card.rarity
                    });
                  }} aria-expanded={selectedCollectible===card.id}>
                    <span className="v114-card-kicker">DELTA 2018 GM · {card.match?"ODKRYTA":"DO ODKRYCIA"}</span><span className="v114-card-portrait"><PlayerPhoto playerId={p.id}/></span><span className="v114-card-symbol"><card.icon size={26}/></span><strong>{card.name}</strong><span>{p.display_name}</span><small>{card.match?datePL(card.match.match_date):"Przed nami"}</small>
                  </button>)}</div>
                </>}
                {playerSection==="achievements"&&<>
                  <AchievementsHub 
                    playerAchievements={calculatePlayerAchievements(p.id, stats, trainingPlayerStats, maxGoalsSingleMatch)}
                    playerName={p.display_name}
                  />
                </>}
                {playerSection==="history"&&<>
                  <div className="v111-profile-section-heading"><History size={18}/> MOJA HISTORIA <span>WYDARZENIA Z ZAPISANYCH MECZÓW</span></div>
                  <p className="v112-section-note">Pierwsze kroki oraz ostatnie spotkania. Bez dopisywania fikcyjnych osiągnięć.</p>
                  <div className="v112-timeline">{milestones.length?milestones.map(x=><div className="v112-timeline-event" key={x.name}><span className="v112-timeline-dot"/><small>{datePL(x.match.match_date)}</small><strong>{x.name}</strong><span>{recentOpponent(x.match)}</span><button type="button" onClick={()=>{setSelectedPlayer(null);openMatch(x.match);}}>Otwórz mecz <ChevronRight size={14}/></button></div>):<p>Historia pojawi się po zapisaniu pierwszych występów w aplikacji.</p>}</div>
                  <div className="v111-profile-section-heading"><Goal size={18}/> MOJE OSTATNIE MECZE</div>
                  <div className="v112-match-list">{involved.slice(0,5).map(m=>{const me=events.filter(e=>e.match_id===m.id);const g=me.filter(e=>e.event_type==="goal"&&e.player_id===p.id).length;const a=me.filter(e=>e.event_type==="goal"&&e.assist_player_id===p.id).length;return <button type="button" key={m.id} onClick={()=>{setSelectedPlayer(null);openMatch(m);}}><span>{datePL(m.match_date)}</span><strong>{recentOpponent(m)}</strong><small>{m.home_score??"–"} : {m.away_score??"–"}</small><em>{g} G · {a} A</em><ChevronRight size={15}/></button>;})}{involved.length===0&&<p>Brak zapisanych występów.</p>}</div>
                </>}
                {playerSection==="training"&&<>
                  <div className="v111-profile-section-heading"><Zap size={18}/> TRENING I ROZWÓJ <span>OSOBNE STATYSTYKI TRENINGOWE</span></div>
                  <p className="v112-section-note">Gole i asysty z gier treningowych nie są doliczane do oficjalnych meczów.</p>
                  <div className="v111-player-kpis v112-player-kpis"><div><span>TRENINGI</span><b>{t.sessions}</b><small>Obecności</small></div><div><span>GRY</span><b>{t.games}</b><small>Udział w grach</small></div><div><span>GOLE</span><b>{t.goals}</b><small>Treningowe</small></div><div><span>ASYSTY</span><b>{t.assists}</b><small>Treningowe</small></div></div>
                  <div className="v112-highlight-card"><div><span>RAZEM NA BOISKU</span><strong>Piłkarskie duety</strong><p>Wspólne występy w tych samych drużynach podczas gier treningowych.</p></div></div>
                  <div className="v112-duo-list">{trainingChemistry.filter(x=>x.a.id===p.id||x.b.id===p.id).sort((a,b)=>b.games-a.games).slice(0,5).map(x=>{const mate=x.a.id===p.id?x.b:x.a;return <button key={mate.id} type="button" onClick={()=>openPlayerProfile(mate)}><span className="v112-mate-photo"><PlayerPhoto playerId={mate.id}/></span><strong>{mate.display_name}</strong><small>{x.games} wspólnych gier</small><ChevronRight size={15}/></button>;})}{!trainingChemistry.some(x=>x.a.id===p.id||x.b.id===p.id)&&<p>Duety pojawią się po zapisaniu składów gier treningowych.</p>}</div>
                </>}
                </>;
              })()}
            </div>
          </div>
        </div>
      </div>
      {selectedBadgeDetail&&<BadgeCelebrationModal
        badge={selectedBadgeDetail}
        player={selectedPlayer}
        onClose={()=>setSelectedBadgeDetail(null)}
        onOpenMatch={selectedBadgeDetail.date?(()=>{
          const m=matches.find(x=>datePL(x.match_date)===selectedBadgeDetail.date);
          return m?()=>{setSelectedBadgeDetail(null);setSelectedPlayer(null);openMatch(m,"summary");}:undefined;
        })():undefined}
      />}
    </section>,document.body)}

    {selectedMatch&&matchPlacement==="overlay"&&<MatchCenterModal
      key={`${selectedMatch.id}-${matchInitialTab}`}
      match={selectedMatch}
      players={players}
      attendance={attendance}
      lineup={lineup}
      events={events}
      currentUserId={props.profile.id}
      currentUserRole={props.profile.role}
      canManageMatch={canManageMatches}
      canEditEvents={canEditMatchEvents}
      parentPlayerIds={props.parentPlayerIds}
      initialTab={matchInitialTab}
      onClose={()=>setSelectedMatch(null)}
      onDataChange={(d)=>{
        if(d.match){setMatches(prev=>prev.map(m=>m.id===d.match!.id?d.match!:m));setSelectedMatch(d.match);}
        if(d.attendance)setAttendance(d.attendance);
        if(d.lineup)setLineup(d.lineup);
        if(d.events)setEvents(d.events);
      }}
    />}

    {packModalOpen && selectedPlayer && (
      <PackOpeningModal
        isOpen={packModalOpen}
        onClose={()=>setPackModalOpen(false)}
        player={selectedPlayer}
        stats={{
          matches: stats[selectedPlayer.id]?.m || 0,
          goals: stats[selectedPlayer.id]?.g || 0,
          assists: stats[selectedPlayer.id]?.a || 0,
          trainings: trainingPlayerStats[selectedPlayer.id]?.sessions || 0,
          mvp: stats[selectedPlayer.id]?.mvp || 0,
          captain: stats[selectedPlayer.id]?.captain || 0,
          streak: trainingPlayerStats[selectedPlayer.id]?.attendanceStreak || 0
        }}
        unlockedBadgesCount={unlockedCount(selectedPlayer)}
        theme="gold"
        onUnlockCard={(unlockedTheme) => {
          handleUnlockTheme(selectedPlayer.id, unlockedTheme);
        }}
      />
    )}

    {achievementsModalOpen && (
      <AchievementsModal
        isOpen={achievementsModalOpen}
        onClose={() => setAchievementsModalOpen(false)}
        playerId={achievementsTargetPlayer?.id || null}
        playerName={achievementsTargetPlayer?.display_name || undefined}
      />
    )}

    {autoUnlockQueue.length > 0 && autoUnlockQueue[autoUnlockIndex] && (
      <AchievementUnlock
        grantId={autoUnlockQueue[autoUnlockIndex].id}
        title={autoUnlockQueue[autoUnlockIndex].title}
        description={autoUnlockQueue[autoUnlockIndex].description}
        variant={
          autoUnlockQueue[autoUnlockIndex].tier === "diamond" || autoUnlockQueue[autoUnlockIndex].id?.includes("inferno")
            ? "inferno"
            : autoUnlockQueue[autoUnlockIndex].tier === "silver"
            ? "platinum" as any
            : "gold"
        }
        eyebrow={
          autoUnlockQueue[autoUnlockIndex].tier === "diamond"
            ? "LEGENDARNE OSIĄGNIĘCIE DIAMENTOWE"
            : "ODBLOKOWANA ODZNAKA DELTA"
        }
        grantDate={
          autoUnlockQueue[autoUnlockIndex].unlocked_at
            ? new Date(autoUnlockQueue[autoUnlockIndex].unlocked_at).toLocaleDateString("pl-PL", {
                day: "2-digit",
                month: "long",
                year: "numeric"
              })
            : new Date().toLocaleDateString("pl-PL", {
                day: "2-digit",
                month: "long",
                year: "numeric"
              })
        }
        serialNumber={`#${(autoUnlockQueue[autoUnlockIndex].sort_order || 1).toString().padStart(3, "0")} / 2018 GM`}
        playerName={primaryPlayer?.display_name || props.profile.display_name || "Zawodnik DELTA"}
        playerNumber={primaryPlayer?.shirt_number || "10"}
        queueIndex={autoUnlockIndex + 1}
        queueTotal={autoUnlockQueue.length}
        progress={
          autoUnlockQueue[autoUnlockIndex].target_value > 1
            ? {
                current: Math.min(autoUnlockQueue[autoUnlockIndex].current_value, autoUnlockQueue[autoUnlockIndex].target_value),
                max: autoUnlockQueue[autoUnlockIndex].target_value,
                unit: autoUnlockQueue[autoUnlockIndex].unit,
                label: "Zrealizowany cel:"
              }
            : undefined
        }
        onClose={handleAutoUnlockClaim}
        onClaim={handleAutoUnlockClaim}
      />
    )}

    {typerModalOpen && (
      <DeltaTyperModal
        isOpen={typerModalOpen}
        onClose={() => setTyperModalOpen(false)}
      />
    )}

    {knowledgeModalOpen && (
      <DeltaKnowledgeCornerModal
        isOpen={knowledgeModalOpen}
        onClose={() => setKnowledgeModalOpen(false)}
      />
    )}

    {tacticsModalOpen && (
      <DeltaTacticsBoardModal
        isOpen={tacticsModalOpen}
        onClose={() => setTacticsModalOpen(false)}
        players={players}
      />
    )}

    {matchBriefModalOpen && (
      <DeltaMatchBriefModal
        isOpen={matchBriefModalOpen}
        onClose={() => setMatchBriefModalOpen(false)}
        matches={matches}
      />
    )}

    {questsModalOpen && (
      <DeltaWeeklyQuestsModal
        isOpen={questsModalOpen}
        onClose={() => setQuestsModalOpen(false)}
        onNavigateAction={(actionKey) => {
          if (actionKey === "knowledge") setKnowledgeModalOpen(true);
          else if (actionKey === "typer") setTyperModalOpen(true);
          else if (actionKey === "attendance") setTab("teamcenter");
          else if (actionKey === "cards") setTab("collection");
          else if (actionKey === "fanvote" && matches.length > 0) setSelectedMatch(matches[0]);
        }}
      />
    )}

    {trainingKingModalOpen && (
      <DeltaTrainingKingModal
        isOpen={trainingKingModalOpen}
        onClose={() => setTrainingKingModalOpen(false)}
        players={players}
        trainingSessions={trainingSessions}
        trainingAttendance={trainingAttendance}
        trainingGames={trainingGames}
        trainingGamePlayers={trainingGamePlayers}
      />
    )}

    {seasonPassModalOpen && (
      <DeltaSeasonPassModal
        isOpen={seasonPassModalOpen}
        onClose={() => setSeasonPassModalOpen(false)}
        userXp={1150}
      />
    )}

    {photoBoothModalOpen && (
      <DeltaPhotoBoothModal
        isOpen={photoBoothModalOpen}
        onClose={() => setPhotoBoothModalOpen(false)}
        players={players}
        defaultPlayerName={props.profile.display_name || "ZAWODNIK DELTA"}
      />
    )}

    {birthdayModalOpen && (
      <DeltaBirthdayZoneModal
        isOpen={birthdayModalOpen}
        onClose={() => setBirthdayModalOpen(false)}
        players={players}
        currentUserName={props.profile.display_name || "Kibic DELTY"}
      />
    )}

    {coachCornerModalOpen && (
      <DeltaCoachCornerModal
        isOpen={coachCornerModalOpen}
        onClose={() => setCoachCornerModalOpen(false)}
        players={players}
        isCoachOrAdmin={props.profile.role === "coach" || props.profile.role === "admin"}
        currentUserName={props.profile.display_name || "Trener DELTA"}
      />
    )}

    {newsModalOpen && (
      <NewsEditModal
        isOpen={newsModalOpen}
        onClose={() => setNewsModalOpen(false)}
        newsItem={editingNewsItem}
        onSaved={handleNewsSaved}
        onDeleted={handleNewsDeleted}
        currentUserId={props.profile.id}
      />
    )}

    {dpRulesModalOpen && (
      <DeltaPointsRulesModal
        isOpen={dpRulesModalOpen}
        onClose={() => setDpRulesModalOpen(false)}
      />
    )}

    {missionsModalOpen && (
      <DeltaDailyMissionsModal
        isOpen={missionsModalOpen}
        onClose={() => setMissionsModalOpen(false)}
        userId={props.profile.id}
        onRewardClaimed={() => fetchGameProfile()}
      />
    )}

    {battleArenaModalOpen && (
      <DeltaCardBattleArenaModal
        isOpen={battleArenaModalOpen}
        onClose={() => setBattleArenaModalOpen(false)}
        userId={props.profile.id}
        playerCards={players}
        onXPClaimed={() => fetchGameProfile()}
      />
    )}

    {notificationsModalOpen && (
      <DeltaNotificationCenterModal
        isOpen={notificationsModalOpen}
        onClose={() => setNotificationsModalOpen(false)}
        userId={props.profile.id}
        onNotificationRead={() => fetchGameProfile()}
      />
    )}

    {weeklySummaryModalOpen && (
      <DeltaWeeklySummaryModal
        isOpen={weeklySummaryModalOpen}
        onClose={() => setWeeklySummaryModalOpen(false)}
        streakDays={gameProfile?.activityStreak || 1}
        xpGained={gameProfile?.seasonXP || 0}
        trainingsAttended={3}
        cardsUnlocked={players.length}
      />
    )}

    {notifPrefsModalOpen && (
      <DeltaNotificationPreferencesModal
        isOpen={notifPrefsModalOpen}
        onClose={() => setNotifPrefsModalOpen(false)}
        userId={props.profile.id}
      />
    )}

    {changelogModalOpen && (
      <DeltaChangelogModal
        isOpen={changelogModalOpen}
        onClose={() => setChangelogModalOpen(false)}
      />
    )}

    {competitionHubOpen && (
      <DeltaCompetitionHubModal
        isOpen={competitionHubOpen}
        onClose={() => setCompetitionHubOpen(false)}
        userId={props.profile.id}
        userName={props.profile.display_name || "Zawodnik DELTA"}
        playerCards={players}
        onRewardClaimed={() => fetchGameProfile()}
      />
    )}

    {socialFeedOpen && (
      <DeltaSocialFeedModal
        isOpen={socialFeedOpen}
        onClose={() => setSocialFeedOpen(false)}
        userId={props.profile.id}
      />
    )}

    {trophyCabinetOpen && (
      <DeltaTrophyCabinetModal
        isOpen={trophyCabinetOpen}
        onClose={() => setTrophyCabinetOpen(false)}
        userId={props.profile.id}
        userName={props.profile.display_name || "Zawodnik DELTA"}
        onProfileUpdated={() => fetchGameProfile()}
      />
    )}

    {safeTradingOpen && (
      <DeltaSafeTradingModal
        isOpen={safeTradingOpen}
        onClose={() => setSafeTradingOpen(false)}
        userId={props.profile.id}
        userName={props.profile.display_name || "Zawodnik DELTA"}
        playerCards={players}
        onTradeCompleted={() => fetchGameProfile()}
      />
    )}

    {/* DELTA SYNC 2.0 CONTROL CENTER MODAL */}
    {syncControlModalOpen && (
      <div className="v200-modal-overlay" onClick={() => setSyncControlModalOpen(false)} role="dialog" aria-modal="true">
        <div className="v200-modal-container max-w-3xl animate-fadeIn" onClick={(e) => e.stopPropagation()}>
          <div className="v200-modal-head">
            <div className="flex items-center gap-2">
              <RefreshCw size={18} className="text-amber-400" />
              <h3 className="text-base font-black text-white uppercase tracking-wider m-0">
                DELTA SYNC 2.0 & EVENT BUS
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setSyncControlModalOpen(false)}
              className="v200-modal-close"
              aria-label="Zamknij"
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-4 sm:p-6 overflow-y-auto max-h-[80vh]">
            <DeltaSyncControlCenter />
          </div>
        </div>
      </div>
    )}

    {/* PWA & Network Resilience Components */}
    <DeltaPWAInstallPrompt />
    <DeltaOfflineBanner />
  </div>;
}
