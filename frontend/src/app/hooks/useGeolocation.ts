import { useEffect, useState } from "react";

interface GeolocationState {
  lat: number | null;
  lng: number | null;
  loading: boolean;
  error: string | null;
}

/**
 * Requests the browser's current GPS position.
 * Pass enabled=true to trigger the permission prompt — this prevents asking
 * for location silently on page load before the user has opened an event.
 */
export function useGeolocation(enabled: boolean): GeolocationState {
  const [state, setState] = useState<GeolocationState>({
    lat: null,
    lng: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!enabled) return;

    if (!navigator.geolocation) {
      setState({ lat: null, lng: null, loading: false, error: "Geolocation not supported" });
      return;
    }

    setState((s) => ({ ...s, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          loading: false,
          error: null,
        });
      },
      (err) => {
        setState({ lat: null, lng: null, loading: false, error: err.message });
      },
      { timeout: 10000 }
    );
  }, [enabled]);

  return state;
}
