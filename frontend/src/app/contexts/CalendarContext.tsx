import type { ReactNode } from "react";
import type { CalendarContextValue } from "./calendarState";
import { CalendarContext } from "./calendarState";

export const CalendarProvider = ({
  value,
  children,
}: {
  value: CalendarContextValue;
  children: ReactNode;
}) => {
  return <CalendarContext.Provider value={value}>{children}</CalendarContext.Provider>;
};
