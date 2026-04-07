/**
 * Real backend adapter — this is the file to edit when connecting a new FastAPI endpoint.
 *
 * Each method maps to one API route. To add a new endpoint:
 *   1. Add the method signature to AppDataService in contracts.ts.
 *   2. Implement it here using requestJson() — auth and base URL are handled automatically.
 *   3. If the backend response shape differs from the frontend type, add a normalizer function
 *      (see normalizeAuthResponse and normalizeTimelineItem below as examples).
 *   4. Add a matching stub in mockDataService.ts.
 */
import type { CalendarEvent, DailyTimelineItem } from "../../../Types/Calendar";
import type {
  AppDataService,
  AiSuggestionsResponse,
  CreateDayEventInput,
  CreateUserPayload,
  CreateUserResult,
  DaySchedulingHints,
  DaySchedulingHintsRequest,
  LoginResponse,
  UpdateDayEventInput,
} from "../../contracts";
import { requestJson } from "./httpClient";

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// ── Auth normalization ────────────────────────────────────────────────────────
// Normalizers convert the raw backend JSON into the typed frontend shape.
// They also handle field name variations (e.g. "id" vs "user_id") so the
// UI keeps working across different backend response formats.

type RawAuthUser = {
  user_id?: string;
  // Legacy id field — some older responses use plain "id"
  id?: string;
  email?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  email_verified?: boolean;
  created_at?: string;
};

type RawLoginResponse = {
  token?: string;
  access_token?: string;
  user?: RawAuthUser;
  // Some backends flatten user fields to the top level
  user_id?: string;
  email?: string;
  username?: string;
  message?: string;
};

const normalizeAuthResponse = (raw: RawLoginResponse): LoginResponse => {
  const token = raw.token ?? raw.access_token;
  if (!token) throw new Error(raw.message ?? "Missing token in login response.");
  const u = raw.user ?? {};
  return {
    token,
    user: {
      user_id: u.user_id ?? u.id ?? raw.user_id ?? "",
      email: u.email ?? raw.email ?? "",
      username: u.username ?? raw.username ?? "",
      first_name: u.first_name ?? "",
      last_name: u.last_name ?? "",
      email_verified: u.email_verified ?? false,
      created_at: u.created_at,
    },
  };
};

// ── Event normalization ───────────────────────────────────────────────────────

/**
 * Raw event shape from the backend — accepts both the new field names and
 * legacy snake_case / camelCase variants so the frontend keeps working during
 * the backend migration window.
 */
type RawDayEvent = {
  id?: string;
  // name — primary; fall back to legacy title / event_name
  name?: string;
  event_name?: string;
  title?: string;
  // ISO datetimes (new backend) or legacy HH:MM strings
  start?: string;
  end?: string;
  startTime?: string;
  start_time?: string;
  endTime?: string;
  end_time?: string;
  // optional fields
  description?: string;
  priority?: number;
  location?: string | null;
  flexible?: boolean;
  travel_time_min?: number;
};

const normalizeTimelineItem = (raw: RawDayEvent): DailyTimelineItem => {
  if (!raw.id) throw new Error("Missing event id from timeline response.");

  const name = raw.name ?? raw.event_name ?? raw.title;
  const start = raw.start ?? raw.startTime ?? raw.start_time;
  const end = raw.end ?? raw.endTime ?? raw.end_time;

  if (!name || !start) throw new Error("Invalid timeline item received from server.");

  return {
    id: raw.id,
    name,
    start,
    end: end ?? start,
    description: raw.description,
    priority: raw.priority ?? 0,
    location: raw.location ?? null,
    flexible: raw.flexible ?? false,
    travel_time_min: raw.travel_time_min ?? 0,
  };
};

/**
 * Builds the create-event request body.
 * Sends both the new field names and legacy aliases (title, startTime, etc.) during the
 * backend migration window. Once the backend is fully updated, the legacy aliases can be removed.
 */
const buildEventPayload = (input: CreateDayEventInput, date: string) => ({
  date,
  name: input.name,
  start: input.start,
  end: input.end,
  priority: input.priority ?? 0,
  location: input.location ?? null,
  flexible: input.flexible ?? false,
  travel_time_min: input.travel_time_min ?? 0,
  description: input.description,
  // Legacy aliases for backward compat
  event_name: input.name,
  title: input.name,
  startTime: input.start,
  start_time: input.start,
  endTime: input.end,
  end_time: input.end,
});

const buildEventPatchPayload = (date: string, updates: UpdateDayEventInput) => ({
  date,
  ...(updates.name !== undefined
    ? { name: updates.name, event_name: updates.name, title: updates.name }
    : {}),
  ...(updates.start !== undefined
    ? { start: updates.start, startTime: updates.start, start_time: updates.start }
    : {}),
  ...(updates.end !== undefined
    ? { end: updates.end, endTime: updates.end, end_time: updates.end }
    : {}),
  ...(updates.description !== undefined ? { description: updates.description } : {}),
  ...(updates.priority !== undefined ? { priority: updates.priority } : {}),
  ...(updates.location !== undefined ? { location: updates.location } : {}),
  ...(updates.flexible !== undefined ? { flexible: updates.flexible } : {}),
  ...(updates.travel_time_min !== undefined
    ? { travel_time_min: updates.travel_time_min }
    : {}),
});

// ── User create normalization ─────────────────────────────────────────────────

const normalizeUserCreateResponse = (raw: unknown): CreateUserResult => {
  if (!raw || typeof raw !== "object") return {};
  const r = raw as Record<string, unknown>;

  // Backend may return the full user object nested or flattened.
  const userSource = (r.user as Record<string, unknown> | undefined) ?? r;

  const user = {
    user_id: (userSource.user_id as string) ?? (userSource.id as string) ?? "",
    email: (userSource.email as string) ?? "",
    username: (userSource.username as string) ?? "",
    first_name: (userSource.first_name as string) ?? "",
    last_name: (userSource.last_name as string) ?? "",
    email_verified: (userSource.email_verified as boolean) ?? false,
    created_at: userSource.created_at as string | undefined,
  };

  return {
    token: r.token as string | undefined,
    user,
  };
};

// ── Service implementation ────────────────────────────────────────────────────

export const httpDataService: AppDataService = {
  login(email, password) {
    return requestJson<RawLoginResponse>("/auth/login", {
      method: "POST",
      body: { email, password },
    }).then(normalizeAuthResponse);
  },

  createUser(payload: CreateUserPayload) {
    return requestJson<unknown>("/users", {
      method: "POST",
      body: {
        email: payload.email,
        username: payload.username,
        first_name: payload.first_name,
        last_name: payload.last_name,
        password: payload.password,
      },
    }).then(normalizeUserCreateResponse);
  },

  fetchMonthEvents(year, monthIndex) {
    return requestJson<CalendarEvent[]>("/calendar/events", {
      query: { year, monthIndex, month: monthIndex + 1 },
    });
  },

  fetchDayTimeline(date) {
    return requestJson<RawDayEvent[]>("/calendar/day-timeline", {
      query: { date: toDateKey(date) },
    }).then((events) => events.map(normalizeTimelineItem));
  },

  getDaySchedulingHints(date, request: DaySchedulingHintsRequest) {
    return requestJson<DaySchedulingHints>("/calendar/day-hints", {
      query: {
        date: toDateKey(date),
        startTime: request.startTime,
        endTime: request.endTime,
        durationMinutes: request.durationMinutes,
      },
    });
  },

  createDayEvent(date, input: CreateDayEventInput) {
    return requestJson<RawDayEvent>("/calendar/day-events", {
      method: "POST",
      body: buildEventPayload(input, toDateKey(date)),
    }).then(normalizeTimelineItem);
  },

  updateDayEvent(date, eventId, updates: UpdateDayEventInput) {
    return requestJson<RawDayEvent>(`/calendar/day-events/${eventId}`, {
      method: "PATCH",
      body: buildEventPatchPayload(toDateKey(date), updates),
    }).then(normalizeTimelineItem);
  },

  deleteDayEvent(date, eventId) {
    return requestJson<void>(`/calendar/day-events/${eventId}`, {
      method: "DELETE",
      query: { date: toDateKey(date) },
    });
  },

  getDayAiSuggestions(date, items) {
    return requestJson<AiSuggestionsResponse>("/ai/day-suggestions", {
      method: "POST",
      body: {
        date: toDateKey(date),
        events: items,
      },
    });
  },
};
