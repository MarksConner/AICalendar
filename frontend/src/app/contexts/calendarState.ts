import { createContext } from "react";

export type CalendarView = "day" | "week" | "month";

export type CalendarContextValue = {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  selectedView: CalendarView;
  setSelectedView: (view: CalendarView) => void;
  navigateToDay: (date: Date) => void;
  selectedCalendarId: string | null;
  setSelectedCalendarId: (id: string) => void;
};

export const CalendarContext = createContext<CalendarContextValue | null>(null);
