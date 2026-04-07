import type { CalendarEvent } from "../Types/Calendar";

const MOCK_EVENTS: CalendarEvent[] = [
  {
    id: "1",
    name: "Project standup",
    start: "2025-03-03T09:00:00",
    end: "2025-03-03T09:30:00",
    priority: 0,
    flexible: false,
    travel_time_min: 0,
  },
  {
    id: "2",
    name: "Gym",
    start: "2025-03-03T17:00:00",
    end: "2025-03-03T18:00:00",
    priority: 0,
    flexible: true,
    travel_time_min: 10,
  },
  {
    id: "3",
    name: "Dentist appointment",
    start: "2025-03-15T10:00:00",
    end: "2025-03-15T11:00:00",
    priority: 1,
    flexible: false,
    travel_time_min: 15,
  },
  {
    id: "4",
    name: "CS 425 group meeting",
    start: "2025-03-21T14:00:00",
    end: "2025-03-21T15:30:00",
    priority: 1,
    flexible: false,
    travel_time_min: 0,
  },
  {
    id: "5",
    name: "Testy test",
    start: "2025-03-01T08:00:00",
    end: "2025-03-01T09:00:00",
    priority: 0,
    flexible: false,
    travel_time_min: 0,
  },
];

export async function fetchMonthEvents(
  year: number,
  month: number // 0-based
): Promise<CalendarEvent[]> {
  await new Promise((r) => setTimeout(r, 300));
  const targetMonth = month + 1;
  return MOCK_EVENTS.filter((event) => {
    const datePart = event.start.substring(0, 10);
    const [eventYear, eventMonth] = datePart.split("-").map(Number);
    return eventYear === year && eventMonth === targetMonth;
  });
}
