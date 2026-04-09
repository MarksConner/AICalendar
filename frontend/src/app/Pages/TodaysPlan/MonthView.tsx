import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import {
  Card,
  CardContent,
  CardHeader,
} from "../../design_system/components/ui/Card";
import { dataService } from "../../services";
import type { CalendarEvent } from "../../Types/Calendar";
import { CalendarMonth } from "../Dashboard/CalendarMonth";

type MonthViewProps = {
  selectedDate: Date;
  onDayClick: (date: Date) => void;
};

export function MonthView({ selectedDate, onDayClick }: MonthViewProps) {
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth(); // 0-based

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    dataService
      .fetchMonthEvents(year, month)
      .then((data) => {
        if (cancelled) return;
        setEvents(data);
        setIsLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Could not load calendar events.");
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [year, month]);

  const monthLabel = new Date(year, month, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <Card>
      <CardHeader>
        <Typography variant="h6" fontWeight={600}>
          {monthLabel}
        </Typography>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CircularProgress size={14} />
            <Typography variant="body2" color="text.secondary">
              Loading calendar…
            </Typography>
          </Box>
        )}
        {error && (
          <Typography variant="body2" color="error">
            {error}
          </Typography>
        )}
        {!isLoading && !error && (
          <CalendarMonth
            year={year}
            month={month}
            events={events}
            onDayClick={onDayClick}
          />
        )}
      </CardContent>
    </Card>
  );
}
