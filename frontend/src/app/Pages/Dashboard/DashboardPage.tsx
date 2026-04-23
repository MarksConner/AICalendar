import { useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import DirectionsCarOutlinedIcon from "@mui/icons-material/DirectionsCarOutlined";
import AddTaskOutlinedIcon from "@mui/icons-material/AddTaskOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";

import { Card, CardContent, CardHeader } from "../../design_system/components/ui/Card";
import { CalendarMonth } from "./CalendarMonth";
import type { CalendarEvent } from "../../Types/Calendar";
import { dataService } from "../../services";
import { EventMap } from "../../components/EventMap";
import { addSuggestedEvent, fetchLocalEventSuggestions, fetchTravelRoute, type LocalEventSuggestion, type TravelRoute } from "../../api/Events";
import { getPrimaryCalendarId } from "../../services/adapters/http/httpDataService";
import { useGeolocation } from "../../hooks/useGeolocation";

export const DashboardPage = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [keyword, setKeyword] = useState("food");
  const [radiusKm, setRadiusKm] = useState(25);
  const [suggestions, setSuggestions] = useState<LocalEventSuggestion[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<LocalEventSuggestion | null>(null);
  const [travelRoute, setTravelRoute] = useState<TravelRoute | null>(null);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [travelLoading, setTravelLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const geolocation = useGeolocation();

  useEffect(() => {
    const year = 2025;
    const month = 2;

    dataService.fetchMonthEvents(year, month)
      .then((data) => {
        setEvents(data);
        setIsLoading(false);
      })
      .catch(() => {
        setError("Could not load calendar events.");
        setIsLoading(false);
      });
  }, []);

  const travelSummary = useMemo(() => {
    if (!travelRoute) return null;
    const minutes = Math.round(travelRoute.duration_seconds / 60);
    const miles = (travelRoute.distance_meters / 1609.34).toFixed(1);
    return `${minutes} min drive • ${miles} mi`;
  }, [travelRoute]);

  const loadSuggestions = async () => {
    if (!geolocation.latitude || !geolocation.longitude) {
      setLocalError("We need your location before we can suggest nearby places.");
      return;
    }

    setSuggestionsLoading(true);
    setLocalError(null);
    setActionMessage(null);

    try {
      const results = await fetchLocalEventSuggestions({
        latitude: geolocation.latitude,
        longitude: geolocation.longitude,
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
      setLocalError(err instanceof Error ? err.message : "Failed to load nearby suggestions.");
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const handleSelectSuggestion = async (suggestion: LocalEventSuggestion) => {
    setSelectedSuggestion(suggestion);
    setTravelRoute(null);

    if (!geolocation.latitude || !geolocation.longitude || !suggestion.address) {
      return;
    }

    setTravelLoading(true);
    try {
      const route = await fetchTravelRoute(
        geolocation.latitude,
        geolocation.longitude,
        suggestion.address,
      );
      setTravelRoute(route);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Failed to load travel route.");
    } finally {
      setTravelLoading(false);
    }
  };

  const handleAddSuggestion = async (suggestion: LocalEventSuggestion) => {
    if (!suggestion.start_time) {
      setActionMessage("This suggestion is missing a start time, so it can't be added yet.");
      return;
    }

    try {
      const calendarId = await getPrimaryCalendarId();
      await addSuggestedEvent({
        calendar_id: calendarId,
        title: suggestion.title,
        description: suggestion.description ?? "Imported from Google Places",
        address: suggestion.address ?? undefined,
        start_time: suggestion.start_time,
        end_time: suggestion.end_time ?? undefined,
        priority_rank: 3,
      });
      setActionMessage(`Added \"${suggestion.title}\" to your calendar.`);
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Failed to add suggestion.");
    }
  };

  return (
    <Stack spacing={2}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Typography variant="h5" fontWeight={600}>
          Dashboard
        </Typography>
      </Box>

      <Stack direction={{ xs: "column", lg: "row" }} spacing={2} alignItems="stretch">
        <Card sx={{ flex: 1 }}>
          <CardHeader>
            <Typography variant="h6" fontWeight={600}>
              Calendar overview
            </Typography>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <Typography variant="body2" color="text.secondary">
                Loading calendar…
              </Typography>
            )}
            {error && (
              <Typography variant="body2" color="error">
                {error}
              </Typography>
            )}
            {!isLoading && !error && (
              <CalendarMonth year={2025} month={2} events={events} />
            )}
          </CardContent>
        </Card>

        <Card sx={{ flex: 1.2 }}>
          <CardHeader>
            <Typography variant="h6" fontWeight={600}>
              Nearby suggestions
            </Typography>
          </CardHeader>
          <CardContent>
            <Stack spacing={2}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  label="Keyword"
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="food, museum, coffee..."
                  fullWidth
                />
                <TextField
                  label="Radius (km)"
                  type="number"
                  value={radiusKm}
                  onChange={(event) => setRadiusKm(Number(event.target.value) || 25)}
                  inputProps={{ min: 1, max: 100 }}
                  sx={{ width: { xs: "100%", sm: 160 } }}
                />
                <Button
                  variant="contained"
                  onClick={loadSuggestions}
                  disabled={suggestionsLoading || geolocation.loading}
                  sx={{ minWidth: 160 }}
                >
                  {suggestionsLoading ? "Loading..." : "Suggest events"}
                </Button>
              </Stack>

              {geolocation.error && (
                <Typography variant="body2" color="error">
                  {geolocation.error}
                </Typography>
              )}
              {localError && (
                <Typography variant="body2" color="error">
                  {localError}
                </Typography>
              )}
              {actionMessage && (
                <Typography variant="body2" color="primary.main">
                  {actionMessage}
                </Typography>
              )}

              <Divider />

              <Stack spacing={1.5}>
                {suggestionsLoading && <CircularProgress size={24} />}
                {!suggestionsLoading && suggestions.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    Pull suggestions to see nearby places from Google Places.
                  </Typography>
                )}
                {suggestions.map((suggestion) => {
                  const selected = selectedSuggestion?.external_id === suggestion.external_id;
                  return (
                    <Box
                      key={suggestion.external_id}
                      sx={{
                        border: (theme) => `1px solid ${selected ? theme.palette.primary.main : theme.palette.divider}`,
                        borderRadius: 2,
                        p: 2,
                        backgroundColor: selected ? "rgba(111, 115, 255, 0.08)" : "background.paper",
                      }}
                    >
                      <Stack spacing={1.25}>
                        <Stack
                          direction={{ xs: "column", sm: "row" }}
                          justifyContent="space-between"
                          spacing={1}
                        >
                          <Box>
                            <Typography variant="subtitle1" fontWeight={600}>
                              {suggestion.title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {suggestion.venue_name ?? suggestion.address ?? "Location TBD"}
                            </Typography>
                          </Box>
                          <Chip
                            icon={<LocationOnOutlinedIcon />}
                            label={suggestion.source.replace("_", " ")}
                            size="small"
                          />
                        </Stack>

                        {suggestion.start_time && (
                          <Typography variant="body2" color="text.secondary">
                            {new Date(suggestion.start_time).toLocaleString()}
                          </Typography>
                        )}

                        {suggestion.description && (
                          <Typography variant="body2" color="text.secondary">
                            {suggestion.description}
                          </Typography>
                        )}

                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                          <Button
                            variant="outlined"
                            startIcon={<DirectionsCarOutlinedIcon />}
                            onClick={() => void handleSelectSuggestion(suggestion)}
                          >
                            Show on map
                          </Button>
                          <Button
                            variant="contained"
                            startIcon={<AddTaskOutlinedIcon />}
                            onClick={() => void handleAddSuggestion(suggestion)}
                          >
                            Add as event
                          </Button>
                        </Stack>
                      </Stack>
                    </Box>
                  );
                })}
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      <Card>
        <CardHeader>
          <Typography variant="h6" fontWeight={600}>
            Map + travel time
          </Typography>
        </CardHeader>
        <CardContent>
          <Stack spacing={2}>
            {!import.meta.env.VITE_MAPBOX_TOKEN && (
              <Typography variant="body2" color="error">
                Add VITE_MAPBOX_TOKEN to your frontend environment to render the map.
              </Typography>
            )}

            {selectedSuggestion?.latitude && selectedSuggestion?.longitude ? (
              <EventMap
                latitude={selectedSuggestion.latitude}
                longitude={selectedSuggestion.longitude}
              />
            ) : (
              <Box
                sx={{
                  minHeight: 220,
                  borderRadius: 2,
                  border: (theme) => `1px dashed ${theme.palette.divider}`,
                  display: "grid",
                  placeItems: "center",
                  color: "text.secondary",
                }}
              >
                <Typography variant="body2">
                  Pick a suggestion to see it on the map.
                </Typography>
              </Box>
            )}

            {selectedSuggestion && (
              <Stack spacing={0.75}>
                <Typography variant="subtitle1" fontWeight={600}>
                  {selectedSuggestion.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {travelLoading ? "Calculating travel time..." : travelSummary ?? "Travel time not available yet."}
                </Typography>
                {travelRoute?.destination_name && (
                  <Typography variant="body2" color="text.secondary">
                    Destination: {travelRoute.destination_name}
                  </Typography>
                )}
              </Stack>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
};
