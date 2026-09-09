"use client";

import { useEffect, useState } from "react";
import { PedalDetails } from "@/components/pedals/PedalDetails";
import { getDemoPedalDetail } from "@/usability-tests/demo-pedal";
import type { PedalDetailRecord } from "@/types/pedal-details";

export function DemoPedalDetails() {
  const [pedal, setPedal] = useState<PedalDetailRecord | null>(null);

  useEffect(() => {
    setPedal(getDemoPedalDetail());
  }, []);

  if (!pedal) {
    return (
      <main className="mx-auto max-w-xl px-4 py-10">
        <p className="text-center text-sm text-text-secondary">Carregando…</p>
      </main>
    );
  }

  return <PedalDetails key={pedal.id} initialPedal={pedal} />;
}
