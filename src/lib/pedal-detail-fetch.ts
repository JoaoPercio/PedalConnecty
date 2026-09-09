import { supabase } from "./supabase";
import type { PedalDetailRecord } from "@/types/pedal-details";
import {
  getDemoPedalDetail,
  isDemoPedalId,
} from "@/usability-tests/demo-pedal";

const PEDAL_DETAIL_COLUMNS =
  "id,creator_id,name,description,date,status,started_at,ended_at,distance_km,average_speed_kmh,elevation_gain,difficulty,terrain,max_participants,requires_safety_equipment,required_equipment,age_group,visibility,start_location,start_lat,start_lng,route_geojson,route_waypoints";

export async function fetchPedalDetail(
  pedalId: string
): Promise<PedalDetailRecord | null> {
  if (isDemoPedalId(pedalId)) return getDemoPedalDetail();

  const { data, error } = await supabase
    .from("pedals")
    .select(PEDAL_DETAIL_COLUMNS)
    .eq("id", pedalId)
    .maybeSingle();

  if (error || !data) return null;
  return data as PedalDetailRecord;
}
