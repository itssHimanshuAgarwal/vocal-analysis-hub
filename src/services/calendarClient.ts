import { supabase } from "@/integrations/supabase/client";

export type CalendarEvent = {
  summary: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
};

export async function fetchTomorrowEvents(): Promise<CalendarEvent[]> {
  try {
    const { data, error } = await supabase.functions.invoke("fetch-calendar", {
      body: {},
    });
    if (error || !data?.ok || !Array.isArray(data?.events)) return [];
    return data.events as CalendarEvent[];
  } catch (e) {
    console.warn("calendar fetch failed", e);
    return [];
  }
}
