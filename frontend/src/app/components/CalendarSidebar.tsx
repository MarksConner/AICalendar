import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import Divider from "@mui/material/Divider";
import ListItemButton from "@mui/material/ListItemButton";
import Typography from "@mui/material/Typography";
import { useMatch, useResolvedPath, NavLink } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import { MiniMonth } from "./MiniMonth";
import { useCalendar } from "../contexts/CalendarContext";
import {
  CreateEventDialog,
  type CreateCalendarFormData,
  type CreateEventFormData,
} from "../components/CreateEventDialog";
import { Button } from "../design_system/components/ui/Button";
import IconButton from "@mui/material/IconButton";
import CalendarClient from "../api_client/CalendarClient";
import FileDownloadIcon from '@mui/icons-material/FileDownload';

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
  const { selectedDate, setSelectedDate, selectedCalendarId, setSelectedCalendarId, refreshEvents} = useCalendar();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [calendars, setCalendars] = useState<BackendCalendar[]>([]);

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
    localStorage.setItem("calendar_id",id)
    localStorage.removeItem("chat_id");
    localStorage.removeItem("chat_messages");
    console.log("Selected calendar_id stored:", id);
  };

  const handleCreateEvent = async (eventData: CreateEventFormData) => {
    const calendarClient = new CalendarClient();
    const response = await calendarClient.CreateEventAPI(eventData);
    const body = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(body?.detail || body?.message || "Failed to create event");
    }
    refreshEvents();
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
            {calendars.map((calendar) => {const isSelected = selectedCalendarId === calendar.calendar_id;
            return (
              <ListItemButton
                key={calendar.calendar_id}
                onClick={() => handleToggleCalendar(calendar.calendar_id)}
                selected={isSelected}
                disableRipple
                sx={{
                  borderRadius: 1,
                  px: 1.25,
                  py: 0.9,
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
                <Typography variant="body2">{calendar.calendar_name}</Typography>
                  <Button
                    sx={{
                      ml: "auto",
                      minWidth: 0,
                      px: 1,
                    }}
                    size="sm"
                    variant="ghost"
                    startIcon={<FileDownloadIcon />}
                    onClick={async () => {
                      if (!calendar.calendar_id) return;
                      const calendarClient = new CalendarClient();
                      const response = await calendarClient.exportCalendarAPI(calendar.calendar_id);
                      if (response.ok) {
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `calendar-${calendar.calendar_id}.ics`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                      } else {
                        console.error("Failed to export calendar");
                      }
                    }}>
                    Export
                    </Button>
                    <IconButton
                      size="small"
                      edge="end"
                      aria-label="delete calendar"
                      onClick={async (e) => {
                        e.stopPropagation();

                        const confirmed = window.confirm(
                          `Delete calendar "${calendar.calendar_name}"?`
                        );

                        if (!confirmed) return;

                        try {
                          const calendarClient = new CalendarClient();

                          const response = await calendarClient.deleteCalendarAPI(calendar.calendar_id);

                          const body = await response.json().catch(() => null);

                          if (!response.ok) {
                            throw new Error(
                              body?.detail || body?.message || "Failed to delete calendar"
                            );
                          }

                          const updatedCalendars = calendars.filter(
                            (c) => c.calendar_id !== calendar.calendar_id
                          );

                          setCalendars(updatedCalendars);

                          if (selectedCalendarId === calendar.calendar_id) {
                            const nextCalendar = updatedCalendars[0];

                            if (nextCalendar) {
                              setSelectedCalendarId(nextCalendar.calendar_id);
                              localStorage.setItem("calendar_id", nextCalendar.calendar_id);
                            } else {
                              setSelectedCalendarId("");
                              localStorage.removeItem("calendar_id");
                            }

                            localStorage.removeItem("chat_id");
                            localStorage.removeItem("chat_messages");
                          }
                        } catch (err) {
                          console.error("Failed to delete calendar", err);
                        }
                      }}
                      sx={{
                        ml: 0.5,
                        color: "text.secondary",
                        "&:hover": {
                          color: "error.main",
                        },
                      }}
                    >
                    <Trash2 size={16} />
                    </IconButton>
                    </ListItemButton>
            );
          })}
        </Box>
      </Box>

    </Box>
  );
};