 "use client";

 import { Marker, Popup } from "react-leaflet";
 import L from "leaflet";
 import { useRouter } from "next/navigation";
 import type { PedalDifficulty } from "@/lib/pedals";

 export interface NearbyPedal {
   id: string;
   name: string;
   date: string;
   distance_km: number | null;
   difficulty: PedalDifficulty | null;
   start_lat: number;
   start_lng: number;
 }

 const bikeIcon = L.divIcon({
   className: "nearby-pedal-marker",
   iconSize: [32, 32],
   iconAnchor: [16, 32],
   html: `
     <div class="flex h-8 w-8 items-center justify-center rounded-full bg-primary shadow-md">
       <span class="text-xs font-semibold text-white">🚴‍♂️</span>
     </div>
   `,
 });

 function formatDate(date: string): string {
   try {
     return new Date(date).toLocaleString("pt-BR", {
       day: "2-digit",
       month: "2-digit",
       hour: "2-digit",
       minute: "2-digit",
     });
   } catch {
     return date;
   }
 }

 function difficultyLabel(diff: PedalDifficulty | null): string {
   if (!diff) return "Não informado";
   if (diff === "iniciante") return "Iniciante";
   if (diff === "intermediario") return "Intermediário";
   if (diff === "avancado") return "Avançado";
   return diff;
 }

 interface PedalMarkerProps {
   pedal: NearbyPedal;
 }

 export function PedalMarker({ pedal }: PedalMarkerProps) {
   const router = useRouter();

   return (
     <Marker
       position={[pedal.start_lat, pedal.start_lng]}
       icon={bikeIcon}
       eventHandlers={{
         click: (e) => {
           e.originalEvent.stopPropagation();
         },
       }}
     >
       <Popup closeButton={false} className="rounded-xl shadow-lg">
         <div className="w-56 space-y-1 text-sm">
           <p className="font-semibold text-foreground">{pedal.name}</p>
           <p className="text-xs text-text-secondary">{formatDate(pedal.date)}</p>
           <p className="text-xs text-text-secondary">
             Distância:{" "}
             {pedal.distance_km !== null ? `${pedal.distance_km} km` : "—"}
           </p>
           <p className="text-xs text-text-secondary">
             Dificuldade: {difficultyLabel(pedal.difficulty)}
           </p>
           <button
             type="button"
             onClick={() => router.push(`/pedals/${pedal.id}`)}
             className="mt-2 w-full rounded-lg bg-gradient-to-r from-primary to-emerald-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:brightness-110"
           >
             Ver detalhes
           </button>
         </div>
       </Popup>
     </Marker>
   );
 }

