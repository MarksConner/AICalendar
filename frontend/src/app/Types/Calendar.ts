/**
 * Single Event shape — mirrors the backend Event class exactly.
 * All datetime fields are ISO-8601 local datetime strings, e.g. "2026-03-27T09:00:00".
 */
export interface Event {
  id: string;
  name: string;
  start: string;              // ISO datetime
  end: string;                // ISO datetime (required)
  location?: string | null;
  priority: number;           // higher = more important; 0 = default
  flexible: boolean;
  travel_time_min: number;
  description?: string;       // UI extension — not sent by backend, kept for display
  geo_latitude?: number | null;
  geo_longitude?: number | null;
}

// Aliases used by the view layers — both map to the same shape.
export type CalendarEvent = Event;
export type DailyTimelineItem = Event;
