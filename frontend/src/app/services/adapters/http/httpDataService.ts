/**
 * Real backend adapter — this is the file to edit when connecting a new FastAPI endpoint.
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
  TravelTimeResponse,
  UpdateDayEventInput,
  AddEventParticipantInput,
  ParticipantsForEvent,
  EventParticipant
} from "../../contracts";
import {startMicrophoneInput, stopMicrophoneInput,} from "../../tts/mic_parsing";
import { requestJson } from "./httpClient";


const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

type RawAuthUser = {
  user_id?: string;
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

type RawCalendar = {
  calendar_id?: string;
  id?: string;
  calendar_name?: string;
};

type RawDayEvent = {
  id?: string;
  event_id?: string;
  name?: string;
  event_name?: string;
  title?: string;
  start?: string;
  end?: string;
  startTime?: string;
  start_time?: string;
  endTime?: string;
  end_time?: string;
  description?: string;
  event_description?: string;
  priority?: number;
  priority_rank?: number;
  location?: string | null;
  full_address?: string | null;
  flexible?: boolean;
  travel_time_min?: number;
  geo_latitude?: number | null;
  geo_longitude?: number | null;
};

const normalizeTimelineItem = (raw: RawDayEvent): DailyTimelineItem => {
  const id = raw.id ?? raw.event_id;
  if (!id) throw new Error("Missing event id from timeline response.");

  const name = raw.name ?? raw.event_name ?? raw.title;
  const start = raw.start ?? raw.startTime ?? raw.start_time;
  const end = raw.end ?? raw.endTime ?? raw.end_time;

  if (!name || !start) {
    throw new Error("Invalid timeline item received from server.");
  }

  return {
    id,
    name,
    start,
    end: end ?? start,
    description: raw.description ?? raw.event_description,
    priority: raw.priority ?? raw.priority_rank ?? 0,
    location: raw.location ?? raw.full_address ?? null,
    flexible: raw.flexible ?? false,
    travel_time_min: raw.travel_time_min ?? 0,
    geo_latitude: raw.geo_latitude ?? null,
    geo_longitude: raw.geo_longitude ?? null,
  };
};

let cachedPrimaryCalendarId: string | null = null; // cache the primary calendar ID to avoid redundant API calls, since most users will only have one calendar and the ID won't change during a session.

// Fetches the primary calendar ID for the current user. Caches the result for future calls.
export const getPrimaryCalendarId = async (): Promise<string> => {
  if (cachedPrimaryCalendarId) return cachedPrimaryCalendarId;

  const calendars = await requestJson<RawCalendar[]>("/calendar");
  const calendarId = calendars?.[0]?.calendar_id ?? calendars?.[0]?.id;

  if (!calendarId) {
    throw new Error("No calendar found for current user.");
  }

  cachedPrimaryCalendarId = calendarId;
  return calendarId;
};

const normalizeUserCreateResponse = (raw: unknown): CreateUserResult => {
  if (!raw || typeof raw !== "object") return {};
  const r = raw as Record<string, unknown>;

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

const mapTimelineItemToAiEvent = (item: DailyTimelineItem) => {
  const anyItem = item as any;

  return {
    event_name:
      anyItem.event_name ??
      anyItem.title ??
      anyItem.name ??
      "Untitled event",

    start_time:
      anyItem.start_time ??
      anyItem.startTime ??
      anyItem.start ??
      null,

    end_time:
      anyItem.end_time ??
      anyItem.endTime ??
      anyItem.end ??
      null,

    full_address:
      anyItem.full_address ??
      anyItem.location ??
      anyItem.address ??
      null,

    description:
      anyItem.description ??
      anyItem.event_description ??
      null,

    distance_from_user:
    anyItem.travel_time_min > 0
    ? `${anyItem.travel_time_min} min travel`
    : null,

    participants:
      anyItem.participants ?? [],
  };
};

export const httpDataService: AppDataService = {
  login(email, password) {
    return requestJson<RawLoginResponse>("/users/login", {
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

  async fetchMonthEvents(year, monthIndex, calendarIdOverride) {
    const calendarId = calendarIdOverride ?? await getPrimaryCalendarId();
    const events = await requestJson<RawDayEvent[]>(
      `/events/calendar/${calendarId}/events`,
      {
        query: { year, monthIndex },
      }
    );

    return events.map(normalizeTimelineItem);
  },

  async fetchDayTimeline(date, calendarIdOverride) {
    const calendarId = calendarIdOverride ?? await getPrimaryCalendarId();
    const events = await requestJson<RawDayEvent[]>(
      `/events/calendar/${calendarId}/day/${toDateKey(date)}`
    );
    return events.map(normalizeTimelineItem);
  },

// Day hints  needs date, and calendar_id to determine working hours and conflicts, but we don't want to force the caller to know about calendar IDs, so we just fetch the primary calendar ID internally here.
  async getDaySchedulingHints(date, request: DaySchedulingHintsRequest, calendarIdOverride) {
    const calendarId = calendarIdOverride ?? await getPrimaryCalendarId();
    return requestJson<DaySchedulingHints>("/calendar/day-hints", {
      query: {
        date: toDateKey(date),
        calendar_id: calendarId,
        startTime: request.startTime,
        endTime: request.endTime,
        durationMinutes: request.durationMinutes,
      },
    });
  },

  async createDayEvent(_date, input: CreateDayEventInput, calendarIdOverride) {
    const calendarId = calendarIdOverride ?? await getPrimaryCalendarId();

    return requestJson<RawDayEvent>("/events/create", {
      method: "POST",
      body: {
        calendar_id: calendarId,
        event_name: input.name,
        start_time: input.start,
        end_time: input.end,
        event_description: input.description ?? null,
        full_address: input.location ?? null,
        priority_rank: input.priority ?? 0,
      },
    }).then(normalizeTimelineItem);
  },

  async updateDayEvent(_date, eventId, updates: UpdateDayEventInput) {
    return requestJson<RawDayEvent>(`/events/update/${eventId}`, {
      method: "PUT",
      body: {
        ...(updates.name !== undefined ? { event_name: updates.name } : {}),
        ...(updates.start !== undefined ? { start_time: updates.start } : {}),
        ...(updates.end !== undefined ? { end_time: updates.end } : {}),
        ...(updates.description !== undefined? { event_description: updates.description }: {}),
        ...(updates.location !== undefined ? { full_address: updates.location } : {}),
        ...(updates.priority !== undefined ? { priority_rank: updates.priority } : {}),
      },
    }).then(normalizeTimelineItem);
  },

  deleteDayEvent(_date, eventId) {
    return requestJson<void>(`/events/delete/${eventId}`, {
      method: "DELETE",
    });
  },
  //Event Participants functions
  addEventParticipant(eventId: string, input: AddEventParticipantInput) {
    return requestJson<EventParticipant>(`/events/add_participant/${eventId}`, {
      method: "POST",
      body: {
        name: input.name,
        info: input.info ?? null,
        role: input.role ?? null,
      },
    });
  },

  removeEventParticipant(participantId: string) {
    return requestJson<void>(`/events/remove_participant/${participantId}`, {
      method: "DELETE",
    });
  },

  deleteCalendar(calendar_id: string) {
  return requestJson<void>(`/calendar/delete-calendar/${calendar_id}`, {
    method: "DELETE",
  });
},

  getParticipantsForEvent(eventId: string) {
    return requestJson<ParticipantsForEvent>(`/events/participants_for_event/${eventId}`);
  },

  getParticipantInfo(participantId: string) {
    return requestJson<EventParticipant>(`/events/participant_info/${participantId}`);
  },

  getEventsForParticipant(participantName: string) {
    return requestJson<CalendarEvent[]>(
      `/events/events_for_participant/${encodeURIComponent(participantName)}`
    );
  },

  //Microphone transcription methods simply call through to the mic_parsing module, since all the logic for handling microphone access and transcription is contained there and doesn't involve any server communication. This keeps the AppDataService interface consistent while allowing the mic parsing logic to be easily maintained and updated separately.
  async startMicrophoneTranscription(): Promise<string | null> {
    return startMicrophoneInput();
  },

  stopMicrophoneTranscription(): void {
    stopMicrophoneInput();
  },


  getTravelTime(eventId: string, fromLat: number, fromLng: number) {
    return requestJson<TravelTimeResponse>(
      `/events/event_id/${eventId}/travel_time?from_lat=${fromLat}&from_long=${fromLng}`
    );
  },

  
  getDayAiSuggestions(date, items: DailyTimelineItem[]) {
  return requestJson<AiSuggestionsResponse>("/ai/day-suggestions", {
    method: "POST",
    body: {
      date: toDateKey(date),
      events: (items ?? []).map(mapTimelineItemToAiEvent),
    },
  });
  },
};