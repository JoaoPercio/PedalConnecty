import { notFound } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { FooterNav } from "@/components/FooterNav";
import { PedalDetails } from "@/components/pedals/PedalDetails";
import { DemoPedalDetails } from "@/components/usability-tests/DemoPedalDetails";
import { supabase } from "@/lib/supabase";
import type { PedalDetailRecord } from "@/types/pedal-details";
import { isDemoPedalId } from "@/usability-tests/demo-pedal";
import { isUsabilityTestsEnabled } from "@/usability-tests/config";

interface PedalPageProps {
  params: Promise<{ id: string }>;
}

export default async function PedalDetailPage({ params }: PedalPageProps) {
  const { id } = await params;

  if (isDemoPedalId(id)) {
    if (!isUsabilityTestsEnabled()) notFound();
    return (
      <div className="min-h-screen bg-background pb-16">
        <Navbar />
        <DemoPedalDetails />
        <FooterNav />
      </div>
    );
  }

  const { data, error } = await supabase
    .from("pedals")
    .select(
      "id,creator_id,name,description,date,status,started_at,ended_at,distance_km,average_speed_kmh,elevation_gain,difficulty,terrain,max_participants,requires_safety_equipment,required_equipment,age_group,visibility,start_location,start_lat,start_lng,route_geojson,route_waypoints"
    )
    .eq("id", id)
    .single();

  if (error || !data) {
    notFound();
  }

  const pedal = data as PedalDetailRecord;

  return (
    <div className="min-h-screen bg-background pb-16">
      <Navbar />
      <PedalDetails key={pedal.id} initialPedal={pedal} />
      <FooterNav />
    </div>
  );
}
