"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { 
  BookOpen, 
  CheckCircle2, 
  XCircle, 
  Trophy, 
  Award, 
  Sparkles, 
  ArrowRight, 
  RotateCcw, 
  X, 
  HelpCircle, 
  Apple, 
  Droplet, 
  Moon, 
  ShieldCheck, 
  HeartHandshake, 
  Flame, 
  Star,
  ChevronRight,
  Gift
} from "lucide-react";

export interface LessonQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface KnowledgeLesson {
  id: string;
  category: "rules" | "nutrition" | "hydration" | "recovery" | "equipment" | "fairplay";
  title: string;
  shortDesc: string;
  icon: string;
  badgeName: string;
  rewardPoints: number;
  readTime: string;
  keyPoints: { icon: string; title: string; desc: string }[];
  funFact: string;
  parentTip: string;
  questions: LessonQuestion[];
}

const LESSONS_DATA: KnowledgeLesson[] = [
  {
    id: "rules-orlik",
    category: "rules",
    title: "Zasady Gry i Boisko Młodego Mistrza",
    shortDesc: "Jak prawidłowo wrzucać aut, kiedy jest rzut rożny i dlaczego nie gramy niebezpiecznie.",
    icon: "⚽",
    badgeName: "Mistrz Zasad Gry",
    rewardPoints: 50,
    readTime: "3 min",
    keyPoints: [
      {
        icon: "👐",
        title: "Prawidłowy Rzut z Autu",
        desc: "Wrzucamy piłkę obiema rękami zza głowy, trzymając obie stopy na ziemi za linią boczną!"
      },
      {
        icon: "🥅",
        title: "Wznowienie od Bramkarza",
        desc: "Gdy piłka minie linię końcową od przeciwnika, bramkarz wznawia grę z ziemi lub podaniem do obrońcy."
      },
      {
        icon: "🛡️",
        title: "Gra Czysta i Bezpieczna",
        desc: "Nie wolno popychać z tyłu ani robić wślizgów w nogi kolegi. Gramy twardo, ale zawsze o piłkę!"
      },
      {
        icon: "🚩",
        title: "Rzut Rożny (Korner)",
        desc: "Gdy obrońca lub bramkarz wybije piłkę za linię bramkową, przeciwnik wykonuje rzut z narożnika boiska."
      }
    ],
    funFact: "Czy wiesz, że pierwszy gwizdek sędziowski został użyty na meczu piłkarskim w 1878 roku? Wcześniej sędziowie machali chustkami!",
    parentTip: "Poćwiczcie na spacerze prawidłowy wrzut z autu obiema rękami zza głowy z obiema stopami na ziemi.",
    questions: [
      {
        id: "q1",
        question: "Jak prawidłowo wykonujemy rzut z autu w meczu?",
        options: [
          "Jedną ręką rzucając jak najdalej",
          "Dwiema rękami zza głowy, stopy dotykają ziemi",
          "Kopiąc piłkę z ziemi z całej siły"
        ],
        correctIndex: 1,
        explanation: "Prawidłowy aut wykonuje się obiema rękami zza głowy, a obie stopy muszą mieć kontakt z podłożem!"
      },
      {
        id: "q2",
        question: "Kiedy sędzia dyktuje rzut rożny (korner)?",
        options: [
          "Gdy piłka minie linię końcową po dotknięciu przez drużynę broniącą",
          "Gdy zawodnik strzeli gola",
          "Gdy piłka wyjdzie za linię boczną"
        ],
        correctIndex: 0,
        explanation: "Rzut rożny jest wtedy, gdy drużyna broniąca (np. obrońca lub bramkarz) wybije piłkę za własną linię bramkową."
      },
      {
        id: "q3",
        question: "Co robimy, gdy usłyszymy gwizdek sędziego?",
        options: [
          "Gramy dalej i udajemy, że nie słyszymy",
          "Zatrzymujemy grę i słuchamy decyzji sędziego",
          "Kopiemy piłkę w trybuny"
        ],
        correctIndex: 1,
        explanation: "Gwizdek oznacza natychmiastowe przerwanie gry i pełen szacunek dla decyzji arbitra."
      },
      {
        id: "q4",
        question: "Czy wolno atakować rywala niebezpiecznym wślizgiem od tyłu?",
        options: [
          "Tak, jeśli to groźna akcja",
          "Nie! Bezpieczeństwo i zdrowie kolegów jest najważniejsze",
          "Tylko w ostatnich minutach meczu"
        ],
        correctIndex: 1,
        explanation: "W DELCIE dbamy o zdrowie każdego zawodnika – gramy czysto i bezpiecznie bez wślizgów w nogi!"
      }
    ]
  },
  {
    id: "nutrition-power",
    category: "nutrition",
    title: "Paliwo Młodego Piłkarza (Zdrowe Odżywianie)",
    shortDesc: "Co jeść przed i po meczu, żeby mieć energię Cristiano Ronaldo i siłę lwa!",
    icon: "🥗",
    badgeName: "Mistrz Zdrowego Żywienia",
    rewardPoints: 50,
    readTime: "3 min",
    keyPoints: [
      {
        icon: "🍌",
        title: "Banan – Przekąska Mistrzów",
        desc: "Zjedzony 30-45 minut przed wysiłkiem daje szybką, naturalną energię do biegania i dryblingu."
      },
      {
        icon: "🍝",
        title: "Posiłek Przedmeczowy (2-3h przed)",
        desc: "Lekkostrawny obiad: makaron z sosem pomidorowym, ryż z chudym mięsem lub owsianka z owocami."
      },
      {
        icon: "🚫",
        title: "Czerwone Światło dla Fast Foodów",
        desc: "Chipsy, frytki i słodycze przed treningiem obciążają żołądek i zabierają siłę do biegania."
      },
      {
        icon: "🍳",
        title: "Kolacja na Regenerację Mięśni",
        desc: "Po meczu mięśnie potrzebują białka (jajka, twarożek, ryba, warzywa), aby urosnąć i odpocząć."
      }
    ],
    funFact: "Robert Lewandowski i Leo Messi nie piją gazowanych słodzonych napojów, a ich ulubioną przekąską treningową są suszone owoce i orzechy!",
    parentTip: "Zadbajmy o lekkostrawny obiad na 2-3 godziny przed zbiórką meczową, a do torby spakujmy banana lub batonik owocowy.",
    questions: [
      {
        id: "q1",
        question: "Jaki owoc jest idealną i naturalną przekąską przed treningiem?",
        options: [
          "Banan",
          "Pączek z czekoladą",
          "Paczka chipsów paprykowych"
        ],
        correctIndex: 0,
        explanation: "Banan zawiera potas i zdrowe węglowodany, które natychmiast zasilają nogi do sprintu!"
      },
      {
        id: "q2",
        question: "Ile czasu przed meczem najlepiej zjeść główny, lekki posiłek?",
        options: [
          "5 minut przed wyjściem na boisko",
          "Około 2 do 3 godzin przed meczem",
          "Nie jemy nic przez cały dzień"
        ],
        correctIndex: 1,
        explanation: "2-3 godziny dają organizmowi czas na strawienie posiłku i zamianę jedzenia w czystą energię."
      },
      {
        id: "q3",
        question: "Dlaczego unikamy chipsów i słodzonych napojów przed meczem?",
        options: [
          "Bo obciążają żołądek i powodują szybkie zmęczenie",
          "Bo są zbyt zdrowe",
          "Bo sprawiają, że biegamy za szybko"
        ],
        correctIndex: 0,
        explanation: "Tłuste i mocno słodzone produkty odbierają lekkość i energię w trakcie meczu."
      },
      {
        id: "q4",
        question: "Co pomaga mięśniom zregenerować się po ciężkim meczu?",
        options: [
          "Słodki gazowany napój",
          "Białko (jajka, chude mięso, nabiał) i kolorowe warzywa",
          "Pominięcie kolacji"
        ],
        correctIndex: 1,
        explanation: "Białko i witaminy z warzyw odbudowują zmęczone mięśnie podczas odpoczynku."
      }
    ]
  },
  {
    id: "hydration-magic",
    category: "hydration",
    title: "Magia Nawadniania i Czysta Woda",
    shortDesc: "Dlaczego woda to najważniejszy napój sportowca i jak prawidłowo pić w trakcie meczu.",
    icon: "💧",
    badgeName: "Strażnik Nawodnienia",
    rewardPoints: 50,
    readTime: "2 min",
    keyPoints: [
      {
        icon: "💦",
        title: "Małe Łyki w Przerwach",
        desc: "Pijemy 2-3 małe łyki wody w każdej przerwie. Nie pijemy duszkiem całego bidonu naraz!"
      },
      {
        icon: "🏷️",
        title: "Własny Podpisany Bidon",
        desc: "Każdy zawodnik DELTY ma swój podpisany bidon ze względów higienicznych i zdrowotnych."
      },
      {
        icon: "🧠",
        title: "Woda Daje Szybkie Decyzje",
        desc: "Gdy w organizmie brakuje wody, mózg wolniej reaguje i trudniej celnie podać piłkę."
      },
      {
        icon: "🍋",
        title: "Domowy Izotonik",
        desc: "Woda z plasterkiem cytryny, odrobiną miodu i szczyptą soli to najlepszy napój na upalne dni."
      }
    ],
    funFact: "Twoje mięśnie składają się w ponad 75% z wody! Gdy tracisz wodę z potem, Twoja siła strzału natychmiast spada.",
    parentTip: "Przypominajmy dziecku o piciu wody przez cały dzień, nie tylko w trakcie samego treningu.",
    questions: [
      {
        id: "q1",
        question: "Jak najlepiej pić wodę podczas przerw w treningu?",
        options: [
          "Wypić duszkiem cały bidon na raz",
          "Pić małymi łykami regularnie",
          "Nie pić wcale, żeby nie mieć ciężkiego brzucha"
        ],
        correctIndex: 1,
        explanation: "Picie małymi łykami świetnie nawadnia i nie obciąża żołądka podczas biegania."
      },
      {
        id: "q2",
        question: "Dlaczego każdy zawodnik powinien mieć swój podpisany bidon?",
        options: [
          "Dla higieny, zdrowia i żeby nie pomylić bidonów kolegów",
          "Tylko po to, żeby ładnie wyglądał",
          "Nie ma to żadnego znaczenia"
        ],
        correctIndex: 0,
        explanation: "Własny bidon chroni przed infekcjami i uczy dbania o swoje klubowe rzeczy."
      },
      {
        id: "q3",
        question: "Co się dzieje, gdy pijemy za mało wody podczas meczu?",
        options: [
          "Mamy więcej siły",
          "Mózg wolniej myśli, spada koncentracja i siła mięśni",
          "Biegamy dwa razy szybciej"
        ],
        correctIndex: 1,
        explanation: "Brak wody powoduje spadek energii, skurcze i gorszą celność podań."
      },
      {
        id: "q4",
        question: "Jaki napój jest najlepszy dla młodego sportowca na treningu?",
        options: [
          "Słodzona cola",
          "Czysta niegazowana woda (lub woda z cytryną)",
          "Napoje energetyzujące dla dorosłych"
        ],
        correctIndex: 1,
        explanation: "Woda to absolutny numer 1 dla każdego młodego piłkarza DELTY!"
      }
    ]
  },
  {
    id: "recovery-sleep",
    category: "recovery",
    title: "Sen i Regeneracja Mistrza",
    shortDesc: "Jak sen buduje Twoje mięśnie i dlaczego wypoczęty gracz wygrywa pojedynki 1 na 1.",
    icon: "😴",
    badgeName: "Mistrz Regeneracji",
    rewardPoints: 50,
    readTime: "2 min",
    keyPoints: [
      {
        icon: "⏰",
        title: "9-10 Godzin Snu Każdej Nocy",
        desc: "Dzieci w Twoim wieku rosną i budują siłę najszybciej właśnie w trakcie głębokiego snu."
      },
      {
        icon: "📱",
        title: "Ekrany Stop Przed Snem",
        desc: "Odkładamy telefon, tablet i telewizor min. 45 minut przed snem, by mózg mógł się wyciszyć."
      },
      {
        icon: "🧘",
        title: "Rozciąganie i Relaks",
        desc: "Krótkie rozciąganie po meczu zapobiega sztywności nóg i przygotowuje ciało na kolejny dzień."
      },
      {
        icon: "🔋",
        title: "Pełna Bateria na Mecz",
        desc: "Wyspany zawodnik ma błyskawiczny czas reakcji i łatwiej omija rywali dryblingiem!"
      }
    ],
    funFact: "Koszykarze i piłkarze, którzy śpią regularnie ponad 9 godzin, trafiają do bramki i kosza z o 15% wyższą celnością!",
    parentTip: "Stała godzina zasypiania i wieczorny rytuał (czytanie książki, rozmowa) ułatwiają głęboki sen i regenerację.",
    questions: [
      {
        id: "q1",
        question: "Ile godzin snu potrzebuje młody piłkarz w wieku 6-8 lat?",
        options: [
          "Około 4-5 godzin",
          "Około 9 do 10 godzin",
          "Wystarczy 2 godziny drzemki"
        ],
        correctIndex: 1,
        explanation: "9-10 godzin to idealny czas, by zregenerować siły i rosnąć zdrowo."
      },
      {
        id: "q2",
        question: "Co warto zrobić przed pójściem spać, żeby lepiej wypocząć?",
        options: [
          "Grać na telefonie do północy",
          "Odłożyć ekrany i wyciszyć się (np. poczytać książkę z rodzicami)",
          "Zjeść paczkę słodyczy w łóżku"
        ],
        correctIndex: 1,
        explanation: "Wyciszenie bez niebieskiego światła ekranów pozwala na głęboki i odżywczy sen."
      },
      {
        id: "q3",
        question: "Kiedy Twoje mięśnie najmocniej rosną i regenerują się?",
        options: [
          "Gdy głęboko śpisz w nocy",
          "Tylko podczas jedzenia",
          "Podczas stania w korku"
        ],
        correctIndex: 0,
        explanation: "Hormon wzrostu i regeneracja działają najsilniej właśnie w trakcie snu."
      },
      {
        id: "q4",
        question: "Jak czuje się zawodnik, który porządnie się wyspał przed meczem?",
        options: [
          "Jest powolny i zmęczony",
          "Ma mnóstwo energii, świetny refleks i szybkie nogi",
          "Zapomina jak się biega"
        ],
        correctIndex: 1,
        explanation: "Wypoczęty zawodnik to groźny i szybki rywal na całym boisku!"
      }
    ]
  },
  {
    id: "equipment-gear",
    category: "equipment",
    title: "Torba Młodego Piłkarza i Samodzielność",
    shortDesc: "Jak pakować swój sprzęt, dbać o buty i ochraniacze, by zawsze być gotowym do gry.",
    icon: "🎒",
    badgeName: "Wzorowy Samodzielny Gracz",
    rewardPoints: 50,
    readTime: "2 min",
    keyPoints: [
      {
        icon: "🛡️",
        title: "Ochraniacze to Podstawa",
        desc: "Nigdy nie wychodzimy na mecz bez ochraniaczy – chronią nasze piszczele przed bolesnymi urazami."
      },
      {
        icon: "👟",
        title: "Czyste Korki / Turfy",
        desc: "Po treningu wyczyść buty z błota i trawy. Zadbane buty służą dłużej i dają lepszą przyczepność."
      },
      {
        icon: "👕",
        title: "Klubowy Strój DELTY",
        desc: "Czerwono-czarny strój meczowy wieszamy równo po praniu – reprezentujemy nasz wspaniały klub!"
      },
      {
        icon: "🎒",
        title: "Pakuję Torbę Samodzielnie",
        desc: "Prawdziwy mistrz wie, co ma w torbie, bo pakuje ją sam (z małą pomocą rodzica)."
      }
    ],
    funFact: "Najlepsi piłkarze świata, tacy jak Luka Modrić, do dziś osobiście sprawdzają stan swoich butów przed każdym wielkim finałem!",
    parentTip: "Pozwólmy dziecku samodzielnie sprawdzić listę rzeczy przed wyjściem: buty, getry, ochraniacze, bidon, bluza.",
    questions: [
      {
        id: "q1",
        question: "Dlaczego ochraniacze na piszczele są obowiązkowe na meczu?",
        options: [
          "Tylko po to, żeby getry ładnie stały",
          "Chronią nogi i kości przed bolesnymi kopnięciami i urazami",
          "Są potrzebne do szybszego biegania"
        ],
        correctIndex: 1,
        explanation: "Ochraniacze to tarcza każdego piłkarza – bezpieczeństwo jest najważniejsze!"
      },
      {
        id: "q2",
        question: "Kto powinien pakować torbę na trening młodego piłkarza?",
        options: [
          "Sam zawodnik (ucząc się samodzielności z pomocą rodzica)",
          "Sąsiad",
          "Kierowca autobusu"
        ],
        correctIndex: 0,
        explanation: "Samodzielne pakowanie uczy odpowiedzialności i buduje dumę młodego sportowca."
      },
      {
        id: "q3",
        question: "Co robimy z zabłoconymi butami po deszczowym meczu?",
        options: [
          "Zostawiamy w zamkniętej torbie na 2 tygodnie",
          "Czyścimy szczotką, suszymy w przewiewnym miejscu (nie na gorącym kaloryferze)",
          "Wyrzucamy do kosza"
        ],
        correctIndex: 1,
        explanation: "Wyczyszczone i wysuszone buty dają świetną przyczepność na kolejnym treningu."
      },
      {
        id: "q4",
        question: "Co robimy z klubowym strojem meczowym DELTY?",
        options: [
          "Dumnie go nosimy, szanujemy barwy i dbamy o czystość",
          "Używamy jako ściereczki",
          "Zostawiamy w szatni"
        ],
        correctIndex: 0,
        explanation: "Czerwono-czarne barwy DELTY to duma każdego z nas!"
      }
    ]
  },
  {
    id: "fairplay-team",
    category: "fairplay",
    title: "Kodeks Fair Play i Duch Drużyny DELTY",
    shortDesc: "Jeden za wszystkich, wszyscy za jednego! Szacunek dla kolegów, trenera i rywala.",
    icon: "🤝",
    badgeName: "Rycerz Fair Play",
    rewardPoints: 50,
    readTime: "3 min",
    keyPoints: [
      {
        icon: "👏",
        title: "Wsparcie po Błędzie",
        desc: "Gdy kolega z drużyny popełni błąd lub nie trafi w piłkę – podbiegamy i przybijamy piątkę: 'Głowa do góry!'."
      },
      {
        icon: "🤝",
        title: "Podanie Ręki po Końcowym Gwizdku",
        desc: "Bez względu na wynik dziękujemy rywalom i sędziemu za sportową walkę."
      },
      {
        icon: "👂",
        title: "Słuchamy Wskazówek Trenera",
        desc: "Gdy Trener mówi – cała drużyna słucha w skupieniu. Szacunek buduje wielkie sukcesy!"
      },
      {
        icon: "❤️",
        title: "Wygrywamy i Przegrywamy Razem",
        desc: "Piłka nożna to sport drużynowy. Nikt nie wygrywa meczu sam – jesteśmy jedną wielką rodziną DELTY!"
      }
    ],
    funFact: "W 2021 roku kapitan Danii Simon Kjær otrzymał nagrodę Fair Play FIFA za natychmiastową pomoc swojemu koledze z zespołu – to był gest prawdziwego bohatera!",
    parentTip: "Doceniajmy zaangażowanie, serce do gry i współpracę z kolegami, a nie tylko sam wynik bramkowy na tablicy.",
    questions: [
      {
        id: "q1",
        question: "Co robisz, gdy Twój kolega z drużyny DELTY straci piłkę lub popełni błąd?",
        options: [
          "Krzyczysz na niego i złościsz się",
          "Wspierasz go, mówisz 'Głowa do góry, gramy dalej!' i pomagasz odebrać piłkę",
          "Schodzisz obrażony z boiska"
        ],
        correctIndex: 1,
        explanation: "Prawdziwa drużyna wspiera się w każdym momencie – razem jesteśmy nie do zatrzymania!"
      },
      {
        id: "q2",
        question: "Co robimy po zakończeniu każdego meczu?",
        options: [
          "Uciekamy do szatni bez słowa",
          "Dziękujemy rywalom i sędziemu podając rękę i przybijając sportową piątkę",
          "Śmiejemy się z przegranych"
        ],
        correctIndex: 1,
        explanation: "Szacunek dla przeciwnika i arbitra to fundament wartości każdego zawodnika DELTY."
      },
      {
        id: "q3",
        question: "Jak zachowujemy się na odprawie, gdy Trener tłumaczy taktykę?",
        options: [
          "Rozmawiamy z kolegami i kopiemy w ławkę",
          "Słuchamy w skupieniu, patrzymy na tablicę i zadajemy pytania",
          "Bawimy się telefonem"
        ],
        correctIndex: 1,
        explanation: "Uwaga i skupienie na odprawie pozwalają zrealizować plan na boisku."
      },
      {
        id: "q4",
        question: "Co oznacza hasło 'Jeden za wszystkich, wszyscy za jednego'?",
        options: [
          "Że tylko jedna osoba biega, a reszta stoi",
          "Że jesteśmy zgranym zespołem, pomagamy sobie na boisku i poza nim",
          "Że każdy gra sam dla siebie"
        ],
        correctIndex: 1,
        explanation: "Siła DELTY tkwi w jedności i przyjaźni całej drużyny!"
      }
    ]
  }
];

interface DeltaKnowledgeCornerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPointsUpdated?: (newPoints: number) => void;
}

export default function DeltaKnowledgeCornerModal({
  isOpen,
  onClose,
  onPointsUpdated
}: DeltaKnowledgeCornerModalProps) {
  const [mounted, setMounted] = useState(false);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [quizMode, setQuizMode] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [claimingReward, setClaimingReward] = useState(false);
  const [rewardClaimed, setRewardClaimed] = useState(false);
  const [completedLessons, setCompletedLessons] = useState<Record<string, { score: number; passed: boolean; claimed: boolean }>>({});

  useEffect(() => {
    setMounted(true);
    // Wczytaj stan z localStorage
    try {
      const saved = localStorage.getItem("delta_knowledge_progress");
      if (saved) {
        setCompletedLessons(JSON.parse(saved));
      }
    } catch {}
  }, []);

  // Zamknięcie na klawisz Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (quizMode && !quizSubmitted) {
          setQuizMode(false);
        } else if (activeLessonId) {
          setActiveLessonId(null);
          setQuizMode(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, quizMode, quizSubmitted, activeLessonId, onClose]);

  const activeLesson = useMemo(() => {
    return LESSONS_DATA.find(l => l.id === activeLessonId) || null;
  }, [activeLessonId]);

  const totalLessonsCount = LESSONS_DATA.length;
  const passedLessonsCount = useMemo(() => {
    return Object.values(completedLessons).filter(l => l.passed).length;
  }, [completedLessons]);

  const overallProgressPercent = Math.round((passedLessonsCount / totalLessonsCount) * 100);

  // Obliczenia Quizu
  const currentQuestion = activeLesson?.questions[currentQuestionIndex];
  const totalQuestions = activeLesson?.questions.length || 0;

  const correctAnswersCount = useMemo(() => {
    if (!activeLesson) return 0;
    return activeLesson.questions.reduce((acc, q) => {
      return acc + (selectedAnswers[q.id] === q.correctIndex ? 1 : 0);
    }, 0);
  }, [activeLesson, selectedAnswers]);

  const scorePercent = totalQuestions > 0 ? Math.round((correctAnswersCount / totalQuestions) * 100) : 0;
  const passedQuiz = scorePercent >= 75; // 75% wymagane

  const handleStartLesson = (lesson: KnowledgeLesson) => {
    setActiveLessonId(lesson.id);
    setQuizMode(false);
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setQuizSubmitted(false);
    setRewardClaimed(completedLessons[lesson.id]?.claimed || false);
  };

  const handleStartQuiz = () => {
    setQuizMode(true);
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setQuizSubmitted(false);
  };

  const handleSelectAnswer = (optionIdx: number) => {
    if (quizSubmitted || !currentQuestion) return;
    setSelectedAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: optionIdx
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // Zakończ i sprawdź quiz
      setQuizSubmitted(true);
      const passed = scorePercent >= 75;

      const updated = {
        ...completedLessons,
        [activeLesson!.id]: {
          score: scorePercent,
          passed: passed,
          claimed: completedLessons[activeLesson!.id]?.claimed || false
        }
      };
      setCompletedLessons(updated);
      try {
        localStorage.setItem("delta_knowledge_progress", JSON.stringify(updated));
      } catch {}
    }
  };

  const handleClaimReward = async () => {
    if (!activeLesson || !passedQuiz || claimingReward || rewardClaimed) return;
    setClaimingReward(true);

    try {
      const res = await fetch("/api/knowledge/complete-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId: activeLesson.id,
          lessonTitle: activeLesson.title,
          scorePercent: scorePercent,
          pointsAwarded: activeLesson.rewardPoints
        })
      });

      const data = await res.json();

      if (data.newPointsBalance !== undefined && onPointsUpdated) {
        onPointsUpdated(data.newPointsBalance);
      }

      setRewardClaimed(true);
      const updated = {
        ...completedLessons,
        [activeLesson.id]: {
          ...completedLessons[activeLesson.id],
          claimed: true
        }
      };
      setCompletedLessons(updated);
      localStorage.setItem("delta_knowledge_progress", JSON.stringify(updated));
    } catch (err) {
      console.warn("Zapis lokalny nagrody (gość / offline):", err);
      setRewardClaimed(true);
    } finally {
      setClaimingReward(false);
    }
  };

  const handleRetakeQuiz = () => {
    setSelectedAnswers({});
    setCurrentQuestionIndex(0);
    setQuizSubmitted(false);
    setQuizMode(true);
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="v200-knowledge-modal-backdrop" onClick={onClose}>
      <div 
        className="v200-knowledge-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* NAGŁÓWEK OKNA */}
        <header className="v200-knowledge-header">
          <div className="v200-knowledge-header-left">
            <div className="v200-knowledge-icon-shield">
              <BookOpen size={24} />
            </div>
            <div>
              <div className="v200-badge-academy">
                <Sparkles size={13} />
                <span>AKADEMIA MŁODEGO MISTRZA DELTY</span>
              </div>
              <h2>Kącik Wiedzy i Zasad Piłkarskich</h2>
              <p>Zasady gry, zdrowe nawyki, regeneracja i quizy z nagrodami dla rocznika 2018</p>
            </div>
          </div>

          <button 
            type="button" 
            className="v200-btn-close-knowledge"
            onClick={onClose}
            aria-label="Zamknij Kącik Wiedzy"
          >
            <X size={20} />
          </button>
        </header>

        {/* PASEK POSTĘPU MŁODEGO MISTRZA */}
        <div className="v200-knowledge-progress-banner">
          <div className="v200-knowledge-prog-info">
            <div className="v200-prog-text">
              <Trophy size={18} className="gold-icon" />
              <span>Twój Postęp Akademii: <b>{passedLessonsCount} z {totalLessonsCount}</b> ukończonych modułów</span>
            </div>
            <div className="v200-prog-percent">{overallProgressPercent}%</div>
          </div>
          <div className="v200-prog-track">
            <div 
              className="v200-prog-fill"
              style={{ width: `${overallProgressPercent}%` }}
            />
          </div>
        </div>

        {/* GŁÓWNA ZAWARTOŚĆ */}
        <div className="v200-knowledge-content">
          {!activeLesson ? (
            /* WIDOK LISTY LEKCJI */
            <div className="v200-lessons-grid">
              {LESSONS_DATA.map((lesson, idx) => {
                const state = completedLessons[lesson.id];
                const isPassed = state?.passed;
                const isClaimed = state?.claimed;

                return (
                  <div 
                    key={lesson.id} 
                    className={`v200-lesson-card ${isPassed ? "is-passed" : ""}`}
                    onClick={() => handleStartLesson(lesson)}
                  >
                    <div className="v200-lesson-card-top">
                      <span className="v200-lesson-emoji">{lesson.icon}</span>
                      <div className="v200-lesson-meta">
                        <span className="v200-lesson-index">LEKCJA 0{idx + 1}</span>
                        <span className="v200-lesson-time">{lesson.readTime} czytania</span>
                      </div>
                      {isPassed && (
                        <div className="v200-passed-badge">
                          <CheckCircle2 size={16} />
                          <span>ZALICZONE</span>
                        </div>
                      )}
                    </div>

                    <h3>{lesson.title}</h3>
                    <p>{lesson.shortDesc}</p>

                    <div className="v200-lesson-card-footer">
                      <div className="v200-lesson-reward-tag">
                        <Gift size={14} />
                        <span>+{lesson.rewardPoints} DP</span>
                        {isClaimed && <span className="claimed-check">✓ Odebrano</span>}
                      </div>

                      <button type="button" className="v200-lesson-open-btn">
                        <span>{isPassed ? "POWTÓRZ" : "CZYTAJ I TEST"}</span>
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : !quizMode ? (
            /* WIDOK LEKCJI (MATERIAŁ EDUKACYJNY) */
            <div className="v200-lesson-viewer">
              <div className="v200-viewer-nav">
                <button 
                  type="button" 
                  className="v200-btn-back-lessons"
                  onClick={() => setActiveLessonId(null)}
                >
                  ← Wróć do spisu lekcji
                </button>
                <div className="v200-viewer-badge-reward">
                  <Flame size={15} />
                  <span>Nagroda za zdanie testu: <b>+{activeLesson.rewardPoints} DP</b></span>
                </div>
              </div>

              <div className="v200-lesson-hero">
                <span className="v200-hero-emoji">{activeLesson.icon}</span>
                <div className="v200-hero-text">
                  <span className="v200-hero-tag">MATERIAŁ DLA PIŁKARZA I RODZICA</span>
                  <h2>{activeLesson.title}</h2>
                  <p>{activeLesson.shortDesc}</p>
                </div>
              </div>

              {/* GŁÓWNE PUNKTY WIEDZY */}
              <div className="v200-keypoints-grid">
                {activeLesson.keyPoints.map((kp, kIdx) => (
                  <div key={kIdx} className="v200-keypoint-item">
                    <div className="v200-kp-icon">{kp.icon}</div>
                    <div className="v200-kp-body">
                      <h4>{kp.title}</h4>
                      <p>{kp.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* CIEKAWOSTKA I WSKAZÓWKA DLA RODZICA */}
              <div className="v200-tips-duo">
                <div className="v200-tip-card fun-fact">
                  <div className="v200-tip-title">
                    <Star size={18} />
                    <span>CIEKAWOSTKA ZE ŚWIATA PIŁKI</span>
                  </div>
                  <p>{activeLesson.funFact}</p>
                </div>

                <div className="v200-tip-card parent-guide">
                  <div className="v200-tip-title">
                    <ShieldCheck size={18} />
                    <span>WSKAZÓWKA DLA RODZICA</span>
                  </div>
                  <p>{activeLesson.parentTip}</p>
                </div>
              </div>

              {/* DOLNY PASEK STARTU TESTU */}
              <div className="v200-lesson-cta-bar">
                <div className="v200-cta-info">
                  <b>Gotowy na wyzwanie?</b>
                  <span>Odpowiedz poprawnie na min. 75% pytań (3 z 4), by zdobyć odznakę <b>{activeLesson.badgeName}</b> i <b>{activeLesson.rewardPoints} Punktów DELTA</b>!</span>
                </div>
                <button 
                  type="button" 
                  className="v200-btn-start-quiz-glow"
                  onClick={handleStartQuiz}
                >
                  <Sparkles size={18} />
                  <span>ROZPOCZNIJ QUIZ MISTRZA</span>
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          ) : !quizSubmitted ? (
            /* WIDOK PYTANIA W QUIZIE */
            <div className="v200-quiz-container">
              <div className="v200-quiz-top-bar">
                <button 
                  type="button" 
                  className="v200-btn-back-to-lesson"
                  onClick={() => setQuizMode(false)}
                >
                  ← Przerwij i wróć do czytania
                </button>
                <div className="v200-quiz-step-count">
                  Pytanie <b>{currentQuestionIndex + 1}</b> z <b>{totalQuestions}</b>
                </div>
              </div>

              {currentQuestion && (
                <div className="v200-question-sheet">
                  <div className="v200-q-badge">
                    <HelpCircle size={15} />
                    <span>PYTANIE {currentQuestionIndex + 1}</span>
                  </div>
                  <h3 className="v200-q-title">{currentQuestion.question}</h3>

                  <div className="v200-q-options">
                    {currentQuestion.options.map((opt, optIdx) => {
                      const isSelected = selectedAnswers[currentQuestion.id] === optIdx;
                      return (
                        <button
                          key={optIdx}
                          type="button"
                          className={`v200-q-opt-btn ${isSelected ? "selected" : ""}`}
                          onClick={() => handleSelectAnswer(optIdx)}
                        >
                          <span className="v200-opt-letter">
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span className="v200-opt-text">{opt}</span>
                          {isSelected && <CheckCircle2 size={20} className="check-gold" />}
                        </button>
                      );
                    })}
                  </div>

                  <div className="v200-q-actions">
                    <button
                      type="button"
                      disabled={selectedAnswers[currentQuestion.id] === undefined}
                      className="v200-btn-quiz-next"
                      onClick={handleNextQuestion}
                    >
                      <span>{currentQuestionIndex === totalQuestions - 1 ? "ZOBACZ WYNIK TESTU" : "NASTĘPNE PYTANIE"}</span>
                      <ArrowRight size={18} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* WIDOK PODSUMOWANIA WYNIKU QUIZU */
            <div className="v200-quiz-result-view">
              <div className={`v200-result-hero ${passedQuiz ? "is-winner" : "is-failed"}`}>
                <div className="v200-result-avatar">
                  {passedQuiz ? <Trophy size={48} /> : <XCircle size={48} />}
                </div>

                <h2>{passedQuiz ? "FANTASTYCZNIE! MISTRZ WIEDZY!" : "DOBRY TRENING! SPRÓBUJ PONOWNIE"}</h2>
                <p className="v200-result-subtitle">
                  {passedQuiz 
                    ? `Zdobyłeś ${correctAnswersCount} z ${totalQuestions} punktów (${scorePercent}%). Egzamin zdany celująco!`
                    : `Twój wynik to ${correctAnswersCount} z ${totalQuestions} punktów (${scorePercent}%). Wymagane jest min. 75% (3 z 4).`}
                </p>

                {passedQuiz && (
                  <div className="v200-earned-badge-card">
                    <Award size={28} className="gold-icon" />
                    <div>
                      <small>ODBLOKOWANA ODZNAKA</small>
                      <b>{activeLesson.badgeName}</b>
                    </div>
                  </div>
                )}

                {/* NAGRODA I ODBIÓR */}
                {passedQuiz && (
                  <div className="v200-reward-claim-box">
                    {!rewardClaimed ? (
                      <button
                        type="button"
                        className="v200-btn-claim-points"
                        disabled={claimingReward}
                        onClick={handleClaimReward}
                      >
                        <Sparkles size={20} />
                        <span>{claimingReward ? "PRZYZNAWANIE NAGRODY..." : `ODBIERZ +${activeLesson.rewardPoints} PUNKTÓW DELTA`}</span>
                      </button>
                    ) : (
                      <div className="v200-reward-success-banner">
                        <CheckCircle2 size={22} />
                        <span>Punkty <b>+{activeLesson.rewardPoints} DP</b> zostały dopisane do Twojego konta!</span>
                      </div>
                    )}
                  </div>
                )}

                {/* LISTA PYTAŃ Z WYJAŚNIENIEM */}
                <div className="v200-answers-review">
                  <h4>PRZEGLĄD ODPOWIEDZI:</h4>
                  {activeLesson.questions.map((q, idx) => {
                    const userAns = selectedAnswers[q.id];
                    const isCorrect = userAns === q.correctIndex;
                    return (
                      <div key={q.id} className={`v200-review-item ${isCorrect ? "correct" : "incorrect"}`}>
                        <div className="v200-review-top">
                          <span>{isCorrect ? "✓" : "✗"} Pytanie {idx + 1}: {q.question}</span>
                        </div>
                        <p className="v200-review-expl">
                          💡 <b>Wyjaśnienie:</b> {q.explanation}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <div className="v200-result-actions">
                  <button 
                    type="button"
                    className="v200-btn-retake"
                    onClick={handleRetakeQuiz}
                  >
                    <RotateCcw size={17} />
                    <span>SPÓBUJ PONOWNIE</span>
                  </button>

                  <button 
                    type="button"
                    className="v200-btn-finish-knowledge"
                    onClick={() => {
                      setActiveLessonId(null);
                      setQuizMode(false);
                    }}
                  >
                    <span>WRÓĆ DO KĄCIKA WIEDZY</span>
                    <ChevronRight size={17} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
