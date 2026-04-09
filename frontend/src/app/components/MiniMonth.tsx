import { useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { ChevronLeft, ChevronRight } from "lucide-react";

type MiniMonthProps = {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
};

const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const getMonthStart = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), 1);

export const MiniMonth = ({ selectedDate, onSelectDate }: MiniMonthProps) => {
  const [visibleMonth, setVisibleMonth] = useState(() =>
    getMonthStart(selectedDate)
  );

  useEffect(() => {
    setVisibleMonth(getMonthStart(selectedDate));
  }, [selectedDate]);

  const { cells, monthLabel } = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const items = Array.from({ length: 42 }, (_, index) => {
      const dayNumber = index - startOffset + 1;
      const inCurrentMonth = dayNumber >= 1 && dayNumber <= daysInMonth;
      const date = inCurrentMonth ? new Date(year, month, dayNumber) : null;

      return {
        key: `${year}-${month}-${index}`,
        date,
        label: inCurrentMonth ? String(dayNumber) : "",
      };
    });

    const label = visibleMonth.toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    });

    return { cells: items, monthLabel: label };
  }, [visibleMonth]);

  const handlePrevMonth = () =>
    setVisibleMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
    );

  const handleNextMonth = () =>
    setVisibleMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
    );

  const today = new Date();

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 1,
        }}
      >
        <Typography variant="subtitle2" fontWeight={600}>
          {monthLabel}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Tooltip title="Previous month">
            <IconButton size="small" onClick={handlePrevMonth}>
              <ChevronLeft size={16} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Next month">
            <IconButton size="small" onClick={handleNextMonth}>
              <ChevronRight size={16} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 0.5,
          mb: 0.5,
        }}
      >
        {dayLabels.map((label) => (
          <Typography
            key={label}
            variant="caption"
            color="text.secondary"
            align="center"
          >
            {label}
          </Typography>
        ))}
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 0.5,
        }}
      >
        {cells.map((cell) => {
          if (!cell.date) {
            return <Box key={cell.key} sx={{ height: 28 }} />;
          }

          const cellDate = cell.date;
          const isSelected = isSameDay(cellDate, selectedDate);
          const isToday = isSameDay(cellDate, today);

          return (
            <ButtonBase
              key={cell.key}
              onClick={() => onSelectDate(cellDate)}
              sx={{
                height: 28,
                borderRadius: 1,
                fontSize: "0.75rem",
                fontWeight: isSelected ? 600 : 500,
                color: isSelected
                  ? "primary.contrastText"
                  : isToday
                  ? "primary.main"
                  : "text.primary",
                bgcolor: isSelected ? "primary.main" : "transparent",
                border: isToday && !isSelected ? "1px solid" : "1px solid transparent",
                borderColor: isToday && !isSelected ? "primary.main" : "transparent",
                "&:hover": {
                  bgcolor: isSelected ? "primary.dark" : "action.hover",
                },
              }}
            >
              {cell.label}
            </ButtonBase>
          );
        })}
      </Box>
    </Box>
  );
};
