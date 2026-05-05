/* This file handles a lot of the main dashboard rendering and fetching for data between the various components 
via the top-level layout wrapper
Written by: Byron Billy
FRs this file handles: 3, 5, 11, 16, 17, 19 */ 
import { Outlet, useNavigate, useSearchParams } from "react-router-dom";
import AppBar from "@mui/material/AppBar";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import ButtonGroup from "@mui/material/ButtonGroup";
import Divider from "@mui/material/Divider";
import Fab from "@mui/material/Fab";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Switch from "@mui/material/Switch";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Toolbar from "@mui/material/Toolbar";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { clearAuthStorage } from "./services/auth/sessionTimeout";
import { tryRefreshAccessToken } from "./services/adapters/http/httpClient";
import { Button } from "./design_system/components/ui/Button";
import { SidePanel } from "./design_system/components/ui/SidePanel";
import { CalendarSidebar } from "./components/CalendarSidebar";
import { LocalEventsPanel } from "./Pages/TodaysPlan/LocalEventsPanel";
import { CalendarProvider } from "./contexts/CalendarContext";
import { useThemeMode } from "./contexts/ThemeContext";
import type { CalendarView } from "./contexts/calendarState";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LogOut,
  MessageCircle,
  Moon,
} from "lucide-react";
import Auth from "./api_client/Auth";
import LoginClient from "./api_client/Auth";

const calendarViewOptions: Array<{ value: CalendarView; label: string }> = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

const isCalendarView = (value: string | null): value is CalendarView => //ensure a raw url string is valid CalendarView
  value === "day" || value === "week" || value === "month";

const parseCalendarView = (value: string | null): CalendarView =>
  isCalendarView(value) ? value : "day";

const toDateParam = (date: Date) => {   //normalized YYYY-DD-MM URL parameters 
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

const startOfWeek = (date: Date) => addDays(date, -date.getDay());   //QOL line that starts the Views on every Sunday

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

const shiftDateByView = (date: Date, view: CalendarView, direction: -1 | 1) => { // moves the date forward or backward on each View
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

/* optimizing so the AI chat window doesn't open load until clicked on */
const LazyAiChatPanel = lazy(() =>
  import("./components/AiChatPanel").then((module) => ({
    default: module.AiChatPanel,
  }))
);

export function AppShell() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isLocalEventsOpen, setIsLocalEventsOpen] = useState(false);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string | null>(
    () => localStorage.getItem("calendar_id") || null
  );
  const [eventsRefreshKey, setEventsRefreshKey] = useState(0); //handles a refresh for Events
  const refreshEvents = useCallback(() => {
    setEventsRefreshKey((prev) => prev + 1);
  }, []);

  const selectedDate = useMemo(
    () => parseDateParam(searchParams.get("date")) ?? new Date(),
    [searchParams]
  );
  const selectedView = useMemo(
    () => parseCalendarView(searchParams.get("view")),
    [searchParams]
  );

  /* Normalizaes URL parameters, sets defaults if day or view are not inputted correctly */
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

  /* refreshes when tab is focused on again */
  useEffect(() => {
    const refreshOnReturn = () => {
      const refreshToken = localStorage.getItem("refresh_token");
      const accessToken = localStorage.getItem("access_token");

      if (!refreshToken || !accessToken) {
        return;
      }

      void tryRefreshAccessToken();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshOnReturn();
      }
    };

    window.addEventListener("focus", refreshOnReturn);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", refreshOnReturn);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

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

  const { mode, toggleMode } = useThemeMode();
  const userId = localStorage.getItem("user_id") ?? "Unknown user";
  const [username, setUsername] = useState("Unknown user");

useEffect(() => {
  const fetchUsername = async () => {
    if (!userId) {
      setUsername("Unknown user");
      return;
    }
  try {
      const token = localStorage.getItem("access_token") ?? "";
      const loginClient = new LoginClient();
      const result: any = await loginClient.getUserName(userId, token);

      if (result instanceof Response) {
        const body = await result.json().catch(() => null);
        setUsername(body?.username ?? body?.user_name ?? body?.email ?? userId);
      } else if (typeof result === "string") {
        setUsername(result);
      } else {
        setUsername(result?.username ?? result?.user_name ?? result?.email ?? userId);
      }
    } catch (err) {
      console.error("Failed to fetch username", err);
      setUsername(userId);
    }
  };
  fetchUsername();
}, [userId]);

const userInitial = username.charAt(0).toUpperCase();
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const isMenuOpen = Boolean(menuAnchor);
  const handleOpenMenu = (e: React.MouseEvent<HTMLElement>) => setMenuAnchor(e.currentTarget);
  const handleCloseMenu = () => setMenuAnchor(null);

  const handleLogout = () => {
    clearAuthStorage();
    setSelectedCalendarId(null);
    navigate("/", { replace: true });
  };


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
      eventsRefreshKey,
      refreshEvents,
      
    }),
    [selectedDate, setSelectedDate, selectedView, setSelectedView, navigateToDay, selectedCalendarId, handleSetSelectedCalendarId, eventsRefreshKey, refreshEvents]
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
                  title="Browse local events"
                  onClick={() => setIsLocalEventsOpen(true)}
                >
                  Local events
                </Button>
              </ButtonGroup>
              <Tooltip title="Account">
                <IconButton onClick={handleOpenMenu} size="small">
                  <Avatar sx={{ width: 32, height: 32, bgcolor: "primary.main", fontSize: "0.875rem" }}>
                    {userInitial}
                  </Avatar>
                </IconButton>
              </Tooltip>

              <Menu
                anchorEl={menuAnchor}
                open={isMenuOpen}
                onClose={handleCloseMenu}
                transformOrigin={{ horizontal: "right", vertical: "top" }}
                anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
                slotProps={{ paper: { sx: { mt: 1, minWidth: 220 } } }}
              >
                {/* User info */}
                <Box sx={{ px: 2, py: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">Signed in as</Typography>
                  <Typography variant="body2" fontWeight={600} noWrap>{username}</Typography>
                </Box>

                <Divider />

                {/* Dark mode toggle */}
                <MenuItem onClick={toggleMode} disableRipple>
                  <ListItemIcon><Moon size={16} /></ListItemIcon>
                  <Typography variant="body2" sx={{ flex: 1 }}>Dark mode</Typography>
                  <Switch size="small" checked={mode === "dark"} onChange={toggleMode} onClick={(e) => e.stopPropagation()} />
                </MenuItem>

                <Divider />

                {/* Log out */}
                <MenuItem onClick={() => { handleCloseMenu(); handleLogout(); }}>
                  <ListItemIcon><LogOut size={16} /></ListItemIcon>
                  <Typography variant="body2">Log out</Typography>
                </MenuItem>
              </Menu>
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

        {/* Local Events panel — opened from the app bar "Local events" button */}
        <LocalEventsPanel
          isOpen={isLocalEventsOpen}
          onClose={() => setIsLocalEventsOpen(false)}
        />
      </Box>
    </CalendarProvider>
  );
}
