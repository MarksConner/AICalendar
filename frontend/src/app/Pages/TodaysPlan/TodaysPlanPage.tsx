import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useCallback } from "react";
import { Banner } from "../../design_system/components/ui/Banner";
import { useCalendar } from "../../contexts/useCalendar";
import type { CalendarView } from "../../contexts/calendarState";
import { AddTaskModal } from "./AddTaskModal";
import { AiSuggestionsPanel } from "./AiSuggestionsPanel";
import { DayGrid } from "./DayGrid";
import { EventDetailsDialog } from "./EventDetailsDialog";
import { MonthView } from "./MonthView";
import { WeekGrid } from "./WeekGrid";
import { useDayPlanner } from "./useDayPlanner";
import { useEventLocation } from "../../hooks/useEventLocation";

// ── helpers ──────────────────────────────────────────────────────────────────

const getWeekStart = (date: Date): Date => {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
};

const addDays = (date: Date, n: number): Date => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};

const getPageTitle = (
  view: CalendarView,
  date: Date,
  isToday: boolean,
  dateLabel: string
): string => {
  if (view === "day") return isToday ? "Today" : dateLabel;
  if (view === "week") {
    const wStart = getWeekStart(date);
    const wEnd = addDays(wStart, 6);
    const start = wStart.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const end = wEnd.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return `${start} – ${end}`;
  }
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
};

const getPageSubtitle = (view: CalendarView, isToday: boolean, dateLabel: string): string => {
  if (view === "day") {
    return isToday
      ? "A timeline of your day with AI-powered insights."
      : `Events scheduled for ${dateLabel}.`;
  }
  if (view === "week") return "Click any day column header to open it in day view.";
  return "Click a day to open it in day view.";
};

// ── component ─────────────────────────────────────────────────────────────────

export const TodaysPlanPage = () => {
  const { selectedDate, selectedView, navigateToDay } = useCalendar();
  const planner = useDayPlanner({ selectedDate, selectedView });
  const eventLocation = useEventLocation(planner.selectedEvent, planner.isEventDetailsOpen);

  const handleNavigateToDay = useCallback(
    (date: Date) => {
      navigateToDay(date);
    },
    [navigateToDay]
  );

  const pageTitle = getPageTitle(
    selectedView,
    selectedDate,
    planner.isToday,
    planner.dateLabel
  );
  const pageSubtitle = getPageSubtitle(selectedView, planner.isToday, planner.dateLabel);

  return (
    <Stack
      spacing={2}
      sx={{ maxWidth: selectedView === "month" ? 900 : "100%" }}
    >
      {/* Page header */}
      <Box>
        <Typography variant="h5" fontWeight={600}>
          {pageTitle}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {pageSubtitle}
        </Typography>
      </Box>

      {planner.persistError && (
        <Banner
          variant="error"
          title="Could not save changes"
          message={planner.persistError}
        />
      )}

      {/* Day view — grid + AI suggestions side by side */}
      {selectedView === "day" && (
        <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
          <Box sx={{ flex: 1, minWidth: 0, maxWidth: 672 }}>
            <DayGrid
              dayGridScrollRef={planner.dayGridScrollRef}
              error={planner.error}
              hours={planner.hours}
              interactionState={planner.interactionState}
              isCreatingEvent={planner.isCreatingEvent}
              isLoading={planner.isLoading}
              isToday={planner.isToday}
              itemsCount={planner.items.length}
              nowMinutes={planner.nowMinutes}
              onOpenAdd={planner.handleOpenAdd}
              onOpenEvent={planner.handleOpenEventDetails}
              onStartInteraction={planner.startEventInteraction}
              positionedItems={planner.positionedItems}
              savingEventIds={planner.savingEventIds}
            />
          </Box>
          <AiSuggestionsPanel date={selectedDate} items={planner.items} />
        </Box>
      )}

      {/* Week view */}
      {selectedView === "week" && (
        <WeekGrid
          selectedDate={selectedDate}
          onNavigateToDay={handleNavigateToDay}
        />
      )}

      {/* Month view */}
      {selectedView === "month" && (
        <MonthView
          selectedDate={selectedDate}
          onDayClick={handleNavigateToDay}
        />
      )}

      {/* Event detail + add-task modals (available in all views) */}
      <EventDetailsDialog
        isOpen={planner.isEventDetailsOpen}
        event={planner.selectedEvent}
        isEditing={planner.isEditingEvent}
        isSaving={planner.isSelectedEventSaving}
        editDescription={planner.editDescription}
        editEndTime={planner.editEndTime}
        editError={planner.eventEditError}
        editLocation={planner.editLocation}
        editStartTime={planner.editStartTime}
        editTitle={planner.editTitle}
        onClose={planner.handleCloseEventDetails}
        onCancelEdit={planner.handleCancelEventEdit}
        onDelete={planner.handleDeleteEvent}
        onEdit={planner.handleStartEventEdit}
        onSaveEdit={planner.handleSaveEventEdit}
        onSetEditDescription={planner.setEditDescription}
        onSetEditEndTime={planner.setEditEndTime}
        onSetEditLocation={planner.setEditLocation}
        onSetEditStartTime={planner.setEditStartTime}
        onSetEditTitle={planner.setEditTitle}
        eventLat={eventLocation.eventLat}
        eventLng={eventLocation.eventLng}
        travelTimeMin={eventLocation.travelTimeMin}
        isTravelLoading={eventLocation.isLoading}
      />

      <AddTaskModal
        addTaskError={planner.addTaskError}
        hintError={planner.hintError}
        isCreatingEvent={planner.isCreatingEvent}
        isLoadingHints={planner.isLoadingHints}
        isOpen={planner.isAddOpen}
        newDescription={planner.newDescription}
        newLocation={planner.newLocation}
        newTime={planner.newTime}
        newTitle={planner.newTitle}
        onClose={planner.handleCloseAdd}
        onDescriptionChange={planner.setNewDescription}
        onLocationChange={planner.setNewLocation}
        onSave={planner.handleAddTask}
        onTimeChange={planner.setNewTime}
        onTitleChange={planner.setNewTitle}
        schedulingHints={planner.schedulingHints}
      />

    </Stack>
  );
};
