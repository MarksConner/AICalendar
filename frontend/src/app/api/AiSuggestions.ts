import type { DailyTimelineItem } from "../Types/Calendar";
import type { AiSuggestionsResponse } from "../services/contracts";
import { requestJson } from "../services/adapters/http/httpClient";

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

type UserCoords = {
  latitude: number;
  longitude: number;
};

type TravelTimeResponse = {
  travel_time_min?: number;
  travelTimeMin?: number;
  duration_minutes?: number;
  durationMinutes?: number;
  minutes?: number;
};

const getUserCoords = (): Promise<UserCoords | null> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        resolve(null);
      }
    );
  });
};

const extractTravelMinutes = (raw: TravelTimeResponse): number | null => {
  const value =
    raw.travel_time_min ??
    raw.travelTimeMin ??
    raw.duration_minutes ??
    raw.durationMinutes ??
    raw.minutes ??
    null;

  if (value === null || value === undefined) return null;

  const minutes = Number(value);

  return Number.isFinite(minutes) && minutes > 0 ? minutes : null;
};

const getTravelTimeForItem = async (item: DailyTimelineItem,coords: UserCoords | null): Promise<number | null> => {
  if (!coords) return null;
  if (!item.id) return null;

  try {
    const raw = await requestJson<TravelTimeResponse>(
      `/events/event_id/${item.id}/travel_time?from_lat=${coords.latitude}&from_long=${coords.longitude}`
    );

    return extractTravelMinutes(raw);
  } catch {
    return null;
  }
};

const enrichItemsWithTravelTime = async (
  items: DailyTimelineItem[]
): Promise<DailyTimelineItem[]> => {
  if (!items.length) return [];

  const coords = await getUserCoords();

  return Promise.all(
    items.map(async (item) => {
      const travelTimeMin = await getTravelTimeForItem(item, coords);

      return {
        ...item,
        travel_time_min: travelTimeMin ?? item.travel_time_min ?? 0,
      };
    })
  );
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

    travel_time_min:
      anyItem.travel_time_min > 0
        ? anyItem.travel_time_min
        : null,

    participants:
      Array.isArray(anyItem.participants) ? anyItem.participants : [],
  };
};

export async function getDayAiSuggestions(
  date: Date,
  items: DailyTimelineItem[]
): Promise<AiSuggestionsResponse> {
  const enrichedItems = await enrichItemsWithTravelTime(items ?? []);

  const body = {
    date: toDateKey(date),
    events: enrichedItems.map(mapTimelineItemToAiEvent),
  };
  return requestJson<AiSuggestionsResponse>("/ai/day-suggestions", {
    method: "POST",
    body,
  });
}