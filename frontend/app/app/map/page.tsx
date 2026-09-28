import { MapPageClient } from "@/components/app/map/map-page-client";
import { MapRealtimeRefresher } from "@/components/app/map/map-realtime-refresher";

export const dynamic = "force-dynamic";

export default function MapPage() {
  return (
    <div className="w-full">
      <MapPageClient />
      <MapRealtimeRefresher />
    </div>
  );
}
