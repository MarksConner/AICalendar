import type { CalendarEvent } from "../Types/Calendar";

const MOCK_EVENTS: CalendarEvent[] = [
  { id: "1", date: "2025-03-03", title: "Project standup" },
  { id: "2", date: "2025-03-03", title: "Gym" },
  { id: "3", date: "2025-03-15", title: "Dentist appointment" },
  { id: "4", date: "2025-03-21", title: "CS 425 group meeting" },
  { id: "5", date: "2025-03-01", title: "Testy test"}
];

export async function fetchMonthEvents(
  year: number,
  month: number
): Promise<CalendarEvent[]> {
  await new Promise((r) => setTimeout(r, 300)); // fake latency for flow
  return MOCK_EVENTS; // Planned for later: filter by year/month or call backend
}