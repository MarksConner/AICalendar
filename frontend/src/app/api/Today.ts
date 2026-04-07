/**
 * MOCK ONLY — do not import this file outside of mockDataService.ts.
 *
 * Contains mock implementations of all day/timeline operations.
 * The real implementations live in httpDataService.ts and call the FastAPI backend.
 * Mock data is persisted to localStorage under the key defined by STORAGE_KEY below.
 */
import type { DailyTimelineItem } from "../Types/Calendar";
import type {
  DayAvailabilitySuggestion,
  DayConflictHint,
  DaySchedulingHints,
  DaySchedulingHintsRequest,
} from "../services/contracts";

// Mock seed items — the date portion is replaced dynamically per requested day.
const MOCK_SEED_ITEMS: Omit<DailyTimelineItem, "id">[] = [
  {
    name: "Deep work – OS project",
    start: "PLACEHOLDER_DATE T09:00:00",
    end: "PLACEHOLDER_DATE T10:00:00",
    description: "Finish memory management section.",
    priority: 2,
    flexible: false,
    travel_time_min: 0,
  },
  {
    name: "Team sync – AI Calendar",
    start: "PLACEHOLDER_DATE T11:00:00",
    end: "PLACEHOLDER_DATE T12:00:00",
    description: "Review UI progress and next steps.",
    priority: 1,
    flexible: false,
    travel_time_min: 0,
  },
  {
    name: "Study block – SVMs",
    start: "PLACEHOLDER_DATE T14:00:00",
    end: "PLACEHOLDER_DATE T15:00:00",
    priority: 0,
    flexible: true,
    travel_time_min: 0,
  },
];

const STORAGE_KEY = "aicalendar.mock.dayTimeline.v2";
const NETWORK_DELAY_MS = 250;

type TimelineStore = Record<string, DailyTimelineItem[]>;

let memoryStore: TimelineStore | null = null;

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const DAY_MINUTES = 24 * 60;
const DEFAULT_DURATION_MINUTES = 60;
const MIN_DURATION_MINUTES = 15;
const TIME_STEP_MINUTES = 15;
const WORKING_HOURS_START = 8 * 60;
const WORKING_HOURS_END = 18 * 60;

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/** Extract HH:MM from an ISO datetime or a bare HH:MM string. */
const extractHHMM = (value: string): string => {
  const iso = value.match(/T(\d{2}:\d{2})/);
  return iso ? iso[1] : value.trim();
};

/** Parse HH:MM (or ISO datetime) to total minutes from midnight. */
const parseTimeToMinutes = (value: string): number | null => {
  const hhmm = extractHHMM(value);
  const match = hhmm.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};

const minutesToTimeString = (value: number) => {
  const safe = Math.max(0, Math.min(DAY_MINUTES - 1, value));
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
};

const normalizeDuration = (
  request: DaySchedulingHintsRequest,
  startMinutes: number
) => {
  const explicitEnd = request.endTime ? parseTimeToMinutes(request.endTime) : null;
  if (explicitEnd !== null && explicitEnd > startMinutes) {
    return Math.max(MIN_DURATION_MINUTES, explicitEnd - startMinutes);
  }
  if (request.durationMinutes && request.durationMinutes > 0) {
    return Math.max(MIN_DURATION_MINUTES, request.durationMinutes);
  }
  return DEFAULT_DURATION_MINUTES;
};

type BusyInterval = { start: number; end: number; item: DailyTimelineItem };

const buildBusyIntervals = (items: DailyTimelineItem[]): BusyInterval[] =>
  items
    .map((item) => {
      const start = parseTimeToMinutes(item.start);
      if (start === null) return null;
      const parsedEnd = parseTimeToMinutes(item.end);
      const end =
        parsedEnd !== null && parsedEnd > start
          ? parsedEnd
          : Math.min(start + DEFAULT_DURATION_MINUTES, DAY_MINUTES);
      if (end <= start) return null;
      return { start, end, item };
    })
    .filter((interval): interval is BusyInterval => interval !== null);

const hasConflict = (start: number, end: number, busy: BusyInterval[]) =>
  busy.some((i) => start < i.end && i.start < end);

const buildConflictHints = (
  start: number,
  end: number,
  busy: BusyInterval[]
): DayConflictHint[] =>
  busy
    .filter((i) => start < i.end && i.start < end)
    .map((i) => ({
      eventId: i.item.id,
      name: i.item.name,
      start: extractHHMM(i.item.start), // HH:MM for display in the hints UI
      end: extractHHMM(i.item.end),
      overlapMinutes: Math.max(
        0,
        Math.min(end, i.end) - Math.max(start, i.start)
      ),
    }))
    .sort((a, b) => a.start.localeCompare(b.start));

const slotInWorkingHours = (start: number, end: number) =>
  start >= WORKING_HOURS_START && end <= WORKING_HOURS_END;

const buildCandidateStarts = (startMinutes: number) => {
  const deltas: number[] = [0];
  for (let step = TIME_STEP_MINUTES; step <= 12 * 60; step += TIME_STEP_MINUTES) {
    deltas.push(step, -step);
  }
  const seen = new Set<number>();
  const candidates: number[] = [];
  deltas.forEach((delta) => {
    const next = startMinutes + delta;
    if (next < 0 || next >= DAY_MINUTES || seen.has(next)) return;
    seen.add(next);
    candidates.push(next);
  });
  return candidates;
};

const buildSuggestionLabel = (deltaMinutes: number) => {
  if (deltaMinutes === 0) return "Requested slot";
  if (deltaMinutes > 0) return `${deltaMinutes} min later`;
  return `${Math.abs(deltaMinutes)} min earlier`;
};

const buildAvailabilitySuggestions = (
  requestedStart: number,
  durationMinutes: number,
  busy: BusyInterval[]
): DayAvailabilitySuggestion[] => {
  const suggestions: DayAvailabilitySuggestion[] = [];
  const added = new Set<string>();

  for (const candidateStart of buildCandidateStarts(requestedStart)) {
    const start =
      Math.max(0, Math.round(candidateStart / TIME_STEP_MINUTES) * TIME_STEP_MINUTES);
    const end = start + durationMinutes;
    if (end > DAY_MINUTES || hasConflict(start, end, busy)) continue;
    const key = `${start}-${end}`;
    if (added.has(key)) continue;
    added.add(key);
    suggestions.push({
      startTime: minutesToTimeString(start),
      endTime: minutesToTimeString(end),
      label: buildSuggestionLabel(start - requestedStart),
      inWorkingHours: slotInWorkingHours(start, end),
    });
    if (suggestions.length >= 4) break;
  }

  return suggestions;
};

const cloneItems = (items: DailyTimelineItem[]): DailyTimelineItem[] =>
  items.map((item) => ({ ...item }));

const readStoredValue = (): TimelineStore => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as TimelineStore;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const persistStore = (store: TimelineStore) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore persistence issues in mock mode
  }
};

const ensureStore = () => {
  if (memoryStore) return memoryStore;
  memoryStore = readStoredValue();
  return memoryStore;
};

/** Replace the placeholder prefix with the actual YYYY-MM-DD key. */
const seedItemsForDate = (dateKey: string): DailyTimelineItem[] =>
  MOCK_SEED_ITEMS.map((item, i) => ({
    ...item,
    id: `m-seed-${i + 1}`,
    start: item.start.replace("PLACEHOLDER_DATE ", dateKey),
    end: item.end.replace("PLACEHOLDER_DATE ", dateKey),
  }));

const ensureDateItems = (store: TimelineStore, date: Date) => {
  const key = toDateKey(date);
  if (!store[key]) {
    store[key] = seedItemsForDate(key);
    persistStore(store);
  }
  return { key, items: store[key] };
};

export async function fetchDayTimeline(date: Date): Promise<DailyTimelineItem[]> {
  await wait(NETWORK_DELAY_MS);
  const store = ensureStore();
  const { items } = ensureDateItems(store, date);
  return cloneItems(items);
}

export async function createDayTimelineItem(
  date: Date,
  input: Omit<DailyTimelineItem, "id">
): Promise<DailyTimelineItem> {
  await wait(NETWORK_DELAY_MS);
  const store = ensureStore();
  const { key, items } = ensureDateItems(store, date);

  const created: DailyTimelineItem = {
    id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ...input,
  };

  store[key] = [...items, created];
  persistStore(store);
  return { ...created };
}

export async function updateDayTimelineItem(
  date: Date,
  eventId: string,
  updates: Partial<DailyTimelineItem>
): Promise<DailyTimelineItem> {
  await wait(NETWORK_DELAY_MS);
  const store = ensureStore();
  const { key, items } = ensureDateItems(store, date);

  const index = items.findIndex((item) => item.id === eventId);
  if (index === -1) throw new Error("Event not found.");

  const updated = { ...items[index], ...updates, id: items[index].id };
  const next = [...items];
  next[index] = updated;
  store[key] = next;
  persistStore(store);
  return { ...updated };
}

export async function deleteDayTimelineItem(
  date: Date,
  eventId: string
): Promise<void> {
  await wait(NETWORK_DELAY_MS);
  const store = ensureStore();
  const { key, items } = ensureDateItems(store, date);
  store[key] = items.filter((item) => item.id !== eventId);
  persistStore(store);
}

export async function getDaySchedulingHints(
  date: Date,
  request: DaySchedulingHintsRequest
): Promise<DaySchedulingHints> {
  await wait(NETWORK_DELAY_MS);
  const store = ensureStore();
  const { items } = ensureDateItems(store, date);

  const startMinutes = parseTimeToMinutes(request.startTime);
  if (startMinutes === null) throw new Error("Time must use HH:MM (24h).");

  const durationMinutes = normalizeDuration(request, startMinutes);
  const endMinutes = Math.min(DAY_MINUTES, startMinutes + durationMinutes);
  const busyIntervals = buildBusyIntervals(items);
  const conflicts = buildConflictHints(startMinutes, endMinutes, busyIntervals);
  const suggestions = buildAvailabilitySuggestions(
    startMinutes,
    durationMinutes,
    busyIntervals
  );

  return {
    hasConflict: conflicts.length > 0,
    inWorkingHours: slotInWorkingHours(startMinutes, endMinutes),
    workingHours: {
      startTime: minutesToTimeString(WORKING_HOURS_START),
      endTime: minutesToTimeString(WORKING_HOURS_END),
    },
    conflicts,
    suggestions,
  };
}
