import { useState } from "react";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import Divider from "@mui/material/Divider";
import ListItemButton from "@mui/material/ListItemButton";
import Typography from "@mui/material/Typography";
import { useMatch, useResolvedPath, NavLink } from "react-router-dom";
import { Plus } from "lucide-react";
import { MiniMonth } from "./MiniMonth";
import { useCalendar } from "../contexts/useCalendar";
import { Button } from "../design_system/components/ui/Button";

type CalendarToggle = {
  id: string;
  label: string;
  color: string;
};

const calendarToggles: CalendarToggle[] = [
  { id: "primary", label: "My calendar", color: "#1a73e8" },
  { id: "work", label: "Work", color: "#188038" },
  { id: "personal", label: "Personal", color: "#a142f4" },
];

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
  const [enabledCalendars, setEnabledCalendars] = useState(() =>
    new Set(calendarToggles.map((calendar) => calendar.id))
  );

  const handleToggleCalendar = (id: string) => {
    setEnabledCalendars((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
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
      >
        Create
      </Button>

      <MiniMonth selectedDate={selectedDate} onSelectDate={setSelectedDate} />

      <Divider />

      <Box>
        <Typography variant="caption" color="text.secondary">
          My calendars
        </Typography>
        <Box sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 0.5 }}>
          {calendarToggles.map((calendar) => (
            <Box
              key={calendar.id}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                px: 0.5,
              }}
            >
              <Checkbox
                size="small"
                checked={enabledCalendars.has(calendar.id)}
                onChange={() => handleToggleCalendar(calendar.id)}
                sx={{ p: 0.5 }}
              />
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  bgcolor: calendar.color,
                }}
              />
              <Typography variant="body2">{calendar.label}</Typography>
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
