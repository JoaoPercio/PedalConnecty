import { notFound } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { FooterNav } from "@/components/FooterNav";
import { PedalDetails } from "@/components/pedals/PedalDetails";
import { supabase } from "@/lib/supabase";
import type { PedalDetailRecord } from "@/types/pedal-details";

interface PedalPageProps {
  params: Promise<{ id: string }>;
}

export default async function PedalDetailPage({ params }: PedalPageProps) {
  const { id } = await params;

  const { data, error } = await supabase
    .from("pedals")
    .select(
      "id,creator_id,name,description,date,distance_km,elevation_gain,difficulty,terrain,max_participants,requires_safety_equipment,required_equipment,age_group,visibility,route_geojson"
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
      <PedalDetails initialPedal={pedal} />
      <FooterNav />
    </div>
  );
}
