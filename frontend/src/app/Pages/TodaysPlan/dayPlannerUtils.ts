import type { DailyTimelineItem } from "../../Types/Calendar";

export const HOURS_IN_DAY = 24;
export const HOUR_ROW_HEIGHT = 64;
export const TIME_GUTTER_WIDTH = 72;
export const MIN_EVENT_HEIGHT = 28;
export const SNAP_MINUTES = 15;
export const DEFAULT_DURATION_MINUTES = 60;
export const MIN_DURATION_MINUTES = 15;

export type PositionedEvent = DailyTimelineItem & {
  startMinutes: number;
  endMinutes: number;
  column: number;
  columnCount: number;
};

/** Internal drag/resize draft — stores times as HH:MM for visual feedback. */
export type EventTimeDraft = {
  start: string; // HH:MM
  end: string;   // HH:MM
};

export type InteractionMode = "move" | "resize";

export type EventInteractionState = {
  eventId: string;
  mode: InteractionMode;
  pointerStartY: number;
  initialStartMinutes: number;
  initialEndMinutes: number;
};

/**
 * Extract HH:MM from either an ISO datetime ("2026-03-27T09:30:00") or a
 * bare HH:MM string ("09:30"). Returns the HH:MM portion in both cases.
 */
export const extractTimeHHMM = (value: string): string => {
  const isoMatch = value.match(/T(\d{2}:\d{2})/);
  return isoMatch ? isoMatch[1] : value.trim();
};

/**
 * Combine a Date and an HH:MM string into a local ISO datetime string.
 * e.g. toISODateTime(new Date("2026-03-27"), "09:30") → "2026-03-27T09:30:00"
 */
export const toISODateTime = (date: Date, timeHHMM: string): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}T${timeHHMM}:00`;
};

/**
 * Parse either an ISO datetime or a bare HH:MM string to total minutes from
 * midnight. Returns null if the format is unrecognised.
 */
export const parseTimeToMinutes = (value: string): number | null => {
  const hhmm = extractTimeHHMM(value);
  const match = hhmm.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};

export const minutesToTimeString = (value: number) => {
  const safeMinutes = Math.max(0, Math.min(HOURS_IN_DAY * 60 - 1, value));
  const hours = String(Math.floor(safeMinutes / 60)).padStart(2, "0");
  const minutes = String(safeMinutes % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
};

export const roundMinutesToStep = (value: number, step = SNAP_MINUTES) =>
  Math.round(value / step) * step;

export const formatHourLabel = (hour: number) =>
  new Date(1970, 0, 1, hour).toLocaleTimeString(undefined, {
    hour: "numeric",
  });

export const getCurrentMinutes = () => {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
};

/** Map a numeric priority to event block colours. */
export const getEventTone = (priority: number) => {
  if (priority === 1) {
    return { bgcolor: "primary.light", borderColor: "primary.main" };
  }
  if (priority >= 2) {
    return { bgcolor: "success.light", borderColor: "success.main" };
  }
  return { bgcolor: "action.selected", borderColor: "divider" };
};

export const buildPositionedEvents = (
  items: DailyTimelineItem[]
): PositionedEvent[] => {
  const normalized = items
    .map((item) => {
      const startMinutes = parseTimeToMinutes(item.start);
      if (startMinutes === null) return null;

      const parsedEnd = parseTimeToMinutes(item.end);
      const computedEnd =
        parsedEnd !== null && parsedEnd > startMinutes
          ? parsedEnd
          : Math.min(startMinutes + 60, HOURS_IN_DAY * 60);

      if (computedEnd <= startMinutes) return null;

      return { ...item, startMinutes, endMinutes: computedEnd };
    })
    .filter(
      (item): item is Omit<PositionedEvent, "column" | "columnCount"> =>
        item !== null
    )
    .sort((a, b) => {
      if (a.startMinutes === b.startMinutes) return a.endMinutes - b.endMinutes;
      return a.startMinutes - b.startMinutes;
    });

  const positioned: PositionedEvent[] = [];
  let cursor = 0;

  while (cursor < normalized.length) {
    let groupEnd = normalized[cursor].endMinutes;
    let groupStop = cursor + 1;

    while (
      groupStop < normalized.length &&
      normalized[groupStop].startMinutes < groupEnd
    ) {
      groupEnd = Math.max(groupEnd, normalized[groupStop].endMinutes);
      groupStop += 1;
    }

    const group = normalized.slice(cursor, groupStop);
    const columnEndMinutes: number[] = [];

    const groupWithColumns = group.map((item) => {
      let column = columnEndMinutes.findIndex(
        (endMinutes) => endMinutes <= item.startMinutes
      );
      if (column === -1) column = columnEndMinutes.length;
      columnEndMinutes[column] = item.endMinutes;
      return { ...item, column };
    });

    const columnCount = Math.max(1, columnEndMinutes.length);
    groupWithColumns.forEach((item) => {
      positioned.push({ ...item, columnCount });
    });

    cursor = groupStop;
  }

  return positioned;
};

// Builds an time object to send context.
export const buildUserTimezoneAndTimeObject = () =>{
  const now = new Date()
  const user_current_datetime = now.toISOString()
  const user_timezone = Intl.DateTimeFormat().resolvedOptions().timeZone //Pulls the timezone the user is currently in 
  const user_current_minutes =  now.getHours() * 60 + now.getMinutes() // Gives context on where is the user in the day in minutes.
  return {user_current_datetime, user_timezone, user_current_minutes};
};