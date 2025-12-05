import {
  Card,
  CardHeader,
  CardContent,
} from "../../design_system/components/ui/Card";
import { Badge } from "../../design_system/components/ui/Badge";
import { useState, useEffect } from "react";
import { CalendarMonth } from "./CalendarMonth";
import type { CalendarEvent } from "../../Types/Calendar";
import { fetchMonthEvents } from "../../api/calendar";

export const DashboardPage = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const year = 2025;
    const month = 2; // March, 0-based

    fetchMonthEvents(year, month)
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
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-h2">Calendar overview</h2>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <p className="text-body text-muted">Loading calendar…</p>
          )}
          {error && (
            <p className="text-body text-destructive">{error}</p>
          )}
          {!isLoading && !error && (
            <CalendarMonth year={2025} month={2} events={events} />
          )}
        </CardContent>
      </Card>
    </div>
  );
};
