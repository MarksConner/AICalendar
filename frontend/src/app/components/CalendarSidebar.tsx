import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import Divider from "@mui/material/Divider";
import ListItemButton from "@mui/material/ListItemButton";
import Typography from "@mui/material/Typography";
import { useMatch, useResolvedPath, NavLink } from "react-router-dom";
import { Plus } from "lucide-react";
import { MiniMonth } from "./MiniMonth";
import { useCalendar } from "../contexts/CalendarContext";
import {
  CreateEventDialog,
  type CreateCalendarFormData,
  type CreateEventFormData,
} from "../components/CreateEventDialog";
import { Button } from "../design_system/components/ui/Button";
import CalendarClient from "../api_client/CalendarClient";

type BackendCalendar = {
  calendar_id: string;
  calendar_name: string;
};

const SidebarLink = ({ to, label }: { to: string; label: string }) => {
  const resolved = useResolvedPath(to);
  const match = useMatch({ path: resolved.pathname, end: true });

  return (
    <ListItemButton
      component={NavLink}
      to={to}
      selected={Boolean(match)}
      disableRipple
      sx={{
        borderRadius: 1,
        px: 1.5,
        py: 1,
        fontSize: "0.875rem",
        color: "text.secondary",
        "&.Mui-selected": {
          bgcolor: "action.selected",
          color: "text.primary",
          fontWeight: 600,
        },
        "&.Mui-selected:hover": {
          bgcolor: "action.selected",
        },
        "&:hover": {
          bgcolor: "action.hover",
          color: "text.primary",
        },
      }}
    >
      {label}
    </ListItemButton>
  );
};

export const CalendarSidebar = () => {
  const { selectedDate, setSelectedDate } = useCalendar();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [calendars, setCalendars] = useState<BackendCalendar[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState(
    localStorage.getItem("calendar_id") || ""
  );

  useEffect(() => {
    const fetchCalendars = async () => {
      try {
        const calendarClient = new CalendarClient();
        const response = await calendarClient.getCalendarsAPI();
        const data = await response.json().catch(() => []);

        if (!response.ok) {
          console.error("Failed to fetch calendars");
          return;
        }

        setCalendars(data);

        if (data.length > 0) {
          const storedId = localStorage.getItem("calendar_id");
          const validStoredId = data.some(
            (calendar: BackendCalendar) => calendar.calendar_id === storedId
          );

          const defaultId = validStoredId ? storedId! : data[0].calendar_id;
          localStorage.setItem("calendar_id", defaultId);
          setSelectedCalendarId(defaultId);
        }
      } catch (err) {
        console.error("Failed to fetch calendars", err);
      }
    };

    fetchCalendars();
  }, []);

  const handleToggleCalendar = (id: string) => {
    setSelectedCalendarId(id);
    localStorage.setItem("calendar_id", id);
    console.log("Selected calendar_id stored:", id);
  };

  const handleCreateEvent = async (eventData: CreateEventFormData) => {
    const calendarClient = new CalendarClient();
    const response = await calendarClient.CreateEventAPI(eventData);
    const body = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(body?.detail || body?.message || "Failed to create event");
    }
  };

  const handleCreateCalendar = async (calendarData: CreateCalendarFormData) => {
    const calendarClient = new CalendarClient();
    const user_id = localStorage.getItem("user_id");

    if (!user_id) {
      throw new Error("User ID not found");
    }

    const response = await calendarClient.createCalendarAPI(
      calendarData.name,
      undefined,
      undefined
    );
    const body = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(body?.detail || body?.message || "Failed to create calendar");
    }

    const refreshResponse = await calendarClient.getCalendarsAPI();
    const refreshedData = await refreshResponse.json().catch(() => []);

    if (refreshResponse.ok) {
      setCalendars(refreshedData);

      if (refreshedData.length > 0) {
        const newestCalendar = refreshedData[refreshedData.length - 1];
        setSelectedCalendarId(newestCalendar.calendar_id);
        localStorage.setItem("calendar_id", newestCalendar.calendar_id);
      }
    }
  };

  return (
    <Box
      component="aside"
      sx={{
        width: 280,
        borderRight: 1,
        borderColor: "divider",
        p: 2,
        display: "flex",
        flexDirection: "column",
        gap: 2,
        bgcolor: "background.paper",
      }}
    >
      <Button
        fullWidth
        size="md"
        variant="primary"
        startIcon={<Plus size={16} />}
        onClick={() => setIsCreateOpen(true)}
      >
        Create
      </Button>

      <CreateEventDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmitCalendar={handleCreateCalendar}
        onSubmitEvent={handleCreateEvent}
      />

      <MiniMonth selectedDate={selectedDate} onSelectDate={setSelectedDate} />

      <Divider />

      <Box>
        <Typography variant="caption" color="text.secondary">
          My calendars
        </Typography>
        <Box sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 0.5 }}>
          {calendars.map((calendar) => (
            <Box
              key={calendar.calendar_id}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                px: 0.5,
              }}
            >
              <Checkbox
                size="small"
                checked={selectedCalendarId === calendar.calendar_id}
                onChange={() => handleToggleCalendar(calendar.calendar_id)}
                sx={{ p: 0.5 }}
              />
              <Typography variant="body2">{calendar.calendar_name}</Typography>
            </Box>
          ))}
        </Box>
      </Box>

      <Divider />

      <Box>
        <Typography variant="caption" color="text.secondary">
          Other
        </Typography>
        <Box sx={{ mt: 0.5 }}>
          <SidebarLink to="/proposals" label="Proposals" />
        </Box>
      </Box>
    </Box>
  );
};