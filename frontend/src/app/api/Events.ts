/* Helps with JSON request calls for the backend for Events */ 
const API_BASE_URL = import.meta.env.VITE_BASE_API_URL ?? "http://127.0.0.1:8000";

export interface LocalEventSuggestion {
  source: string;
  external_id: string;
  title: string;
  description?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  venue_name?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  url?: string | null;
  image_url?: string | null;
  is_free?: boolean | null;
}

export interface TravelRoute {
  destination_name: string;
  destination_latitude: number;
  destination_longitude: number;
  distance_meters: number;
  duration_seconds: number;
  geometry?: {
    coordinates?: [number, number][];
    type?: string;
  } | null;
}

export async function fetchLocalEventSuggestions(payload: {
  latitude: number;
  longitude: number;
  radius_km?: number;
  keyword?: string;
  start_date?: string;
  end_date?: string;
}): Promise<LocalEventSuggestion[]> {
  const response = await fetch(`${API_BASE_URL}/events/local-suggestions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error((await response.text()) || "Failed to load local suggestions");
  }

  return response.json();
}

export async function fetchTravelRoute(
  userLatitude: number,
  userLongitude: number,
  destination: string
): Promise<TravelRoute> {
  const response = await fetch(`${API_BASE_URL}/events/travel-time`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_latitude: userLatitude,
      user_longitude: userLongitude,
      destination,
    }),
  });

  if (!response.ok) {
    throw new Error((await response.text()) || "Failed to load route");
  }

  return response.json();
}

export async function addSuggestedEvent(payload: {
  calendar_id: string;
  title: string;
  description?: string;
  address?: string;
  start_time: string;
  end_time?: string;
  priority_rank?: number;
}) {
  const response = await fetch(`${API_BASE_URL}/events/add-suggested`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error((await response.text()) || "Failed to add suggested event");
  }

  return response.json();
}
