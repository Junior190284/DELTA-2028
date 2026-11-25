import Image from "next/image";
import Link from "next/link";
import {
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Flame,
  Goal,
  LockKeyhole,
  MapPin,
  Shield,
  Trophy,
  Users,
} from "lucide-react";
import { decodeHtmlEntities } from "@/lib/text";
import { formatTeamName, getTeamLogo } from "@/lib/teams";
import PublicNav from "./public/PublicNav";
import MatchCountdown from "./public/MatchCountdown";
import PublicMotion from "./public/PublicMotion";
import CinematicIntro from "./public/CinematicIntro";
import styles from "./public/public-experience.module.css";

type Match = {
  id: string;
  round_no: number | null;
  match_date: string;
  match_time: string | null;
  venue: string | null;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
};

type News = { id: string; type: string; title: string; body: string | null; published_at: string };
type ClubUpdate = {
  id: string;
  source_key: string;
  source_name: string;
  source_url: string;
  title: string;
  body: string | null;
  priority: number;
  published_at: string;
};
type TeamEvent = {
  id: string;
  title: string;
  event_type: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  details: string | null;
  important: boolean;
};
const CLUB = "K.S. Delta Warszawa GM";

function localDate(date: string, time?: string | null) {
  return new Date(`${date}T${time?.slice(0, 5) || "12:00"}:00`);
}

function datePL(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function opponent(match: Match) {
  return formatTeamName(match.home_team === CLUB ? match.away_team : match.home_team);
}

function ourScore(match: Match) {
  return match.home_team === CLUB ? match.home_score : match.away_score;
}

function theirScore(match: Match) {
  return match.home_team === CLUB ? match.away_score : match.home_score;
}

function TeamMark({ team, priority = false }: { team: string; priority?: boolean }) {
  const logo = getTeamLogo(team);
  if (!logo) {
    return <span className={styles.teamFallback}>{formatTeamName(team).slice(0, 2).toUpperCase()}</span>;
  }

  return (
    <Image
      className={styles.teamLogo}
      src={logo}
      alt={`Herb ${formatTeamName(team)}`}
      width={120}
      height={120}
      priority={priority}
      sizes="(max-width: 640px) 72px, 112px"
    />
  );
}

const experienceItems = [
  { title: "Road to Glory", copy: "Droga rozwoju zawodnika opisana przez trening, doświadczenie i osiągnięcia.", status: "DOSTĘPNE" },
  { title: "Player Passport", copy: "Prywatny profil rozwoju widoczny wyłącznie dla uprawnionego opiekuna.", status: "DOSTĘPNE" },
  { title: "Centrum Treningowe", copy: "Kalendarz, materiały i bezpieczna organizacja procesu treningowego.", status: "DOSTĘPNE" },
  { title: "Match Hub", copy: "Mecze, wyniki, obecności i najważniejsze informacje w jednym miejscu.", status: "DOSTĘPNE" },
  { title: "Kolekcja kart", copy: "Sportowe karty i kolekcja powiązana z rozwojem w aplikacji.", status: "DOSTĘPNE" },
  { title: "DELTA INFERNO", copy: "Cinematic pack opening i oprawa kolekcji w bezpiecznym panelu drużyny.", status: "DOSTĘPNE" },
  { title: "Sala Trofeów", copy: "Osiągnięcia i najważniejsze momenty wspólnej sportowej historii.", status: "W ROZWOJU" },
  { title: "Hall of Fame", copy: "Klubowe wyróżnienia przedstawione bez ujawniania danych na stronie publicznej.", status: "W ROZWOJU" },
  { title: "Kronika Meczowa", copy: "Historia spotkań, wyników i drużynowych kamieni milowych.", status: "W ROZWOJU" },
] as const;

export default function PublicTeamSite(props: {
  matches: Match[];
  news: News[];
  clubUpdates: ClubUpdate[];
  teamEvents: TeamEvent[];
  demoMode?: boolean;
  signedIn?: boolean;
}) {
  const now = Date.now();
  const scheduled = props.matches
    .filter((match) => match.status === "scheduled")
    .slice()
    .sort((a, b) => localDate(a.match_date, a.match_time).getTime() - localDate(b.match_date, b.match_time).getTime());
  const nextMatch =
    scheduled.find((match) => localDate(match.match_date, match.match_time).getTime() >= now - 2 * 60 * 60 * 1000) ||
    scheduled[0] ||
    null;
  const lastMatch = props.matches
    .filter((match) => match.status === "played")
    .slice()
    .sort((a, b) => b.match_date.localeCompare(a.match_date))[0] || null;
  const publicEvents = [
    ...scheduled.slice(0, 3).map((match) => ({
      id: `match-${match.id}`,
      type: "MECZ",
      title: `${formatTeamName(match.home_team)} — ${formatTeamName(match.away_team)}`,
      date: match.match_date,
      time: match.match_time,
      location: match.venue,
    })),
    ...props.teamEvents.slice(0, 5).map((event) => ({
      id: `event-${event.id}`,
      type: event.event_type.toUpperCase(),
      title: event.title,
      date: event.event_date,
      time: event.start_time,
      location: event.location,
    })),
  ]
    .filter((event) => localDate(event.date, event.time).getTime() >= now - 90 * 60 * 1000)
    .sort((a, b) => localDate(a.date, a.time).getTime() - localDate(b.date, b.time).getTime())
    .slice(0, 4);
  const latestUpdate = props.clubUpdates[0] || null;
  const latestNews = props.news[0] || null;

  return (
    <main className={styles.page}>
      <PublicMotion />
      <PublicNav signedIn={props.signedIn} />

      <section className={styles.hero} aria-labelledby="delta-hero-title">
        <Image
          className={styles.heroImage}
          src="/media/walkouts/delta-gold-stadium.webp"
          alt="Stadion DELTA w świetle reflektorów"
          fill
          priority
          loading="eager"
          sizes="100vw"
        />
        <div className={styles.heroVeil} aria-hidden="true" />
        <div className={styles.heroBeam} aria-hidden="true" />
        <div className={styles.heroInner}>
          <div className={styles.heroCopy} data-reveal="hero">
            <p className={styles.eyebrow}>DELTA 2018 GM — GÓRNY MOKOTÓW</p>
            <h1 id="delta-hero-title">
              KAŻDY MECZ
              <span>PROWADZI DO MISTRZOSTWA.</span>
            </h1>
            <p className={styles.heroLead}>Każdy trening. Każdy mecz. Każdy krok ma znaczenie.</p>
            <div className={styles.heroActions}>
              <Link className={styles.primaryButton} href="/login">
                WEJDŹ DO ŚWIATA DELTY <ChevronRight aria-hidden="true" />
              </Link>
              <CinematicIntro />
            </div>
          </div>

          <div className={styles.heroCrestWrap} data-reveal="hero-art" aria-hidden="true">
            <span className={styles.heroOrbit} />
            <Image src="/teamlogos/gm-crest.webp" alt="" width={360} height={360} priority />
            <p>JEDNA DRUŻYNA</p>
          </div>
        </div>

        <a className={styles.heroMatchLink} href="#mecze">
          <span>NAJBLIŻSZY MECZ</span>
          <strong>{nextMatch ? `${datePL(nextMatch.match_date)} · ${opponent(nextMatch)}` : "Czekamy na kolejny termin"}</strong>
          <ChevronRight aria-hidden="true" />
        </a>
      </section>

      <div className={styles.scoreRibbon} aria-label="Informacje drużyny">
        <span>{props.demoMode ? "DEMO PREVIEW" : "DELTA 2018 GM"}</span>
        <p>{latestUpdate ? decodeHtmlEntities(latestUpdate.title) : "PASJA · CHARAKTER · PRZYJAŹŃ"}</p>
        <span>GÓRNY MOKOTÓW</span>
      </div>

      <section id="mecze" className={styles.matchSection} data-reveal="section" aria-labelledby="match-title">
        <div className={styles.sectionIntro}>
          <p className={styles.sectionIndex}>MATCH DAY CENTER</p>
          <h2 id="match-title">NASTĘPNY GWIZDEK. <span>PEŁNA GOTOWOŚĆ.</span></h2>
          <p>Publiczne informacje meczowe bez prywatnych danych zawodników.</p>
        </div>

        {nextMatch ? (
          <div className={styles.matchCard}>
            <div className={styles.matchStatus}><span /> NADCHODZĄCY MECZ · {nextMatch.round_no ? `KOLEJKA ${nextMatch.round_no}` : "TERMINARZ"}</div>
            <div className={styles.matchTeams}>
              <article>
                <TeamMark team={nextMatch.home_team} priority />
                <small>GOSPODARZE</small>
                <h3>{formatTeamName(nextMatch.home_team)}</h3>
              </article>
              <div className={styles.matchCenter}>
                <span>DO PIERWSZEGO GWIZDKA</span>
                <MatchCountdown target={localDate(nextMatch.match_date, nextMatch.match_time).toISOString()} />
                <b>VS</b>
                <p><CalendarDays /> {datePL(nextMatch.match_date)} · {nextMatch.match_time?.slice(0, 5) || "—"}</p>
                <p><MapPin /> {nextMatch.venue || "Miejsce do ustalenia"}</p>
              </div>
              <article>
                <TeamMark team={nextMatch.away_team} priority />
                <small>GOŚCIE</small>
                <h3>{formatTeamName(nextMatch.away_team)}</h3>
              </article>
            </div>
            <div className={styles.matchFooter}>
              <div>
                <span>OSTATNI WYNIK</span>
                <strong>{lastMatch ? `${ourScore(lastMatch) ?? "—"}:${theirScore(lastMatch) ?? "—"} · ${opponent(lastMatch)}` : "Pierwszy wynik pojawi się tutaj"}</strong>
              </div>
              <Link href="/login">PANEL DRUŻYNY <ChevronRight /></Link>
            </div>
          </div>
        ) : (
          <div className={styles.matchEmpty}>
            <Trophy aria-hidden="true" />
            <h3>Czekamy na kolejny mecz</h3>
            <p>Gdy termin zostanie opublikowany, pojawi się tutaj automatycznie.</p>
          </div>
        )}

        <div id="kalendarz" className={styles.eventStrip}>
          {publicEvents.length ? publicEvents.map((event) => (
            <article key={event.id}>
              <div className={styles.eventDate}>
                <strong>{new Date(`${event.date}T12:00:00`).getDate()}</strong>
                <span>{new Date(`${event.date}T12:00:00`).toLocaleDateString("pl-PL", { month: "short" }).replace(".", "")}</span>
              </div>
              <div>
                <small>{event.type}</small>
                <h3>{event.title}</h3>
                <p>{[event.time?.slice(0, 5), event.location].filter(Boolean).join(" · ") || "Szczegóły wkrótce"}</p>
              </div>
            </article>
          )) : (
            <article className={styles.eventEmpty}><Clock3 /><div><small>KALENDARZ</small><h3>Brak publicznych wydarzeń</h3><p>Terminy pojawią się po publikacji.</p></div></article>
          )}
        </div>
      </section>

      <section id="o-aplikacji" className={styles.experience} data-reveal="section" aria-labelledby="experience-title">
        <div className={styles.sectionIntro}>
          <p className={styles.sectionIndex}>DELTA EXPERIENCE</p>
          <h2 id="experience-title">WIĘCEJ NIŻ <span>FUTBOL</span></h2>
          <p>Jedno środowisko dla sportu, rozwoju i codziennej organizacji drużyny.</p>
        </div>
        <div className={styles.bento}>
          {experienceItems.map((item, index) => (
            <article key={item.title} className={index === 0 ? styles.bentoLead : index === 5 ? styles.bentoInferno : ""}>
              <div className={styles.featureTop}>
                <span>{item.status}</span>
                {index === 0 ? <Trophy /> : index === 5 ? <Flame /> : <Shield />}
              </div>
              <h3>{item.title}</h3>
              <p>{item.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.road} data-reveal="section" aria-labelledby="road-title">
        <div className={styles.roadCopy}>
          <p className={styles.sectionIndex}>ROAD TO GLORY · DEMO</p>
          <h2 id="road-title">TWOJA HISTORIA <span>ZACZYNA SIĘ TUTAJ.</span></h2>
          <p>Rozwój jest drogą, nie pojedynczym wynikiem. Aplikacja porządkuje kolejne sportowe kroki bez publikowania indywidualnych danych dzieci.</p>
          <div className={styles.roadSteps} aria-label="Droga rozwoju">
            {["TRENING", "DOŚWIADCZENIE", "XP", "ROZWÓJ", "OSIĄGNIĘCIA"].map((step, index) => (
              <span key={step}><b>{String(index + 1).padStart(2, "0")}</b>{step}</span>
            ))}
          </div>
        </div>
        <div className={styles.demoPassport} aria-label="Syntetyczny przykład rozwoju zawodnika">
          <div className={styles.demoBadge}>DEMO · DANE SYNTETYCZNE</div>
          <div className={styles.demoAvatar}><Image src="/teamlogos/gm-crest.webp" alt="Herb DELTA" width={84} height={84} /></div>
          <small>PLAYER PASSPORT</small>
          <h3>ZAWODNIK DELTA</h3>
          <p>POZIOM 08 · MŁODY TALENT</p>
          <div className={styles.xpTrack}><i /></div>
          <div className={styles.demoStats}><span><b>24</b>TRENINGI</span><span><b>08</b>POZIOM</span><span><b>06</b>ODZNAKI</span></div>
        </div>
      </section>

      <section id="inferno" className={styles.inferno} data-reveal="section" aria-labelledby="inferno-title">
        <Image className={styles.infernoBackdrop} src="/media/walkouts/delta-inferno-red-stadium.webp" alt="" fill sizes="100vw" />
        <div className={styles.infernoContent}>
          <div>
            <p className={styles.sectionIndex}>GAMING SHOWCASE · BEZ TRANSAKCJI</p>
            <h2 id="inferno-title">DELTA <span>INFERNO</span></h2>
            <p>Karty kolekcjonerskie, rzadkości, osiągnięcia i cinematic pack opening. Publiczny podgląd prezentuje wyłącznie bezpieczne materiały demonstracyjne.</p>
            <div className={styles.rarityRow}><span>STANDARD</span><span>GOLD</span><span>LEGEND</span><span>INFERNO</span></div>
            <Link href="/login" className={styles.primaryButton}>OTWÓRZ PANEL DRUŻYNY <ChevronRight /></Link>
          </div>
          <div className={styles.packStage} aria-label="Demonstracyjne paczki DELTA INFERNO">
            <Image className={styles.packBack} src="/media/walkouts/delta-gold-pack-cutout.webp" alt="Demonstracyjna złota paczka DELTA" width={380} height={520} sizes="(max-width: 700px) 170px, 260px" />
            <Image className={styles.packFront} src="/media/walkouts/delta-inferno-pack-cutout.webp" alt="Demonstracyjna paczka DELTA INFERNO" width={380} height={520} sizes="(max-width: 700px) 190px, 290px" />
            <span>DEMO</span>
          </div>
        </div>
      </section>

      <section id="druzyna" className={styles.spirit} data-reveal="section" aria-labelledby="spirit-title">
        <div className={styles.spiritMark}>
          <Image src="/assets/devils-crest.png" alt="Herb DELTA 2018 GM" width={420} height={420} sizes="(max-width: 700px) 230px, 380px" />
        </div>
        <div>
          <p className={styles.sectionIndex}>POZNAJ DIABEŁKI</p>
          <h2 id="spirit-title">PASJA. CHARAKTER. <span>PRZYJAŹŃ.</span></h2>
          <p>Jedna drużyna. Wspólne marzenia. Publicznie pokazujemy ducha i wartości DELTY, a nazwiska, zdjęcia i profile młodych zawodników pozostają w chronionym panelu.</p>
          <blockquote>„Razem uczymy się wygrywać, rozwijać i wspierać.”</blockquote>
        </div>
      </section>

      <section className={styles.parentCenter} data-reveal="section" aria-labelledby="parent-title">
        <div className={styles.parentCopy}>
          <p className={styles.sectionIndex}>CENTRUM RODZICA</p>
          <h2 id="parent-title">WSZYSTKO, CZEGO POTRZEBUJE <span>DRUŻYNA.</span></h2>
          <p>Wygodny dostęp na telefonie do informacji, które pomagają spokojnie organizować sportowy tydzień.</p>
          <ul>
            {[
              "Kalendarz meczów i treningów",
              "Komunikaty i organizacja wydarzeń",
              "Potwierdzanie obecności",
              "Rozwój własnego dziecka w granicach uprawnień",
              "Prywatne profile i zdjęcia chronione logowaniem",
            ].map((item) => <li key={item}><Check /> {item}</li>)}
          </ul>
          <Link href="/login" className={styles.secondaryButton}><LockKeyhole /> ZALOGUJ SIĘ</Link>
        </div>
        <div className={styles.phoneMockup} aria-label="Bezpieczna demonstracja aplikacji mobilnej">
          <div className={styles.phoneTop}><span>DELTA</span><Shield /></div>
          <div className={styles.phoneHero}><small>DZIEŃ MECZU</small><b>{nextMatch ? opponent(nextMatch) : "KALENDARZ DRUŻYNY"}</b><p>{nextMatch ? `${datePL(nextMatch.match_date)} · ${nextMatch.match_time?.slice(0, 5) || "—"}` : "Następne wydarzenia pojawią się tutaj"}</p></div>
          <div className={styles.phoneRows}><span><CalendarDays /> Kalendarz</span><span><Users /> Obecności</span><span><Goal /> Match Hub</span></div>
          <div className={styles.phonePrivacy}><LockKeyhole /> DANE PRYWATNE CHRONIONE</div>
        </div>
      </section>

      <section className={styles.finalCta} data-reveal="section" aria-labelledby="cta-title">
        <Image src="/media/walkouts/delta-gold-stadium.webp" alt="" fill sizes="100vw" />
        <div>
          <p className={styles.sectionIndex}>DOŁĄCZ DO ŚWIATA DELTY</p>
          <h2 id="cta-title">WIELKIE HISTORIE ZACZYNAJĄ SIĘ <span>OD PIERWSZEGO TRENINGU.</span></h2>
          <p>Dołącz do świata DELTY i przeżywaj sportową przygodę razem z drużyną.</p>
          <Link className={styles.primaryButton} href="/login"><LockKeyhole /> ZALOGUJ SIĘ PRZEZ GOOGLE</Link>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerBrand}>
          <Image src="/teamlogos/gm-crest.webp" alt="DELTA 2018 GM" width={74} height={74} />
          <div><strong>DELTA 2018 GM</strong><span>Górny Mokotów · Warszawa</span></div>
        </div>
        <nav aria-label="Nawigacja w stopce">
          <a href="#mecze">Mecze</a><a href="#druzyna">Drużyna</a><a href="#kalendarz">Kalendarz</a><a href="#o-aplikacji">O aplikacji</a><Link href="/login">Panel drużyny</Link>
        </nav>
        <div className={styles.footerMeta}>
          <span>Profile, zdjęcia i indywidualne statystyki zawodników są dostępne wyłącznie po autoryzacji.</span>
          <span>{latestNews ? decodeHtmlEntities(latestNews.title) : "Oficjalny serwis drużyny"}</span>
        </div>
      </footer>
    </main>
  );
}
