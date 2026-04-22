import { useEffect, useState } from "react";
import { dataService } from "../services";
import type { TravelTimeResponse } from "../services/contracts";
import type { DailyTimelineItem } from "../Types/Calendar";
import { useGeolocation } from "./useGeolocation";

export interface EventLocationState {
  travelTimeMin: number | null;
  eventLat: number | null;
  eventLng: number | null;
  isLoading: boolean;
}

/**
 * Fetches travel time and event coordinates when an event with a location is open.
 *
 * Only activates when isOpen=true AND the event has a location string set.
 * Falls back gracefully if geolocation is denied — the map still renders using
 * cached coordinates (geo_latitude/geo_longitude) returned from the backend,
 * just without the travel time estimate.
 */
export function useEventLocation(
  event: DailyTimelineItem | null,
  isOpen: boolean,
): EventLocationState {
  const shouldGeolocate = isOpen && !!event?.location;
  const geo = useGeolocation(shouldGeolocate);

  const [state, setState] = useState<EventLocationState>({
    travelTimeMin: null,
    eventLat: null,
    eventLng: null,
    isLoading: false,
  });

  // Reset whenever a different event is opened
  useEffect(() => {
    setState({ travelTimeMin: null, eventLat: null, eventLng: null, isLoading: false });
  }, [event?.id]);

  useEffect(() => {
    if (!event?.id || !event.location || !isOpen) return;

    // Geolocation denied — show map with cached coords only, skip travel time
    if (!geo.loading && geo.lat === null) {
      if (event.geo_latitude != null && event.geo_longitude != null) {
        setState({
          travelTimeMin: null,
          eventLat: event.geo_latitude,
          eventLng: event.geo_longitude,
          isLoading: false,
        });
      }
      return;
    }

    if (geo.loading || geo.lat === null || geo.lng === null) return;

    setState((s) => ({ ...s, isLoading: true }));

    dataService
      .getTravelTime(event.id, geo.lat!, geo.lng!)
      .then((res: TravelTimeResponse) => {
        setState({
          travelTimeMin: res.travel_time_min,
          eventLat: res.event_lat,
          eventLng: res.event_long,
          isLoading: false,
        });
      })
      .catch(() => {
        // API failed — still try to show the map using cached coords
        if (event.geo_latitude != null && event.geo_longitude != null) {
          setState({
            travelTimeMin: null,
            eventLat: event.geo_latitude,
            eventLng: event.geo_longitude,
            isLoading: false,
          });
        } else {
          setState((s) => ({ ...s, isLoading: false }));
        }
      });
  }, [
    event?.id,
    event?.location,
    event?.geo_latitude,
    event?.geo_longitude,
    isOpen,
    geo.loading,
    geo.lat,
    geo.lng,
  ]);

  return state;
}
