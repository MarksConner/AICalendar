/**
 * The contract between the frontend and the backend.
 *
 * - All shared data types and API method signatures live here.
 * - Field names mirror the backend Python models exactly (snake_case).
 * - If the backend changes a field name, adds a field, or adds an endpoint — update this file first.
 * - Every method on AppDataService must have a matching implementation in both:
 *     httpDataService.ts  (real API calls)
 *     mockDataService.ts  (local mock — TypeScript will error if one is missing)
 */
import type {
  CalendarEvent,
  DailyTimelineItem,
} from "../Types/Calendar";
import type { User } from "../Types/User";

/** Authenticated user — mirrors the backend `Users` SQLAlchemy model. */
export type AuthUser = User;

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

/** Payload sent to POST /users. Field names match the backend `Users` model. */
export interface CreateUserPayload {
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  password: string;
}

/** Shape returned after a successful user creation. */
export interface CreateUserResult {
  token?: string;
  user?: AuthUser;
}

/** Payload for POST /calendar/day-events. Mirrors the backend Event class. */
export interface CreateDayEventInput {
  name: string;
  start: string;                // ISO datetime e.g. "2026-04-07T09:00:00"
  end?: string;                 // ISO datetime; if omitted the backend defaults to start + 60 min
  description?: string;
  priority?: number;
  location?: string | null;
  flexible?: boolean;
  travel_time_min?: number;
}

export type UpdateDayEventInput = Partial<
  Pick<
    DailyTimelineItem,
    "name" | "start" | "end" | "description" | "priority" | "location" | "flexible" | "travel_time_min"
  >
>;

// ── Scheduling hints ─────────────────────────────────────────────────────────
// NOTE: start/end on these types are HH:MM display strings (e.g. "09:30"),
// NOT ISO datetimes. They are scheduling metadata only, not full event times.

export interface DaySchedulingHintsRequest {
  startTime: string;      // HH:MM
  endTime?: string;       // HH:MM
  durationMinutes?: number;
}

export interface DayConflictHint {
  eventId: string;
  name: string;
  start: string;          // HH:MM display time
  end?: string;           // HH:MM display time
  overlapMinutes: number;
}

export interface DayAvailabilitySuggestion {
  startTime: string;      // HH:MM
  endTime: string;        // HH:MM
  label: string;
  inWorkingHours: boolean;
}

export interface DaySchedulingHints {
  hasConflict: boolean;
  inWorkingHours: boolean;
  workingHours: {
    startTime: string;    // HH:MM
    endTime: string;      // HH:MM
  };
  conflicts: DayConflictHint[];
  suggestions: DayAvailabilitySuggestion[];
}

// ── AI Suggestions ────────────────────────────────────────────────────────────

/** A single LLM-generated suggestion item. All text comes from the backend — never hardcode it here. */
export interface AiSuggestion {
  id: string;
  title: string;        // Short title, e.g. "Leave 30 min earlier to beat traffic"
  description: string;  // Longer explanation of the suggestion
  category?: string;    // Optional label e.g. "Tip", "Schedule Insight", "Travel Alert"
}

/** Response from POST /ai/day-suggestions. */
export interface AiSuggestionsResponse {
  suggestions: AiSuggestion[];
}

/**
 * The full list of operations the frontend can perform against the backend.
 *
 * To add a new endpoint:
 *   1. Add the method signature here with typed inputs and outputs.
 *   2. Implement it in httpDataService.ts (real API call via requestJson).
 *   3. Add a matching stub in mockDataService.ts (calls a function in api/).
 */
export interface AppDataService {
  // POST /auth/login — returns a JWT token and the authenticated user.
  login(email: string, password: string): Promise<LoginResponse>;
  // POST /users — creates a new account.
  createUser(payload: CreateUserPayload): Promise<CreateUserResult>;
  // GET /calendar/events — monthIndex is 0-based (JS Date convention: 0 = Jan, 11 = Dec).
  fetchMonthEvents(year: number, monthIndex: number): Promise<CalendarEvent[]>;
  // GET /calendar/day-timeline?date=YYYY-MM-DD — all events for a given day.
  fetchDayTimeline(date: Date): Promise<DailyTimelineItem[]>;
  // GET /calendar/day-hints — checks for scheduling conflicts around a proposed time.
  getDaySchedulingHints(
    date: Date,
    request: DaySchedulingHintsRequest
  ): Promise<DaySchedulingHints>;
  // POST /calendar/day-events — creates a new event.
  createDayEvent(date: Date, input: CreateDayEventInput): Promise<DailyTimelineItem>;
  // PATCH /calendar/day-events/{id} — partial update on an existing event.
  updateDayEvent(
    date: Date,
    eventId: string,
    updates: UpdateDayEventInput
  ): Promise<DailyTimelineItem>;
  // DELETE /calendar/day-events/{id}
  deleteDayEvent(date: Date, eventId: string): Promise<void>;
  // POST /ai/day-suggestions — sends the date + current schedule to the LLM,
  // returns AI-generated suggestions. All suggestion text comes from the backend.
  getDayAiSuggestions(
    date: Date,
    items: DailyTimelineItem[]
  ): Promise<AiSuggestionsResponse>;
}
