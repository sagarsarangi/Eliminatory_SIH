"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

/**
 * Invisible component that listens for new joint_predictions via Supabase Realtime
 * and calls router.refresh() to re-fetch map hotspot data from the server.
 * Mirrors the dashboard's RealtimeRefresher but mounted specifically on the Map page.
 */
export function MapRealtimeRefresher() {
  const router = useRouter();

  useEffect(() => {
    const channel = supabase
      .channel("map-joint-predictions")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "joint_predictions",
        },
        () => {
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
