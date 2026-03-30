import type {
  PedalAgeGroup,
  PedalDifficulty,
  PedalTerrain,
  PedalVisibility,
} from "@/lib/pedals";
import type { SkillLevel } from "@/types/registration";

export interface RouteGeoJSON {
  type: "LineString";
  coordinates: [number, number][];
}

export type PedalParticipantStatus = "pending" | "approved" | "rejected";

export type PedalRunStatus = "scheduled" | "in_progress" | "completed" | "cancelled";

export interface PedalDetailRecord {
  id: string;
  creator_id: string;
  name: string;
  description: string | null;
  date: string;
  status: PedalRunStatus | string;
  started_at: string | null;
  ended_at: string | null;
  distance_km: number | null;
  elevation_gain: number | null;
  difficulty: PedalDifficulty | null;
  terrain: PedalTerrain | null;
  max_participants: number | null;
  requires_safety_equipment: boolean;
  required_equipment: string[];
  age_group: PedalAgeGroup | null;
  visibility: PedalVisibility | string;
  route_geojson: RouteGeoJSON | null;
}

export interface PedalParticipantRow {
  id: string;
  pedal_id: string;
  user_id: string;
  status: PedalParticipantStatus;
}

export interface ParticipantProfile {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  city: string | null;
  gender: string | null;
  skill_level: SkillLevel | string | null;
  birth_date?: string | null;
}

export interface ApprovedParticipant extends PedalParticipantRow {
  profiles: ParticipantProfile | ParticipantProfile[] | null;
}

export interface PendingParticipantRow extends PedalParticipantRow {
  profiles: ParticipantProfile | ParticipantProfile[] | null;
}

export type PedalMessageProfile = {
  first_name: string;
  last_name: string;
  avatar_url: string | null;
};

export interface PedalMessageRow {
  id: string;
  pedal_id: string;
  user_id: string;
  message: string;
  created_at: string;
  profiles?: PedalMessageProfile | PedalMessageProfile[] | null;
}
