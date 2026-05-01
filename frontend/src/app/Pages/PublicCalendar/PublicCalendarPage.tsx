import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import { alpha } from "@mui/material/styles";
import type { Theme } from "@mui/material/styles";
import {
  Card,
  CardContent,
  CardHeader,
} from "../../design_system/components/ui/Card";
import type { DailyTimelineItem } from "../../Types/Calendar";
import {
  buildPositionedEvents,
  extractTimeHHMM,
  formatHourLabel,
  getCurrentMinutes,
  getEventTone,
  HOUR_ROW_HEIGHT,
  HOURS_IN_DAY,
  TIME_GUTTER_WIDTH,
} from "../TodaysPlan/dayPlannerUtils";
import EventClient from "../../api_client/Event";

const BASE_API_URL = import.meta.env.VITE_BASE_API_URL;

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type RawPublicEvent = {
  id?: string;
  event_id?: string;
  name?: string;
  event_name?: string;
  title?: string;
  start?: string;
  start_time?: string;
  startTime?: string;
  end?: string;
  end_time?: string;
  endTime?: string;
  description?: string;
  event_description?: string;
  priority?: number;
  priority_rank?: number;
  full_address?: string | null;
  location?: string | null;
  event_type?: string | null;
  eventType?: string | null;
  is_booked?: boolean | null;
  isBooked?: boolean | null;
};

type PublicTimelineItem = DailyTimelineItem & {
  event_type?: string | null;
  is_booked?: boolean | null;
};

type PositionedPublicTimelineItem = ReturnType<typeof buildPositionedEvents>[number] & {
  event_type?: string | null;
  is_booked?: boolean | null;
};

type PublicCalendarResponse = {
  calendar_id?: string;
  calendar_name?: string;
  events?: RawPublicEvent[];
};

const getWeekStart = (date: Date): Date => {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
};

const addDays = (date: Date, n: number): Date => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};

const toDateKey = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const normalizePublicEvent = (raw: RawPublicEvent): PublicTimelineItem | null => {
  const id = raw.id ?? raw.event_id;
  const name = raw.name ?? raw.event_name ?? raw.title;
  const start = raw.start ?? raw.start_time ?? raw.startTime;
  const end = raw.end ?? raw.end_time ?? raw.endTime;

  if (!id || !name || !start) {
    return null;
  }

  return {
    id,
    name,
    start,
    end: end ?? start,
    description: raw.description ?? raw.event_description,
    priority: raw.priority ?? raw.priority_rank ?? 0,
    location: raw.location ?? raw.full_address ?? null,
    flexible: false,
    travel_time_min: 0,
    event_type: raw.event_type ?? raw.eventType ?? null,
    is_booked: raw.is_booked ?? raw.isBooked ?? false,
  };
};

export default function PublicCalendarPage() {
  const { publicToken } = useParams();
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarName, setCalendarName] = useState("Public Calendar");
  const [items, setItems] = useState<PublicTimelineItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nowMinutes, setNowMinutes] = useState(getCurrentMinutes);

  const [selectedEvent, setSelectedEvent] = useState<PublicTimelineItem | null>(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookingName, setBookingName] = useState("");
  const [bookingEmail, setBookingEmail] = useState("");
  const [bookingDescription, setBookingDescription] = useState("");
  const [bookingError, setBookingError] = useState("");
  const [isBookingSubmitting, setIsBookingSubmitting] = useState(false);

  const fetchPublicCalendar = useCallback(async () => {
    if (!publicToken) {
      setError("Missing public calendar token.");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`${BASE_API_URL}/calendar/public/${publicToken}`);
      const data: PublicCalendarResponse = await response.json();

      if (!response.ok) {
        throw new Error("Could not load public calendar.");
      }

      setCalendarName(data.calendar_name ?? "Public Calendar");

      const normalizedEvents = (data.events ?? [])
        .map(normalizePublicEvent)
        .filter((event): event is PublicTimelineItem => event !== null);

      setItems(normalizedEvents);
    } catch (err) {
      console.error("Failed to load public calendar", err);
      setError("Could not load this public calendar.");
    } finally {
      setIsLoading(false);
    }
  }, [publicToken]);

  const weekStartKey = useMemo(
    () => getWeekStart(selectedDate).toDateString(),
    [selectedDate]
  );

  const weekDays = useMemo(() => {
    const wStart = getWeekStart(selectedDate);
    return Array.from({ length: 7 }, (_, i) => addDays(wStart, i));
  }, [weekStartKey]);

  const hours = useMemo(() => Array.from({ length: HOURS_IN_DAY }, (_, h) => h), []);

  const todayStr = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t.toDateString();
  }, []);

  const todayInWeek = useMemo(
    () => weekDays.some((d) => d.toDateString() === todayStr),
    [weekDays, todayStr]
  );

  const weekItems = useMemo(() => {
    const map: Record<string, PublicTimelineItem[]> = {};

    weekDays.forEach((day) => {
      map[toDateKey(day)] = [];
    });

    items.forEach((event) => {
      const key = toDateKey(new Date(event.start));

      if (map[key]) {
        map[key].push(event);
      }
    });

    return map;
  }, [items, weekDays]);

  useEffect(() => {
    fetchPublicCalendar();
  }, [fetchPublicCalendar]);

  useEffect(() => {
    setNowMinutes(getCurrentMinutes());
    const id = window.setInterval(() => setNowMinutes(getCurrentMinutes()), 60 * 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (isLoading || !scrollRef.current) return;

    const container = scrollRef.current;
    const target =
      (getCurrentMinutes() / 60) * HOUR_ROW_HEIGHT - container.clientHeight * 0.35;

    container.scrollTop = Math.max(0, target);
  }, [isLoading]);

  const openBookingDialog = (event: PositionedPublicTimelineItem) => {
    const eventType = (event.event_type ?? "").toLowerCase();

    if (event.is_booked) {
      return;
    }

    if (eventType && eventType !== "bookable") {
      return;
    }

    setSelectedEvent({
      id: event.id,
      name: event.name,
      start: event.start,
      end: event.end,
      description: event.description,
      priority: event.priority,
      location: event.location,
      flexible: event.flexible,
      travel_time_min: event.travel_time_min,
      event_type: event.event_type,
      is_booked: event.is_booked,
    });

    setBookingName("");
    setBookingEmail("");
    setBookingDescription("");
    setBookingError("");
    setIsBookingOpen(true);
  };

  const handleCloseBookingDialog = () => {
    if (isBookingSubmitting) return;

    setIsBookingOpen(false);
    setSelectedEvent(null);
    setBookingName("");
    setBookingEmail("");
    setBookingDescription("");
    setBookingError("");
  };

  const handleBookEvent = async () => {
    if (!selectedEvent || !publicToken) return;

    const trimmedName = bookingName.trim();
    const trimmedEmail = bookingEmail.trim();
    const trimmedDescription = bookingDescription.trim();

    if (!trimmedName || !trimmedEmail) {
      setBookingError("Name and email are required.");
      return;
    }

    const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);

    if (!emailLooksValid) {
      setBookingError("Please enter a valid email address.");
      return;
    }

    try {
      setIsBookingSubmitting(true);
      setBookingError("");

        const response = await fetch(`${BASE_API_URL}/events/book/${selectedEvent.id}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                name: trimmedName,
                email: trimmedEmail,
                notes: trimmedDescription,
            }),
            });

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(body?.detail || body?.message || "Failed to book event.");
      }

      setIsBookingOpen(false);
      setSelectedEvent(null);
      setBookingName("");
      setBookingEmail("");
      setBookingDescription("");
      setBookingError("");

      await fetchPublicCalendar();
    } catch (err) {
      console.error("Failed to book event", err);
      setBookingError("Failed to book event. Please try again.");
    } finally {
      setIsBookingSubmitting(false);
    }
  };

  const nowTop = (nowMinutes / 60) * HOUR_ROW_HEIGHT;

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        p: { xs: 2, md: 4 },
      }}
    >
      <Box sx={{ maxWidth: 1200, mx: "auto" }}>
        <Box
          sx={{
            mb: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Box>
            <Typography variant="h5" fontWeight={700}>
              {calendarName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Select an available slot to book an appointment.
            </Typography>
          </Box>

          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              onClick={() => setSelectedDate(addDays(selectedDate, -7))}
            >
              Previous
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => setSelectedDate(new Date())}
            >
              Today
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => setSelectedDate(addDays(selectedDate, 7))}
            >
              Next
            </Button>
          </Box>
        </Box>

        <Card>
          <CardHeader>
            <Typography variant="h6" fontWeight={600}>
              Available week
            </Typography>
          </CardHeader>

          <CardContent sx={{ p: 0 }}>
            {isLoading && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 2, pb: 2 }}>
                <CircularProgress size={14} />
                <Typography variant="body2" color="text.secondary">
                  Loading public calendar…
                </Typography>
              </Box>
            )}

            {error && (
              <Typography variant="body2" color="error" sx={{ px: 2, pb: 2 }}>
                {error}
              </Typography>
            )}

            {!isLoading && !error && (
              <>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: `${TIME_GUTTER_WIDTH}px repeat(7, 1fr)`,
                    borderTop: 1,
                    borderBottom: 1,
                    borderColor: "divider",
                    position: "sticky",
                    top: 0,
                    bgcolor: "background.paper",
                    zIndex: 1,
                  }}
                >
                  <Box />
                  {weekDays.map((day) => {
                    const isToday = day.toDateString() === todayStr;
                    const isSelected = day.toDateString() === selectedDate.toDateString();

                    return (
                      <Box
                        key={toDateKey(day)}
                        component="button"
                        onClick={() => setSelectedDate(day)}
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          py: 1,
                          border: "none",
                          borderLeft: "1px solid",
                          borderColor: "divider",
                          background: "none",
                          cursor: "pointer",
                          "&:hover": { bgcolor: "action.hover" },
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: "0.6875rem",
                            fontWeight: isToday ? 700 : 400,
                            color: isToday ? "primary.main" : "text.secondary",
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                          }}
                        >
                          {DAY_NAMES[day.getDay()]}
                        </Typography>

                        <Box
                          sx={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            mt: 0.25,
                            bgcolor: isToday
                              ? "primary.main"
                              : isSelected
                              ? "action.selected"
                              : "transparent",
                            color: isToday ? "primary.contrastText" : "text.primary",
                            fontWeight: 600,
                            fontSize: "0.8125rem",
                          }}
                        >
                          {day.getDate()}
                        </Box>
                      </Box>
                    );
                  })}
                </Box>

                <Box
                  ref={scrollRef}
                  sx={{
                    maxHeight: { xs: 460, md: 620 },
                    overflowY: "auto",
                    position: "relative",
                  }}
                >
                  <Box sx={{ minHeight: HOURS_IN_DAY * HOUR_ROW_HEIGHT, position: "relative" }}>
                    {hours.map((hour) => (
                      <Box
                        key={hour}
                        sx={{
                          display: "grid",
                          gridTemplateColumns: `${TIME_GUTTER_WIDTH}px repeat(7, 1fr)`,
                          minHeight: HOUR_ROW_HEIGHT,
                        }}
                      >
                        <Box sx={{ pr: 1.5, pt: 0.25, textAlign: "right", flexShrink: 0 }}>
                          <Typography variant="caption" color="text.secondary">
                            {formatHourLabel(hour)}
                          </Typography>
                        </Box>

                        {weekDays.map((day) => (
                          <Box
                            key={toDateKey(day)}
                            sx={{
                              borderTop: 1,
                              borderLeft: 1,
                              borderColor: "divider",
                              minHeight: HOUR_ROW_HEIGHT,
                            }}
                          />
                        ))}
                      </Box>
                    ))}

                    <Box
                      sx={{
                        position: "absolute",
                        top: 0,
                        left: TIME_GUTTER_WIDTH,
                        right: 0,
                        bottom: 0,
                        display: "grid",
                        gridTemplateColumns: "repeat(7, 1fr)",
                        pointerEvents: "none",
                      }}
                    >
                      {weekDays.map((day) => {
                        const dateKey = toDateKey(day);
                        const dayItems = weekItems[dateKey] ?? [];
                        const positioned = buildPositionedEvents(
                          dayItems
                        ) as PositionedPublicTimelineItem[];
                        const isToday = day.toDateString() === todayStr;

                        return (
                          <Box
                            key={dateKey}
                            sx={{
                              position: "relative",
                              bgcolor: isToday
                                ? (theme: Theme) => alpha(theme.palette.primary.main, 0.04)
                                : "transparent",
                            }}
                          >
                            {positioned.map((event) => {
                              const top = (event.startMinutes / 60) * HOUR_ROW_HEIGHT + 2;
                              const duration = event.endMinutes - event.startMinutes;
                              const height = Math.max(
                                (duration / 60) * HOUR_ROW_HEIGHT - 4,
                                18
                              );
                              const tone = getEventTone(event.priority);
                              const widthPct = 90 / event.columnCount;
                              const leftPct = widthPct * event.column + 2;
                              const eventType = (event.event_type ?? "").toLowerCase();
                              const canBook = !event.is_booked && (!eventType || eventType === "bookable");

                              return (
                                <Box
                                  key={event.id}
                                  onClick={() => openBookingDialog(event)}
                                  sx={{
                                    position: "absolute",
                                    top,
                                    left: `${leftPct}%`,
                                    width: `${widthPct}%`,
                                    height,
                                    borderRadius: 0.75,
                                    borderLeft: "3px solid",
                                    borderColor: event.is_booked ? "text.disabled" : tone.borderColor,
                                    bgcolor: event.is_booked ? "action.disabledBackground" : tone.bgcolor,
                                    px: 0.5,
                                    py: 0.25,
                                    overflow: "hidden",
                                    cursor: canBook ? "pointer" : "default",
                                    pointerEvents: "auto",
                                    opacity: event.is_booked ? 0.7 : 1,
                                    "&:hover": canBook ? { filter: "brightness(0.94)" } : undefined,
                                  }}
                                >
                                  <Typography
                                    sx={{
                                      fontSize: "0.625rem",
                                      fontWeight: 600,
                                      lineHeight: 1.3,
                                      display: "block",
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                  >
                                    {event.name}
                                  </Typography>

                                  {height > 28 && (
                                    <Typography
                                      sx={{
                                        fontSize: "0.5625rem",
                                        color: "text.secondary",
                                        lineHeight: 1.2,
                                      }}
                                    >
                                      {event.is_booked
                                        ? "Booked"
                                        : extractTimeHHMM(event.start)}
                                    </Typography>
                                  )}
                                </Box>
                              );
                            })}
                          </Box>
                        );
                      })}
                    </Box>

                    {todayInWeek && (
                      <Box
                        sx={{
                          position: "absolute",
                          top: nowTop,
                          left: TIME_GUTTER_WIDTH,
                          right: 0,
                          display: "flex",
                          alignItems: "center",
                          pointerEvents: "none",
                          zIndex: 2,
                        }}
                      >
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            bgcolor: "error.main",
                            flexShrink: 0,
                            transform: "translateX(-50%)",
                          }}
                        />
                        <Box
                          sx={{
                            flex: 1,
                            borderTop: "2px solid",
                            borderColor: "error.main",
                          }}
                        />
                      </Box>
                    )}
                  </Box>
                </Box>
              </>
            )}
          </CardContent>
        </Card>
      </Box>

      <Dialog
        open={isBookingOpen}
        onClose={handleCloseBookingDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Book this appointment</DialogTitle>

        <DialogContent
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            pt: 1,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            {selectedEvent?.name}
          </Typography>

          {selectedEvent && (
            <Typography variant="caption" color="text.secondary">
              {extractTimeHHMM(selectedEvent.start)}
            </Typography>
          )}

          <TextField
            label="Name"
            value={bookingName}
            onChange={(e) => setBookingName(e.target.value)}
            required
            fullWidth
            disabled={isBookingSubmitting}
          />

          <TextField
            label="Email"
            type="email"
            value={bookingEmail}
            onChange={(e) => setBookingEmail(e.target.value)}
            required
            fullWidth
            disabled={isBookingSubmitting}
          />

          <TextField
            label="Description"
            value={bookingDescription}
            onChange={(e) => setBookingDescription(e.target.value)}
            multiline
            minRows={3}
            fullWidth
            disabled={isBookingSubmitting}
          />

          {bookingError && (
            <Typography variant="body2" color="error">
              {bookingError}
            </Typography>
          )}
        </DialogContent>

        <DialogActions>
          <Button
            onClick={handleCloseBookingDialog}
            disabled={isBookingSubmitting}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            disabled={
              isBookingSubmitting ||
              !bookingName.trim() ||
              !bookingEmail.trim()
            }
            onClick={handleBookEvent}
          >
            {isBookingSubmitting ? "Booking..." : "Book"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}