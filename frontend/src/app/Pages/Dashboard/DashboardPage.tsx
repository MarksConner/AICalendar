import {
  Card,
  CardHeader,
  CardContent,
} from "../../design_system/components/ui/Card";
import { useState, useEffect } from "react";
import { CalendarMonth } from "./CalendarMonth";
import type { CalendarEvent } from "../../Types/Calendar";
import { dataService } from "../../services";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

export const DashboardPage = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const year = 2025;
    const month = 2; // March, 0-based

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

  return (
    <Stack spacing={2}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Typography variant="h5" fontWeight={600}>
          Dashboard
        </Typography>
      </Box>

      <Card>
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
    </Stack>
  );
};
