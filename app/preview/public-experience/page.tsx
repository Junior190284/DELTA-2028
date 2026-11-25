import PublicTeamSite from "@/components/PublicTeamSite";

export const dynamic = "force-dynamic";

const demoMatches = [
  {
    id: "demo-next",
    round_no: 4,
    match_date: "2026-12-06",
    match_time: "11:30",
    venue: "Warszawa · obiekt demonstracyjny",
    home_team: "K.S. Delta Warszawa GM",
    away_team: "FC Vizja Warszawa",
    home_score: null,
    away_score: null,
    status: "scheduled",
  },
  {
    id: "demo-last",
    round_no: 3,
    match_date: "2026-11-22",
    match_time: "10:00",
    venue: "Warszawa",
    home_team: "K.S. Delta Warszawa GM",
    away_team: "RKS Ursus Warszawa",
    home_score: 3,
    away_score: 2,
    status: "played",
  },
];

export default function PublicExperiencePreviewPage() {
  return (
    <PublicTeamSite
      demoMode
      matches={demoMatches}
      news={[{
        id: "demo-news",
        type: "demo",
        title: "DEMO: Kronika drużyny bez danych zawodników",
        body: null,
        published_at: "2026-11-25T12:00:00Z",
      }]}
      clubUpdates={[{
        id: "demo-update",
        source_key: "demo",
        source_name: "DELTA DEMO",
        source_url: "",
        title: "DEMO · Nowy tydzień, wspólny cel, jedna drużyna",
        body: null,
        priority: 1,
        published_at: "2026-11-25T12:00:00Z",
      }]}
      teamEvents={[{
        id: "demo-event",
        title: "Trening drużynowy · DEMO",
        event_type: "training",
        event_date: "2026-11-28",
        start_time: "17:30",
        end_time: "19:00",
        location: "Obiekt demonstracyjny",
        details: null,
        important: false,
      }]}
    />
  );
}
