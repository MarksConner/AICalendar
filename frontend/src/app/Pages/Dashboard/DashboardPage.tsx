import {
  Card,
  CardHeader,
  CardContent,
} from "../../design_system/components/ui/Card";
import { Badge } from "../../design_system/components/ui/Badge";
import { CalendarMonth } from "./CalendarMonth";
import type { CalendarEvent } from "./CalendarMonth";

export const DashboardPage = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
      </div>

      <CardContent>
    <CalendarMonth year={2025} month={2} events={mockEvents} />
  </CardContent>
    </div>
  );
};
const mockEvents: CalendarEvent[] = [
  { id: "1", date: "2025-03-03", title: "Project standup" },
  { id: "2", date: "2025-03-03", title: "Gym" },
  { id: "3", date: "2025-03-15", title: "Dentist appointment" },
  { id: "4", date: "2025-03-21", title: "CS 425 group meeting" },
];