/* File that handles the MiniCalendar on the left-side panel. Also Create button logic and multi-schedule toggles for viewing
and import/export + publishing
Written by: Byron Billy and Luis Perdomo
FRs: 7, 8, 11, 16, 28 and 29 UC: 6 and 7 */
import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import ListItemButton from "@mui/material/ListItemButton";
import Typography from "@mui/material/Typography";
import { Download, Plus, Trash2 } from "lucide-react";
import { MiniMonth } from "./MiniMonth";
import { useCalendar } from "../contexts/CalendarContext";
import {CreateEventDialog,type CreateCalendarFormData, type CreateEventFormData,} from "../components/CreateEventDialog";
import { Button } from "../design_system/components/ui/Button";
import IconButton from "@mui/material/IconButton";
import CalendarClient from "../api_client/CalendarClient";
import RemoveRedEyeIcon from '@mui/icons-material/RemoveRedEye';
import {DialogBoxInterface} from "./DialogBoxInterface";

type BackendCalendar = {
  calendar_id: string;
  calendar_name: string;
  public_token?: string | null;
  is_public?: boolean;
};

export const CalendarSidebar = () => {
  const { selectedDate, setSelectedDate, selectedCalendarId, setSelectedCalendarId, refreshEvents} = useCalendar();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [calendars, setCalendars] = useState<BackendCalendar[]>([]);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [calendarToDelete, setCalendarToDelete] = useState<BackendCalendar | null>(null);

  // Two separate dialogs for publishing: one to confirm the action, one to display the resulting link
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);
  const [calendarToPublish, setCalendarToPublish] = useState<BackendCalendar | null>(null);
  const [displayPublishedCalendarLink, setDisplayPublishedCalendarLink] = useState(false);
  const [publishedCalendarLink, setPublishedCalendarLink] = useState("");

  /* On mount: fetches the user's calendars and restores the last selected one from localStorage,
  falling back to the first calendar if the stored ID is no longer valid */
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

  // Switching calendars clears chat state since chat history is scoped to a specific calendar
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

  // After creation, re-fetches the full list and auto-selects the newest calendar
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

  /* After deletion, falls back to the first remaining calendar (or clears selection if none left)
  and clears chat state since the chat was scoped to the deleted calendar */
  const handleDeleteCalendar = async () => {
    if (!calendarToDelete) return;

    try {
      const calendarClient = new CalendarClient();

      const response = await calendarClient.deleteCalendarAPI(calendarToDelete.calendar_id);

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          body?.detail || body?.message || "Failed to delete calendar"
        );
      }

      const updatedCalendars = calendars.filter(
        (c) => c.calendar_id !== calendarToDelete.calendar_id
      );

      setCalendars(updatedCalendars);

      if (selectedCalendarId === calendarToDelete.calendar_id) {
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

      setIsDeleteDialogOpen(false);
      setCalendarToDelete(null);
    } catch (err) {
      console.error("Failed to delete calendar", err);
    }
  };

  /* Publishes the calendar, builds a public URL from the returned token, updates local state,
  then attempts to copy the link to the clipboard automatically */
  const handlePublishCalendar = async () => {
    if (!calendarToPublish) return;

    try {
      const calendarClient = new CalendarClient();
      const response = await calendarClient.publishCalendar(calendarToPublish.calendar_id);
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(body?.detail || body?.message || "Failed to publish calendar");
      }

      const publicLink = `${window.location.origin}/public-calendar/${body.public_token}`;
      setPublishedCalendarLink(publicLink);

      setCalendars((prev) =>
        prev.map((calendar) =>
          calendar.calendar_id === calendarToPublish.calendar_id
            ? {
                ...calendar,
                public_token: body.public_token,
                is_public: true,
              }
            : calendar
        )
      );

      try {
        await navigator.clipboard.writeText(publicLink);
      } catch (err) {
        console.error("Failed to copy public calendar link", err);
      }

      setIsPublishDialogOpen(false);
      setDisplayPublishedCalendarLink(true);
    } catch (err) {
      console.error("Failed to publish calendar", err);
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
            {calendars.map((calendar) => {
            const isSelected = selectedCalendarId === calendar.calendar_id;
            const isPublic = calendar.is_public === true;
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
                    startIcon={<Download size={16} />}
                    onClick={async (e) => {
                      // Creates a temporary anchor element to trigger an .ics file download, then removes it
                      e.stopPropagation();

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
                      aria-label="publish calendar"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCalendarToPublish(calendar);
                        setIsPublishDialogOpen(true);
                      }}
                      sx={{
                        ml: 0.5,
                        // Icon turns red when the calendar is already public to indicate its current status
                        color: isPublic ? "error.main" : "text.secondary",
                        "&:hover": {
                          color: isPublic ? "error.dark" : "primary.main",
                        },
                      }}
                    >
                    <RemoveRedEyeIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      edge="end"
                      aria-label="delete calendar"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCalendarToDelete(calendar);
                        setIsDeleteDialogOpen(true);
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

      <DialogBoxInterface
        open={isPublishDialogOpen}
        title="Publish Calendar"
        content={<>Are you sure you want to publish the calendar "{calendarToPublish?.calendar_name}"? This action will make it visible to others.</>}
        onClose={() => {setIsPublishDialogOpen(false);setCalendarToPublish(null);}}
        actions={<>
            <Button
              variant="ghost"
              onClick={() => {
                setIsPublishDialogOpen(false);
                setCalendarToPublish(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handlePublishCalendar}
            >
              Publish 
            </Button>
          </>
        }
      />

      <DialogBoxInterface
        open={displayPublishedCalendarLink}
        title="Calendar Published"
        content={
          <>
            Calendar published successfully. Save this link and share it with others to view your calendar and book appointments.
            To create appointments, ask our AI assistant to create bookable events!
            <br />
            <br />
            Link: {publishedCalendarLink}
          </>
        }
        onClose={() => {
          setDisplayPublishedCalendarLink(false);
          setCalendarToPublish(null);
          setPublishedCalendarLink("");
        }}
        actions={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setDisplayPublishedCalendarLink(false);
                setCalendarToPublish(null);
                setPublishedCalendarLink("");
              }}
            >
              Close
            </Button>
          </>
        }
      />
      
      <DialogBoxInterface
        open={isDeleteDialogOpen}
        title="Delete Calendar"
        content={
          <>
            Are you sure you want to delete the calendar "{calendarToDelete?.calendar_name}"? You won't be able to recover it.
          </>
        }
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setCalendarToDelete(null);
        }}
        actions={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setCalendarToDelete(null);
              }}
            >
              Cancel
            </Button>

            <Button
              variant="primary"
              onClick={handleDeleteCalendar}
            >
              Delete
            </Button>
            
          </>
          
        }
      />
      
    </Box>
    
  );
};