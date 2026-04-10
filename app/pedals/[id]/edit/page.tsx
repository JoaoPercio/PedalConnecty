"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { FooterNav } from "@/components/FooterNav";
import { EditPedalForm, type PedalEditInitial } from "@/components/pedals/EditPedalForm";
import { supabase } from "@/lib/supabase";

export default function EditPedalPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";
  const { user, loading: authLoading } = useAuth();
  const [pedal, setPedal] = useState<PedalEditInitial | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;
    setLoading(true);

    (async () => {
      const { data, error } = await supabase
        .from("pedals")
        .select(
          "id,name,description,date,start_location,start_lat,start_lng,end_lat,end_lng,distance_km,elevation_gain,difficulty,terrain,max_participants,requires_safety_equipment,required_equipment,age_group,visibility,invite_code,route_geojson,route_waypoints,cover_image_url,creator_id"
        )
        .eq("id", id)
        .maybeSingle();

      if (cancelled) return;

      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setPedal(data as PedalEditInitial);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (authLoading || loading || !pedal || !user) return;
    if (user.id !== pedal.creator_id) {
      router.replace(`/pedals/${id}`);
    }
  }, [authLoading, loading, pedal, user, router, id]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-text-secondary">Carregando…</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (notFound || !pedal) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Navbar />
        <main className="px-4 py-10 text-center">
          <p className="text-text-secondary">Pedal não encontrado.</p>
        </main>
        <FooterNav />
      </div>
    );
  }

  if (user.id !== pedal.creator_id) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-text-secondary">Redirecionando…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />
      <EditPedalForm initial={pedal} />
      <FooterNav />
    </div>
  );
}
