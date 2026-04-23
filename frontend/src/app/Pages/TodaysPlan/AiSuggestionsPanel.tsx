import { useMemo, useState } from "react";
import { useCalendar } from "../../contexts/useCalendar";
import { dataService } from "../../services";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import { alpha } from "@mui/material/styles";
import type { Theme } from "@mui/material/styles";
import { MapPin, Car, Plus, MapPinned } from "lucide-react";

import { Button } from "../../design_system/components/ui/Button";
import { Card, CardContent, CardHeader } from "../../design_system/components/ui/Card";
import { EventMap } from "../../components/EventMap";
import { useGeolocation } from "../../hooks/useGeolocation";
import {
  addSuggestedEvent,
  fetchLocalEventSuggestions,
  fetchTravelRoute,
  type LocalEventSuggestion,
  type TravelRoute,
} from "../../api/Events";
import { AddSuggestedEventModal } from "./AddSuggestedEventModal";

const PANEL_WIDTH = 360;

type AiSuggestionsPanelProps = {
  date: Date;
  items: unknown[];
};

export function AiSuggestionsPanel({ date, items }: AiSuggestionsPanelProps) {
  const { selectedCalendarId, selectedDate } = useCalendar();
  const [keyword, setKeyword] = useState("food");
  const [radiusKm, setRadiusKm] = useState(25);
  const [suggestions, setSuggestions] = useState<LocalEventSuggestion[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<LocalEventSuggestion | null>(null);
  const [travelRoute, setTravelRoute] = useState<TravelRoute | null>(null);
  const [hasRequestedLocation, setHasRequestedLocation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTravelLoading, setIsTravelLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [pendingSuggestion, setPendingSuggestion] = useState<LocalEventSuggestion | null>(null);

  const geolocation = useGeolocation(hasRequestedLocation);

  const travelSummary = useMemo(() => {
    if (!travelRoute) return null;
    const minutes = Math.round(travelRoute.duration_seconds / 60);
    const miles = (travelRoute.distance_meters / 1609.34).toFixed(1);
    return `${minutes} min drive • ${miles} mi`;
  }, [travelRoute]);

  const helperText = useMemo(() => {
    if (items.length > 0) {
      return `Using your current location to suggest nearby spots around ${date.toLocaleDateString()}.`;
    }
    return "Find nearby places, preview them on the map, and add one directly to your calendar.";
  }, [date, items.length]);

  const handleSelectSuggestion = async (suggestion: LocalEventSuggestion) => {
    setSelectedSuggestion(suggestion);
    setTravelRoute(null);
    setActionMessage(`Showing ${suggestion.title} on the map.`);
    setError(null);

    const destination = suggestion.address ?? suggestion.venue_name ?? suggestion.title;
    if (!destination) {
      setError("This result is missing enough location data to map.");
      return;
    }

    if (geolocation.lat == null || geolocation.lng == null) {
      setError("Your current location is required to calculate the route.");
      return;
    }

    setIsTravelLoading(true);
    try {
      const route = await fetchTravelRoute(geolocation.lat, geolocation.lng, destination);
      setTravelRoute(route);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load travel route.");
    } finally {
      setIsTravelLoading(false);
    }
  };

  const handleLoadLocalEvents = async () => {
    setHasRequestedLocation(true);
    setActionMessage(null);
    setError(null);

    if (!navigator.geolocation) {
      setError("Geolocation is not available in this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        setIsLoading(true);
        try {
          const results = await fetchLocalEventSuggestions({
            latitude,
            longitude,
            radius_km: radiusKm,
            keyword,
          });
          setSuggestions(results);
          if (results.length > 0) {
            await handleSelectSuggestion(results[0]);
          } else {
            setSelectedSuggestion(null);
            setTravelRoute(null);
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to load local events.");
        } finally {
          setIsLoading(false);
        }
      },
      (geoError) => {
        setError(geoError.message || "Unable to get current location.");
      },
      { timeout: 10000 }
    );
  };

  const handleAddSuggestion = async (suggestion: LocalEventSuggestion) => {
    setActionMessage(null);
    setError(null);
    setPendingSuggestion(suggestion);
    setIsAddModalOpen(true);
  };

  const handleConfirmAddSuggestion = async (payload: {
    calendar_id: string;
    title: string;
    description?: string;
    address?: string;
    start_time: string;
    end_time?: string;
    priority_rank?: number;
  }) => {
    try {
      await addSuggestedEvent(payload);
      const refreshedItems = await dataService.fetchDayTimeline(selectedDate, selectedCalendarId);
      const matchingItem = refreshedItems.find((item) => item.name === payload.title && item.start.startsWith(payload.start_time.slice(0, 10)));
      setActionMessage(
        matchingItem
          ? `Added \"${payload.title}\" to ${selectedDate.toLocaleDateString()}. Click the event in your timeline to view the same Mapbox preview and travel distance used elsewhere in the app.`
          : `Added \"${payload.title}\". If you don't see it yet, check the selected date/time.`
      );
      setIsAddModalOpen(false);
      setPendingSuggestion(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add suggestion.";
      setError(message);
      throw err instanceof Error ? err : new Error(message);
    }
  };

  return (
    <Box
      sx={{
        width: PANEL_WIDTH,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
        borderLeft: "1px solid",
        borderColor: "divider",
        pl: 2,
        alignSelf: "flex-start",
      }}
    >
      <Card variant="elevated">
        <CardHeader>
          <Stack spacing={0.75}>
            <Typography variant="subtitle2" fontWeight={700}>
              Local events
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {helperText}
            </Typography>
          </Stack>
        </CardHeader>
        <CardContent>
          <Stack spacing={1.5}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
              <TextField
                label="Keyword"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="food, museum, coffee..."
                fullWidth
                size="small"
              />
              <TextField
                label="Radius (km)"
                type="number"
                value={radiusKm}
                onChange={(event) => setRadiusKm(Number(event.target.value) || 25)}
                inputProps={{ min: 1, max: 100 }}
                size="small"
                sx={{ width: { xs: "100%", sm: 120 } }}
              />
            </Stack>

            <Button size="sm" onClick={handleLoadLocalEvents} disabled={isLoading || geolocation.loading}>
              {isLoading || geolocation.loading ? "Loading…" : "Local events"}
            </Button>

            {geolocation.error && (
              <Typography variant="caption" color="error">
                {geolocation.error}
              </Typography>
            )}
            {error && (
              <Box
                sx={{
                  borderRadius: 1.5,
                  border: "1px solid",
                  borderColor: (theme: Theme) => alpha(theme.palette.error.main, 0.3),
                  bgcolor: (theme: Theme) => alpha(theme.palette.error.main, 0.06),
                  p: 1.5,
                }}
              >
                <Typography variant="caption" color="error">
                  {error}
                </Typography>
              </Box>
            )}
            {actionMessage && (
              <Typography variant="caption" color="primary.main">
                {actionMessage}
              </Typography>
            )}

            {selectedSuggestion && (
              <Typography variant="caption" color="text.secondary">
                Selected: {selectedSuggestion.title}
              </Typography>
            )}

            <Divider />

            <Stack spacing={1.5}>
              <Typography variant="caption" color="text.secondary">
                Map preview
              </Typography>

              {!import.meta.env.VITE_MAPBOX_TOKEN && (
                <Typography variant="caption" color="error">
                  Add VITE_MAPBOX_TOKEN in frontend/.env to render the map.
                </Typography>
              )}

              {(travelRoute?.destination_latitude != null && travelRoute?.destination_longitude != null) ? (
                <EventMap latitude={travelRoute.destination_latitude} longitude={travelRoute.destination_longitude} />
              ) : (selectedSuggestion?.latitude != null && selectedSuggestion?.longitude != null) ? (
                <EventMap latitude={selectedSuggestion.latitude} longitude={selectedSuggestion.longitude} />
              ) : (
                <Box
                  sx={{
                    minHeight: 220,
                    borderRadius: 2,
                    border: "1px dashed",
                    borderColor: "divider",
                    display: "grid",
                    placeItems: "center",
                    color: "text.secondary",
                    px: 2,
                    textAlign: "center",
                  }}
                >
                  <Stack spacing={1} alignItems="center">
                    <MapPin size={18} />
                    <Typography variant="caption">
                      Pick a local event to preview it on the map.
                    </Typography>
                  </Stack>
                </Box>
              )}

              {selectedSuggestion && (
                <Stack spacing={0.75}>
                  <Typography variant="body2" fontWeight={600}>
                    {selectedSuggestion.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {selectedSuggestion.address ?? "Address unavailable"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {isTravelLoading ? "Calculating travel time…" : travelSummary ?? "Travel time not available yet."}
                  </Typography>
                  {travelRoute?.destination_name && (
                    <Typography variant="caption" color="text.secondary">
                      Destination: {travelRoute.destination_name}
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.secondary">
                    After you add it, click the event in your timeline to open the standard event details map.
                  </Typography>
                </Stack>
              )}
            </Stack>

            <Divider />

            {isLoading && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "text.secondary" }}>
                <CircularProgress size={14} />
                <Typography variant="caption">Finding nearby places…</Typography>
              </Box>
            )}

            {!isLoading && suggestions.length === 0 && !error && (
              <Typography variant="caption" color="text.secondary">
                Tap the button to pull nearby places from Google Places.
              </Typography>
            )}

            {!isLoading && suggestions.length > 0 && (
              <Stack spacing={1.25}>
                {suggestions.map((suggestion) => {
                  const selected = selectedSuggestion?.external_id === suggestion.external_id;
                  return (
                    <Box
                      key={suggestion.external_id}
                      sx={{
                        borderRadius: 1.5,
                        border: "1px solid",
                        borderColor: selected ? "primary.main" : "divider",
                        bgcolor: selected ? (theme) => alpha(theme.palette.primary.main, 0.08) : "background.paper",
                        p: 1.5,
                        display: "flex",
                        flexDirection: "column",
                        gap: 1,
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="flex-start">
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {suggestion.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {suggestion.venue_name ?? suggestion.address ?? "Location TBD"}
                          </Typography>
                        </Box>
                        <Chip icon={<MapPinned size={16} />} label="Google Places" size="small" />
                      </Stack>

                      {suggestion.start_time && (
                        <Typography variant="caption" color="text.secondary">
                          {new Date(suggestion.start_time).toLocaleString()}
                        </Typography>
                      )}

                      {suggestion.description && (
                        <Typography variant="caption" color="text.secondary">
                          {suggestion.description}
                        </Typography>
                      )}

                      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                        <Button
                          variant="secondary"
                          size="sm"
                          startIcon={<Car size={16} />}
                          onClick={() => void handleSelectSuggestion(suggestion)}
                        >
                          Show on map
                        </Button>
                        <Button
                          size="sm"
                          startIcon={<Plus size={16} />}
                          onClick={() => void handleAddSuggestion(suggestion)}
                        >
                          Add as event
                        </Button>
                      </Stack>
                    </Box>
                  );
                })}
              </Stack>
            )}
          </Stack>
        </CardContent>
      </Card>

      <AddSuggestedEventModal
        isOpen={isAddModalOpen}
        suggestion={pendingSuggestion}
        selectedDate={selectedDate}
        selectedCalendarId={selectedCalendarId}
        onClose={() => {
          setIsAddModalOpen(false);
          setPendingSuggestion(null);
        }}
        onConfirm={handleConfirmAddSuggestion}
      />
    </Box>
  );
}
