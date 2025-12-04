export interface CalendarEvent {
  id: string;
  date: string; // "YYYY-MM-DD"
  title: string;
}

interface CalendarMonthProps {
  year: number;
  month: number; // 0 = Jan, 11 = Dec
  events?: CalendarEvent[];
}

export function CalendarMonth({ year, month, events = [] }: CalendarMonthProps) {
  const today = new Date();
  const isTodayMonth =
    today.getFullYear() === year && today.getMonth() === month;

  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const cells = Array.from({ length: 42 }, (_, index) => {
    const dayNumber = index - startOffset + 1;
    const inCurrentMonth = dayNumber >= 1 && dayNumber <= daysInMonth;

    let dateKey: string | null = null;
    if (inCurrentMonth) {
      const mm = String(month + 1).padStart(2, "0");
      const dd = String(dayNumber).padStart(2, "0");
      dateKey = `${year}-${mm}-${dd}`;
    }

    const dayEvents =
      dateKey === null
        ? []
        : events.filter((evt) => evt.date === dateKey).slice(0, 3);

    const isToday =
      inCurrentMonth &&
      isTodayMonth &&
      today.getDate() === dayNumber;

    return {
      index,
      dayNumber: inCurrentMonth ? dayNumber : null,
      inCurrentMonth,
      isToday,
      events: dayEvents,
    };
  });

  const monthLabel = new Date(year, month, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="calendar-month">
      <div className="calendar-month-header">
        <div className="calendar-month-title">{monthLabel}</div>
      </div>

      <div className="calendar-month-weekdays">
        {dayNames.map((name) => (
          <div key={name} className="calendar-month-weekday">
            {name}
          </div>
        ))}
      </div>

      <div className="calendar-month-grid">
        {cells.map((cell) => (
          <div
            key={cell.index}
            className={[
              "calendar-month-cell",
              !cell.inCurrentMonth ? "calendar-month-cell-outside" : "",
              cell.isToday ? "calendar-month-cell-today" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {cell.dayNumber !== null && (
              <>
                <div className="calendar-month-cell-date">
                  {cell.dayNumber}
                </div>
                <div className="calendar-month-events">
                  {cell.events.map((evt) => (
                    <div
                      key={evt.id}
                      className="calendar-month-event"
                      title={evt.title}
                    >
                      • {evt.title}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}