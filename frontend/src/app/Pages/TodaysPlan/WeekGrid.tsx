/* Handles rendering the weekly view grid
Written by: Byron Billy
FRs: Any that have to do with daily,weekly and monthly view for the calendar */
import { useEffect, useMemo, useRef, useState } from "react";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import type { Theme } from "@mui/material/styles";
import {
  Card,
  CardContent,
  CardHeader,
} from "../../design_system/components/ui/Card";
import { dataService } from "../../services";
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
} from "./dayPlannerUtils";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

type WeekGridProps = {
  selectedDate: Date;
  onNavigateToDay: (date: Date) => void;
};

export function WeekGrid({ selectedDate, onNavigateToDay }: WeekGridProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [weekItems, setWeekItems] = useState<Record<string, DailyTimelineItem[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nowMinutes, setNowMinutes] = useState(getCurrentMinutes);

  // Stable string key — only changes when the selected week changes.
  const weekStartKey = useMemo(
    () => getWeekStart(selectedDate).toDateString(),
    [selectedDate]
  );

  // Stable array reference within the same week.
  const weekDays = useMemo(() => {
    const wStart = getWeekStart(selectedDate);
    return Array.from({ length: 7 }, (_, i) => addDays(wStart, i));
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Fetch all 7 days in parallel; re-fetch only when the week changes.
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    Promise.all(weekDays.map((d) => dataService.fetchDayTimeline(d)))
      .then((results) => {
        if (cancelled) return;
        const map: Record<string, DailyTimelineItem[]> = {};
        weekDays.forEach((d, i) => {
          map[toDateKey(d)] = results[i];
        });
        setWeekItems(map);
        setIsLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Could not load events for this week.");
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [weekDays]);

  // Tick the now-line every minute.
  useEffect(() => {
    setNowMinutes(getCurrentMinutes());
    const id = window.setInterval(() => setNowMinutes(getCurrentMinutes()), 60 * 1000);
    return () => window.clearInterval(id);
  }, []);

  // Auto-scroll to current time after data loads.
  useEffect(() => {
    if (isLoading || !scrollRef.current) return;
    const container = scrollRef.current;
    const target =
      (getCurrentMinutes() / 60) * HOUR_ROW_HEIGHT - container.clientHeight * 0.35;
    container.scrollTop = Math.max(0, target);
  }, [isLoading]);

  const nowTop = (nowMinutes / 60) * HOUR_ROW_HEIGHT;

  return (
    <Card>
      <CardHeader>
        <Typography variant="h6" fontWeight={600}>
          Week schedule
        </Typography>
      </CardHeader>
      <CardContent sx={{ p: 0 }}>
        {isLoading && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 2, pb: 2 }}>
            <CircularProgress size={14} />
            <Typography variant="body2" color="text.secondary">
              Loading week…
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
            {/* Sticky day-column headers */}
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
              <Box /> {/* gutter placeholder */}
              {weekDays.map((day) => {
                const isToday = day.toDateString() === todayStr;
                const isSelected = day.toDateString() === selectedDate.toDateString();
                return (
                  <Box
                    key={toDateKey(day)}
                    component="button"
                    onClick={() => onNavigateToDay(day)}
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

            {/* Scrollable time grid */}
            <Box
              ref={scrollRef}
              sx={{
                maxHeight: { xs: 460, md: 620 },
                overflowY: "auto",
                position: "relative",
              }}
            >
              <Box sx={{ minHeight: HOURS_IN_DAY * HOUR_ROW_HEIGHT, position: "relative" }}>
                {/* Background hour rows */}
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

                {/* Events overlay — one column per day */}
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
                    const items = weekItems[dateKey] ?? [];
                    const positioned = buildPositionedEvents(items);
                    const isToday = day.toDateString() === todayStr;

                    return (
                      <Box
                        key={dateKey}
                        sx={{
                          position: "relative",
                          bgcolor: isToday
                            ? (theme: Theme) =>
                                alpha(theme.palette.primary.main, 0.04)
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

                          return (
                            <Box
                              key={event.id}
                              onClick={() => onNavigateToDay(day)}
                              sx={{
                                position: "absolute",
                                top,
                                left: `${leftPct}%`,
                                width: `${widthPct}%`,
                                height,
                                borderRadius: 0.75,
                                borderLeft: "3px solid",
                                borderColor: tone.borderColor,
                                bgcolor: tone.bgcolor,
                                px: 0.5,
                                py: 0.25,
                                overflow: "hidden",
                                cursor: "pointer",
                                pointerEvents: "auto",
                                "&:hover": { filter: "brightness(0.94)" },
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
                                  {extractTimeHHMM(event.start)}
                                </Typography>
                              )}
                            </Box>
                          );
                        })}
                      </Box>
                    );
                  })}
                </Box>

                {/* Now indicator — only visible when today is in this week */}
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
  );
}
