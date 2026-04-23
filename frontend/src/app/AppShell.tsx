import { Outlet, useNavigate, useSearchParams } from "react-router-dom";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import ButtonGroup from "@mui/material/ButtonGroup";
import Fab from "@mui/material/Fab";
import IconButton from "@mui/material/IconButton";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Toolbar from "@mui/material/Toolbar";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "./design_system/components/ui/Button";
import { SidePanel } from "./design_system/components/ui/SidePanel";
import { CalendarSidebar } from "./components/CalendarSidebar";
import { CalendarProvider } from "./contexts/CalendarContext";
import type { CalendarView } from "./contexts/calendarState";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Mic,
  MessageCircle,
} from "lucide-react";

const calendarViewOptions: Array<{ value: CalendarView; label: string }> = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

const isCalendarView = (value: string | null): value is CalendarView =>
  value === "day" || value === "week" || value === "month";

const parseCalendarView = (value: string | null): CalendarView =>
  isCalendarView(value) ? value : "day";

const toDateParam = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateParam = (value: string | null): Date | null => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  const isValidDate =
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day;

  if (!isValidDate) {
    return null;
  }

  parsed.setHours(0, 0, 0, 0);
  return parsed;
};

const addDays = (date: Date, amount: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
};

const startOfWeek = (date: Date) => addDays(date, -date.getDay());

const formatHeaderDate = (date: Date, view: CalendarView) => {
  if (view === "month") {
    return date.toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    });
  }

  if (view === "week") {
    const weekStart = startOfWeek(date);
    const weekEnd = addDays(weekStart, 6);
    const startLabel = weekStart.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
    const endLabel = weekEnd.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return `${startLabel} - ${endLabel}`;
  }

  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
};

const shiftDateByView = (date: Date, view: CalendarView, direction: -1 | 1) => {
  if (view === "week") {
    return addDays(date, direction * 7);
  }
  if (view === "month") {
    const next = new Date(date);
    next.setMonth(next.getMonth() + direction);
    return next;
  }
  return addDays(date, direction);
};

const LazyAiChatPanel = lazy(() =>
  import("./components/AiChatPanel").then((module) => ({
    default: module.AiChatPanel,
  }))
);

export function AppShell() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string | null>(
    () => localStorage.getItem("calendar_id") || null
  );

  const selectedDate = useMemo(
    () => parseDateParam(searchParams.get("date")) ?? new Date(),
    [searchParams]
  );
  const selectedView = useMemo(
    () => parseCalendarView(searchParams.get("view")),
    [searchParams]
  );

  useEffect(() => {
    const rawDate = searchParams.get("date");
    const rawView = searchParams.get("view");
    const hasValidDate = parseDateParam(rawDate) !== null;
    const hasValidView = isCalendarView(rawView);

    if (hasValidDate && hasValidView) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams);
    if (!hasValidDate) {
      nextParams.set("date", toDateParam(selectedDate));
    }
    if (!hasValidView) {
      nextParams.set("view", selectedView);
    }
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, selectedDate, selectedView, setSearchParams]);

  const updateCalendarParams = useCallback(
    (updates: { date?: Date; view?: CalendarView }) => {
      setSearchParams((prev) => {
        const nextParams = new URLSearchParams(prev);
        if (updates.date) {
          nextParams.set("date", toDateParam(updates.date));
        }
        if (updates.view) {
          nextParams.set("view", updates.view);
        }
        return nextParams;
      });
    },
    [setSearchParams]
  );

  const setSelectedDate = useCallback(
    (date: Date) => {
      updateCalendarParams({ date });
    },
    [updateCalendarParams]
  );

  const setSelectedView = useCallback(
    (view: CalendarView) => {
      updateCalendarParams({ view });
    },
    [updateCalendarParams]
  );

  const navigateToDay = useCallback(
    (date: Date) => {
      updateCalendarParams({ date, view: "day" });
    },
    [updateCalendarParams]
  );

  const handleGoToCalendarHome = () => {
    const today = new Date();
    navigate(`/today?view=day&date=${toDateParam(today)}`);
  };

  const handleOpenChat = () => setIsChatOpen(true);
  const handleCloseChat = () => setIsChatOpen(false);
  const handleToday = () => setSelectedDate(new Date());
  const handlePrev = () =>
    setSelectedDate(shiftDateByView(selectedDate, selectedView, -1));
  const handleNext = () =>
    setSelectedDate(shiftDateByView(selectedDate, selectedView, 1));

  const handleSetSelectedCalendarId = useCallback((id: string | null) => {
    setSelectedCalendarId(id);
    if (id) {
      localStorage.setItem("calendar_id", id);
    } else {
      localStorage.removeItem("calendar_id");
    }
  }, []);

  const calendarContextValue = useMemo(
    () => ({
      selectedDate,
      setSelectedDate,
      selectedView,
      setSelectedView,
      navigateToDay,
      selectedCalendarId,
      setSelectedCalendarId: handleSetSelectedCalendarId,
    }),
    [selectedDate, setSelectedDate, selectedView, setSelectedView, navigateToDay, selectedCalendarId, handleSetSelectedCalendarId]
  );

  return (
    <CalendarProvider value={calendarContextValue}>
      <Box sx={{ display: "flex", minHeight: "100vh", flexDirection: "column" }}>
        <AppBar
          position="sticky"
          color="inherit"
          elevation={0}
          sx={{ borderBottom: 1, borderColor: "divider" }}
        >
          <Toolbar sx={{ gap: 2 }}>
            <ButtonBase
              aria-label="Go to calendar dashboard"
              onClick={handleGoToCalendarHome}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                borderRadius: 1,
                px: 0.5,
                py: 0.25,
                color: "text.primary",
                "&:hover": {
                  bgcolor: "action.hover",
                },
              }}
            >
              <CalendarDays size={20} />
              <Typography variant="h6" fontWeight={600}>
                Calendar
              </Typography>
            </ButtonBase>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Button size="sm" variant="secondary" onClick={handleToday}>
                Today
              </Button>
              <IconButton
                size="small"
                onClick={handlePrev}
                aria-label={`Previous ${selectedView}`}
              >
                <ChevronLeft size={18} />
              </IconButton>
              <IconButton
                size="small"
                onClick={handleNext}
                aria-label={`Next ${selectedView}`}
              >
                <ChevronRight size={18} />
              </IconButton>
              <Typography variant="subtitle1" sx={{ minWidth: 200 }}>
                {formatHeaderDate(selectedDate, selectedView)}
              </Typography>
            </Box>

            <ToggleButtonGroup
              size="small"
              exclusive
              value={selectedView}
              aria-label="Calendar view"
              onChange={(_event, nextView) => {
                if (nextView) {
                  setSelectedView(nextView as CalendarView);
                }
              }}
              sx={{
                "& .MuiToggleButton-root": {
                  textTransform: "none",
                  px: 1.5,
                  py: 0.5,
                  fontSize: "0.75rem",
                  borderColor: "divider",
                  color: "text.secondary",
                },
                "& .MuiToggleButton-root.Mui-selected": {
                  bgcolor: "action.selected",
                  color: "text.primary",
                  fontWeight: 600,
                },
                "& .MuiToggleButton-root.Mui-selected:hover": {
                  bgcolor: "action.selected",
                },
              }}
            >
              {calendarViewOptions.map((option) => (
                <ToggleButton key={option.value} value={option.value}>
                  {option.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>

            <Box sx={{ flex: 1 }} />

            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <ButtonGroup
                variant="outlined"
                sx={{
                  borderRadius: 999,
                  "& .MuiButtonGroup-grouped": {
                    borderColor: "divider",
                  },
                  "& .MuiButtonGroup-firstButton": {
                    borderTopLeftRadius: 999,
                    borderBottomLeftRadius: 999,
                  },
                  "& .MuiButtonGroup-lastButton": {
                    borderTopRightRadius: 999,
                    borderBottomRightRadius: 999,
                  },
                }}
              >
                <Button
                  size="sm"
                  variant="secondary"
                  startIcon={<Mic size={16} />}
                  title="Send a voice note"
                >
                  Voice message
                </Button>
                <Button size="sm" variant="secondary" title="Search your calendar">
                  Search
                </Button>
                <Button size="sm" variant="secondary" title="Browse local events">
                  Local events
                </Button>
              </ButtonGroup>
              <Button size="sm" variant="secondary" onClick={() => navigate("/login")}>
                Log out
              </Button>
            </Box>
          </Toolbar>
        </AppBar>

        <Box sx={{ display: "flex", flex: 1, minHeight: 0, bgcolor: "background.default" }}>
          <CalendarSidebar />
          <Box component="main" sx={{ flex: 1, minWidth: 0, p: 2, overflowY: "auto" }}>
            <Outlet />
          </Box>
        </Box>

        {!isChatOpen && (
          <Tooltip title="Open AI chat" placement="left">
            <Fab
              color="primary"
              aria-label="Open AI chat"
              onClick={handleOpenChat}
              sx={{
                position: "fixed",
                right: 16,
                top: "50%",
                transform: "translateY(-50%)",
                zIndex: (theme) => theme.zIndex.drawer - 1,
              }}
            >
              <MessageCircle size={20} />
            </Fab>
          </Tooltip>
        )}

        <SidePanel
          isOpen={isChatOpen}
          onClose={handleCloseChat}
          title="AI chat"
          side="right"
        >
          {isChatOpen ? (
            <Suspense
              fallback={
                <Typography variant="body2" color="text.secondary">
                  Loading AI chat…
                </Typography>
              }
            >
              <LazyAiChatPanel />
            </Suspense>
          ) : null}
        </SidePanel>
      </Box>
    </CalendarProvider>
  );
}
