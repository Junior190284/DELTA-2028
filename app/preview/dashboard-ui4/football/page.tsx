import TeamHub from "@/components/TeamHub";
import { EMPTY_PERMISSIONS } from "@/lib/permissions";

const players = [
  { id: "10000000-0000-4000-8000-000000000001", display_name: "Zawodnik Alfa", shirt_number: "9", position: "Napastnik", photo_path: null, active: true },
  { id: "10000000-0000-4000-8000-000000000002", display_name: "Zawodnik Beta", shirt_number: "7", position: "Pomocnik", photo_path: null, active: true },
  { id: "10000000-0000-4000-8000-000000000003", display_name: "Zawodnik Gamma", shirt_number: "1", position: "Bramkarz", photo_path: null, active: true },
];

const matches = [
  { id: "20000000-0000-4000-8000-000000000001", round_no: 4, match_date: "2026-11-28", match_time: "10:00", venue: "Syta 123", home_team: "K.S. Delta Warszawa GM", away_team: "K.S. Delta Warszawa WI", home_score: null, away_score: null, status: "scheduled" },
  { id: "20000000-0000-4000-8000-000000000002", round_no: 3, match_date: "2026-10-04", match_time: "12:00", venue: "Warszawa", home_team: "FC Vizja Warszawa", away_team: "K.S. Delta Warszawa GM", home_score: 5, away_score: 6, status: "played" },
  { id: "20000000-0000-4000-8000-000000000003", round_no: 2, match_date: "2026-09-26", match_time: "11:00", venue: "Warszawa", home_team: "K.S. Delta Warszawa GM", away_team: "Alfa Przymierze Rodzin", home_score: 5, away_score: 15, status: "played" },
];

export default function FootballDashboardPreview() {
  return (
    <TeamHub
      profile={{ id: "00000000-0000-4000-8000-000000000048", role: "admin", display_name: "Administrator Demo" }}
      initialPlayers={players}
      initialMatches={matches}
      initialAttendance={[]}
      initialLineup={[]}
      initialEvents={[]}
      initialNews={[
        { id: "30000000-0000-4000-8000-000000000001", type: "info", title: "Plan najbliższego tygodnia", body: "Terminy treningów i meczu ligowego w jednym miejscu.", published_at: "2026-11-26T08:00:00.000Z" },
        { id: "30000000-0000-4000-8000-000000000002", type: "wazne", title: "Potwierdź obecność na meczu", body: "Deklaracje pomagają trenerom przygotować skład.", published_at: "2026-11-25T16:30:00.000Z", priority: "urgent" },
      ]}
      initialClubUpdates={[]}
      initialTeamEvents={[]}
      initialTrainingSessions={[
        { id: "40000000-0000-4000-8000-000000000001", training_date: "2026-11-27", start_time: "17:30", end_time: "19:00", location: "Boisko DELTA", title: "Trening zespołowy", notes: null, created_at: "2026-11-20T12:00:00.000Z" },
      ]}
      initialTrainingAttendance={[]}
      initialTrainingGames={[]}
      initialTrainingGamePlayers={[]}
      initialTrainingEvents={[]}
      initialMatchMedia={[]}
      parentPlayerIds={[]}
      userPermissions={{ ...EMPTY_PERMISSIONS, role_label: "Administrator", can_manage_matches: true, can_manage_calendar: true }}
    />
  );
}
