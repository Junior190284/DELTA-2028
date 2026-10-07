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
  difficulty: "easy" | "medium" | "hard";
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
    difficulty: "easy",
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
    difficulty: "easy",
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
    difficulty: "easy",
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
    difficulty: "easy",
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
    difficulty: "easy",
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
    difficulty: "medium",
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
  },
  {
    id: "tactics-passing-triangles",
    category: "rules",
    difficulty: "medium",
    title: "Trójkąty Podaniowe i Gra Pozycyjna",
    shortDesc: "Jak tworzyć linie podania, otwierać pozycję i wychodzić do piłki w ataku pozycyjnym.",
    icon: "📐",
    badgeName: "Mistrz Trójkątów",
    rewardPoints: 60,
    readTime: "3 min",
    keyPoints: [
      {
        icon: "🔺",
        title: "Zawsze Dwie Opcje Podania",
        desc: "Zawodnik przy piłce powinien zawsze widzieć co najmniej dwóch kolegów tworzących trójkąt."
      },
      {
        icon: "🏃",
        title: "Ruch Bez Piłki",
        desc: "Gdy podasz piłkę – natychmiast zmień pozycję i wyjdź w wolną przestrzeń na kolejne podanie!"
      },
      {
        icon: "👀",
        title: "Skanowanie Przestrzeni",
        desc: "Przed przyjęciem piłki spójrz przez ramię (skanowanie), by wiedzieć gdzie są rywale."
      },
      {
        icon: "⚽",
        title: "Kierunkowe Przyjęcie",
        desc: "Pierwszy kontakt z piłką powinien od razu kierować nas w stronę wolnego pola lub bramki."
      }
    ],
    funFact: "FC Barcelona i Pep Guardiola opierają cały swój styl gry na ciągłym tworzeniu geometrycznych trójkątów na całym boisku!",
    parentTip: "Podczas oglądania meczu w TV zwróćcie uwagę dziecku na zawodnika, który po podaniu natychmiast rusza w wolne pole.",
    questions: [
      {
        id: "q1",
        question: "Co robisz natychmiast po oddaniu celnego podania do kolegi?",
        options: [
          "Zatrzymujesz się i odpoczywasz",
          "Ruszasz w wolną przestrzeń, by dać koledze kolejną opcję podania",
          "Siadasz na murawie"
        ],
        correctIndex: 1,
        explanation: "Ruch po podaniu to fundament nowoczesnej piłki nożnej!"
      },
      {
        id: "q2",
        question: "Co oznacza pojęcie 'skanowanie przestrzeni'?",
        options: [
          "Robienie zdjęcia telefonem",
          "Rozglądanie się i sprawdzanie pozycji rywali i kolegów przed przyjęciem piłki",
          "Patrzenie tylko pod swoje nogi"
        ],
        correctIndex: 1,
        explanation: "Skanowanie pozwala podjąć decyzję jeszcze zanim piłka dotrze do Twojej stopy."
      },
      {
        id: "q3",
        question: "Dlaczego trójkąty podaniowe są tak skuteczne?",
        options: [
          "Bo gracz z piłką ma zawsze min. 2 bezpieczne i szybkie drogi rozegrania",
          "Bo ładnie wyglądają z trybun",
          "Bo nie trzeba biegać"
        ],
        correctIndex: 0,
        explanation: "Trójkąt uniemożliwia rywalowi łatwe zablokowanie akcji!"
      }
    ]
  },
  {
    id: "tactics-transitions",
    category: "rules",
    difficulty: "hard",
    title: "Fazy Przejściowe: Odbiór i Kontratak",
    shortDesc: "Co robić w pierwszych 5 sekundach po odbiorze i po stracie piłki.",
    icon: "⚡",
    badgeName: "Strateg Przejść",
    rewardPoints: 75,
    readTime: "4 min",
    keyPoints: [
      {
        icon: "⏱️",
        title: "Zasada 5 Sekund po Stracie (Gegenpressing)",
        desc: "Natychmiast po stracie piłki najbliżsi zawodnicy ruszają do doskoku, by odzyskać futbolówkę."
      },
      {
        icon: "🚀",
        title: "Błyskawiczne Pierwsze Podanie do Przodu",
        desc: "Po odbiorze piłki pierwsze podanie w wolne pole omija zdezorientowaną obronę rywala."
      },
      {
        icon: "🧱",
        title: "Odbudowa Struktury Obronnej",
        desc: "Jeśli doskok się nie udał – cała drużyna wraca za linię piłki i zamyka środek boiska."
      },
      {
        icon: "🗣️",
        title: "Głośna Komunikacja",
        desc: "Krzyczymy 'PLECY!', 'CZAS!', 'MOJA!' – komunikacja na boisku dodaje drużynie pewności."
      }
    ],
    funFact: "Ponad 60% wszystkich bramek w Lidze Mistrzów pada w ciągu pierwszych 10 sekund od odbioru piłki!",
    parentTip: "Chwalmy dziecko za natychmiastową reakcję po stracie piłki i chęć jej powrotnego odebrania.",
    questions: [
      {
        id: "q1",
        question: "Co powinna zrobić drużyna w pierwszych sekundach po stracie piłki?",
        options: [
          "Zacząć kłócić się z sędzią",
          "Zastosować szybki doskok (pressing) i próbować natychmiast odzyskać piłkę",
          "Zatrzymać się i czekać na gwizdek"
        ],
        correctIndex: 1,
        explanation: "Szybki doskok zaskakuje rywala i pozwala natychmiast wznowić atak!"
      },
      {
        id: "q2",
        question: "Dlaczego głośna komunikacja ('PLECY!', 'CZAS!') jest tak ważna?",
        options: [
          "Ostrzega kolegę przed nadbiegającym rywalem i pomaga podjąć dobrą decyzję",
          "Tylko po to, żeby było głośno na hali",
          "Nie ma żadnego znaczenia"
        ],
        correctIndex: 0,
        explanation: "Głos z boiska to 'trzecie oko' każdego piłkarza!"
      },
      {
        id: "q3",
        question: "W którym kierunku najlepiej zagrać pierwsze podanie po odbiorze?",
        options: [
          "Zawsze do własnego bramkarza",
          "W wolną przestrzeń do przodu, by zaskoczyć wracających obrońców",
          "W trybuny"
        ],
        correctIndex: 1,
        explanation: "Pionowe podanie po odbiorze tworzy natychmiastową sytuację bramkową."
      }
    ]
  },
  {
    id: "mindset-confidence",
    category: "fairplay",
    difficulty: "medium",
    title: "Pewność Siebie i Odwaga na Murawie",
    shortDesc: "Jak radzić sobie ze stresem przedmeczowym i nie bać się popełniania błędów.",
    icon: "🦁",
    badgeName: "Lwie Serce",
    rewardPoints: 60,
    readTime: "3 min",
    keyPoints: [
      {
        icon: "🧠",
        title: "Błędy to Lekcje",
        desc: "Każdy wielki piłkarz popełnia błędy. Najważniejsze to nie poddawać się i próbować dalej!"
      },
      {
        icon: "🫁",
        title: "Spokojny Głęboki Oddech",
        desc: "Przed wyjściem na murawę weź 3 głębokie wdechy nosem i wydechy ustami, by uspokoić emocje."
      },
      {
        icon: "🎯",
        title: "Skupienie na Zadaniu, Nie na Wyniku",
        desc: "Skup się na walce, bieganiu i podaniach – dobry wynik przyjdzie sam jako efekt pracy."
      },
      {
        icon: "🔥",
        title: "Wiara w Swoje Umiejętności",
        desc: "Pamiętaj o setkach udanych zagrań z treningów. Umiesz grać w piłkę – ciesz się meczem!"
      }
    ],
    funFact: "Robert Lewandowski w wieku juniorskim był uważany za zbyt drobnego, ale dzięki niezłomnemu charakterowi i wierze w siebie został najlepszym piłkarzem świata!",
    parentTip: "Po meczu zapytajmy: 'Czy dobrze się bawiłeś?' zamiast 'Ile bramek strzeliłeś?'.",
    questions: [
      {
        id: "q1",
        question: "Co robisz, gdy czujesz lekki stres przed ważnym meczem turniejowym?",
        options: [
          "Bierzesz kilka głębokich, spokojnych oddechów i myślisz o radości z gry w piłkę",
          "Rezygnujesz z wyjścia na boisko",
          "Płaczesz w kącie szatni"
        ],
        correctIndex: 0,
        explanation: "Głęboki oddech uspokaja ciało i przygotowuje umysł do wspaniałej rywalizacji."
      },
      {
        id: "q2",
        question: "Czym jest błąd na boisku piłkarskim?",
        options: [
          "Konieczną lekcją, z której wyciągamy wnioski i stajemy się lepsi",
          "Koniecznością natychmiastowego zakończenia kariery",
          "Powodem do złości na cały świat"
        ],
        correctIndex: 0,
        explanation: "Kto nie próbuje, ten nie popełnia błędów. Odwaga to cecha mistrzów!"
      }
    ]
  },
  {
    id: "defense-1v1-mastery",
    category: "rules",
    difficulty: "hard",
    title: "Sztuka Pojedynków 1 na 1 w Obronie",
    shortDesc: "Prawidłowa postawa obrońcy: ugięte kolana, dystans i cierpliwość bez 'wypadania'.",
    icon: "🛡️",
    badgeName: "Nie do Przejścia",
    rewardPoints: 75,
    readTime: "3 min",
    keyPoints: [
      {
        icon: "🦵",
        title: "Ugięte Nogi i Nisko Środek Ciężkości",
        desc: "Stoimy na ugiętych kolanach, na przedniej części stóp – gotowi do skrętu w lewo lub w prawo."
      },
      {
        icon: "📐",
        title: "Pozycja Boczna (Ukos)",
        desc: "Nie stoimy płasko twarzą do rywala! Jedna noga z przodu, druga z tyłu kieruje rywala do linii bocznej."
      },
      {
        icon: "⏳",
        title: "Cierpliwość – Nie Wypadaj!",
        desc: "Nie atakujemy 'na raz'. Czekamy na błąd rywala, zbyt daleki wypust piłki lub zwolnienie tempa."
      },
      {
        icon: "👀",
        title: "Patrz na Piłkę, Nie na Zwody Ciała",
        desc: "Rywale robią zwody tułowiem, ale piłka nie kłamie – skup wzrok na samej futbolówce!"
      }
    ],
    funFact: "Virgil van Dijk w całym sezonie 2018/19 nie dał się przedryblować ani jednemu zawodnikowi w Premier League i Lidze Mistrzów dzięki idealnemu timingowi!",
    parentTip: "Zwracajmy uwagę na cierpliwość w grze obronnej – powstrzymanie rywala bez faulu to wielka sztuka.",
    questions: [
      {
        id: "q1",
        question: "Jak powinna wyglądać prawidłowa postawa obrońcy w pojedynku 1 na 1?",
        options: [
          "Proste sztywne nogi i ręce w kieszeniach",
          "Ugięte kolana, nisko środek ciężkości, pozycja lekko boczna na palcach",
          "Leżenie na trawie"
        ],
        correctIndex: 1,
        explanation: "Niski środek ciężkości pozwala błyskawicznie zareagować na zmianę kierunku rywala."
      },
      {
        id: "q2",
        question: "Na co patrzy uważny obrońca podczas dryblingu przeciwnika?",
        options: [
          "Na fryzurę rywala",
          "Na samą piłkę, ignorując zmyłki tułowia",
          "W niebo"
        ],
        correctIndex: 1,
        explanation: "Piłka jest jedynym prawdziwym wyznacznikiem kierunku akcji!"
      }
    ]
  },
  {
    id: "nutrition-matchday-fuel",
    category: "nutrition",
    difficulty: "medium",
    title: "Plan Żywieniowy w Dniu Turnieju",
    shortDesc: "Jak jeść i pić, gdy gramy 4-5 meczów jednego dnia na turnieju.",
    icon: "🍱",
    badgeName: "Turniejowy Mistrz Energii",
    rewardPoints: 60,
    readTime: "3 min",
    keyPoints: [
      {
        icon: "🥞",
        title: "Śniadanie Mistrzów (2h przed startem)",
        desc: "Owsianka z bananem i miodem, tost z chudym twarogiem lub jajecznica z pieczywem pełnoziarnistym."
      },
      {
        icon: "🍎",
        title: "Przekąski Międzymeczowe (w przerwach)",
        desc: "Ćwiartki jabłek, banany, suszone daktyle, musy owocowe i lekkie wafelki ryżowe."
      },
      {
        icon: "🚫",
        title: "Unikaj Ciężkich Obiadów w Trakcie Gier",
        desc: "Kotlet schabowy czy pizza w trakcie turnieju zabiorą całą krew do trawienia i spowodują kolkę."
      },
      {
        icon: "💧",
        title: "Ciągłe Małe Nawadnianie",
        desc: "Pijemy 2-3 łyki wody co 15 minut między meczami, by organizm nie poczuł pragnienia."
      }
    ],
    funFact: "Podczas całodniowego turnieju młody zawodnik może przebiec nawet 8-10 kilometrów i spalić ponad 1500 kalorii!",
    parentTip: "Spakujmy do torby turniejowej pudełko z pokrojonymi owocami, suszonymi morelami i 2 butelki wody.",
    questions: [
      {
        id: "q1",
        question: "Co najlepiej zjeść w krótkiej 30-minutowej przerwie między meczami turnieju?",
        options: [
          "Tłustego burgera z frytkami",
          "Kawałek banana, mus owocowy lub wafelek ryżowy",
          "Paczkę chipsów"
        ],
        correctIndex: 1,
        explanation: "Lekkostrawne węglowodany z owoców natychmiast uzupełniają energię bez obciążania żołądka."
      },
      {
        id: "q2",
        question: "Kiedy jemy główne śniadanie przed pierwszym meczem turnieju?",
        options: [
          "W trakcie zakładania butów na boisku",
          "Około 2 godziny przed pierwszym gwizdkiem",
          "Dzień wcześniej wieczorem i nic rano"
        ],
        correctIndex: 1,
        explanation: "2 godziny dają czas na strawienie posiłku i zamianę jedzenia w czyste paliwo mięśniowe!"
      }
    ]
  },
  {
    id: "recovery-doms-stretching",
    category: "recovery",
    difficulty: "hard",
    title: "Regeneracja Powysiłkowa i Prawidłowy Rozruch",
    shortDesc: "Jak dbać o mięśnie po ciężkim turnieju: rolowanie, rozciąganie i ciepły prysznic.",
    icon: "🧘",
    badgeName: "Ekspert Odnowy",
    rewardPoints: 75,
    readTime: "3 min",
    keyPoints: [
      {
        icon: "🚶",
        title: "Schłodzenie Organizmu (Cool-down)",
        desc: "Po meczu nie siadamy od razu na ławce – 3 minuty truchtu i spaceru usuwają kwas mlekowy z nóg."
      },
      {
        icon: "🤸",
        title: "Spokojny Stretching Statyczny",
        desc: "Rozciągamy łydki, uda i pośladki, przytrzymując każdą pozycję bez pulsowania przez 15-20 sekund."
      },
      {
        icon: "🚿",
        title: "Naprzemienny Prysznic (Ciepła/Chłodna Woda)",
        desc: "Prysznic pobudza krążenie krwi i przyspiesza regenerację zmęczonych nóg."
      },
      {
        icon: "🍲",
        title: "Posiłek Regeneracyjny (do 45 min po wysiłku)",
        desc: "Dostarczamy węglowodany i białko (np. zupa, kurczak z ryżem, twaróg), by odbudować włókna mięśniowe."
      }
    ],
    funFact: "Kluby Premier League stosują po meczach specjalne wanny z lodem oraz komory kriogeniczne o temperaturze -110°C, by przyspieszyć regenerację!",
    parentTip: "Zachęćmy dziecko do 5 minut spokojnego rozciągania w domu na dywanie po powrocie z meczu.",
    questions: [
      {
        id: "q1",
        question: "Co warto zrobić zaraz po końcowym gwizdku intensywnego meczu?",
        options: [
          "Położyć się bez ruchu na ziemi",
          "Wykonać krótki 3-minutowy trucht i spokojny spacer na uspokojenie tętna",
          "Wypić duszkiem zimną colę"
        ],
        correctIndex: 1,
        explanation: "Cool-down pozwala sercu i mięśniom łagodnie wrócić do stanu spoczynku."
      },
      {
        id: "q2",
        question: "Do ilu minut po meczu warto zjeść pełnowartościowy posiłek regeneracyjny?",
        options: [
          "Do 45 minut po wysiłku (tzw. okno węglowodanowe)",
          "Za 3 dni",
          "Nie ma to żadnego znaczenia"
        ],
        correctIndex: 0,
        explanation: "W tym czasie mięśnie najszybciej chłoną składniki odżywcze i regenerują się na kolejny trening!"
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
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");

  const recommendedNextLesson = useMemo(() => {
    return LESSONS_DATA.find(l => !completedLessons[l.id]?.passed) || LESSONS_DATA[0];
  }, [completedLessons]);

  const filteredLessons = useMemo(() => {
    return LESSONS_DATA.filter(lesson => {
      if (selectedCategory !== "all" && lesson.category !== selectedCategory) return false;
      if (selectedDifficulty !== "all" && lesson.difficulty !== selectedDifficulty) return false;
      return true;
    });
  }, [selectedCategory, selectedDifficulty]);

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
            <div className="v200-lessons-catalog-wrap animate-fadeIn">
              {/* SPOTLIGHT: NASTĘPNA REKOMENDOWANA LEKCJA */}
              {recommendedNextLesson && (
                <div 
                  className="v200-recommended-lesson-banner"
                  onClick={() => handleStartLesson(recommendedNextLesson)}
                >
                  <div className="banner-left">
                    <div className="banner-icon-box">
                      <span className="text-3xl">{recommendedNextLesson.icon}</span>
                    </div>
                    <div>
                      <div className="banner-tag">
                        <Sparkles size={12} className="text-yellow-400 animate-spin" />
                        <span>NASTĘPNA REKOMENDOWANA LEKCJA</span>
                      </div>
                      <h3 className="banner-title">{recommendedNextLesson.title}</h3>
                      <p className="banner-desc">{recommendedNextLesson.shortDesc}</p>
                    </div>
                  </div>
                  <div className="banner-right">
                    <div className="banner-reward-pill">
                      <Gift size={15} />
                      <span>+{recommendedNextLesson.rewardPoints} DP</span>
                    </div>
                    <button type="button" className="banner-cta-btn">
                      <span>ROZPOCZNIJ LEKCJĘ</span>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* FILTROWANIE: KATEGORIA & POZIOM TRUDNOŚCI */}
              <div className="v200-knowledge-filters-bar devil-card">
                <div className="filter-row">
                  <span className="text-xs text-slate-400 font-bold uppercase self-center mr-1">KATEGORIA:</span>
                  {[
                    { id: "all", label: "Wszystkie" },
                    { id: "rules", label: "⚽ Zasady Gry" },
                    { id: "nutrition", label: "🥗 Żywienie" },
                    { id: "hydration", label: "💧 Nawodnienie" },
                    { id: "recovery", label: "🌙 Regeneracja" },
                    { id: "equipment", label: "🎒 Sprzęt" },
                    { id: "fairplay", label: "🤝 Fair Play" }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSelectedCategory(tab.id)}
                      className={`v200-knowledge-pill-btn ${selectedCategory === tab.id ? "active" : ""}`}
                    >
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>

                <div className="filter-row mt-2">
                  <span className="text-xs text-slate-400 font-bold uppercase self-center mr-1">POZIOM:</span>
                  {[
                    { id: "all", label: "Wszystkie Poziomy" },
                    { id: "easy", label: "🟢 Łatwy (Podstawowy)" },
                    { id: "medium", label: "🟡 Średni (Zaawansowany)" },
                    { id: "hard", label: "🔴 Trudny (Mistrzowski)" }
                  ].map(diff => (
                    <button
                      key={diff.id}
                      type="button"
                      onClick={() => setSelectedDifficulty(diff.id)}
                      className={`v200-knowledge-pill-btn diff ${selectedDifficulty === diff.id ? "active" : ""}`}
                    >
                      <span>{diff.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* WIDOK LISTY LEKCJI */}
              {filteredLessons.length === 0 ? (
                <div className="v104-empty-state devil-card" style={{ padding: "36px 20px", textAlign: "center" }}>
                  <HelpCircle size={40} className="mx-auto mb-2 text-slate-500" />
                  <h3 className="text-base font-bold text-white mb-1">Brak lekcji dla wybranego filtru</h3>
                  <p className="text-xs text-slate-400">Zmień kategorię lub poziom trudności.</p>
                </div>
              ) : (
                <div className="v200-lessons-grid">
                  {filteredLessons.map((lesson, idx) => {
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
                          
                          <div className="v200-lesson-top-badges">
                            <span className={`v200-diff-badge diff-${lesson.difficulty || "easy"}`}>
                              {lesson.difficulty === "easy" ? "ŁATWY" : lesson.difficulty === "medium" ? "ŚREDNI" : "TRUDNY"}
                            </span>
                            {isPassed && (
                              <div className="v200-passed-badge">
                                <CheckCircle2 size={13} />
                                <span>ZALICZONE</span>
                              </div>
                            )}
                          </div>
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
                            <span>{isPassed ? "POWTÓRZ" : "CZYTAJ I QUIZ"}</span>
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
