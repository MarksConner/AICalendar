/* Helper functions all dealing daily timeline and Events rendered on the timeline
Written by: Byron Billy
FRs: All that deal with daily timeline and adding, editing and deleting Events on the timeline */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { DailyTimelineItem } from "../../Types/Calendar";
import { dataService } from "../../services";
import type { DaySchedulingHints } from "../../services";
import type { CalendarView } from "../../contexts/calendarState";
import { useCalendar } from "../../contexts/useCalendar";
import {
  buildPositionedEvents,
  DEFAULT_DURATION_MINUTES,
  extractTimeHHMM,
  getCurrentMinutes,
  HOUR_ROW_HEIGHT,
  HOURS_IN_DAY,
  MIN_DURATION_MINUTES,
  minutesToTimeString,
  parseTimeToMinutes,
  roundMinutesToStep,
  toISODateTime,
} from "./dayPlannerUtils";
import type {
  EventInteractionState,
  EventTimeDraft,
  InteractionMode,
  PositionedEvent,
} from "./dayPlannerUtils";

type UseDayPlannerArgs = {
  selectedDate: Date;
  selectedView: CalendarView;
};

// ISO datetime strings are lexicographically sortable, so string comparison works correctly here
const sortItemsByStart = (items: DailyTimelineItem[]) =>
  [...items].sort((a, b) => a.start.localeCompare(b.start));

export function useDayPlanner({ selectedDate, selectedView }: UseDayPlannerArgs) {
  const { selectedCalendarId, eventsRefreshKey} = useCalendar();
  const [items, setItems] = useState<DailyTimelineItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [addTaskError, setAddTaskError] = useState<string | null>(null);
  const [hintError, setHintError] = useState<string | null>(null);
  const [persistError, setPersistError] = useState<string | null>(null);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [isLoadingHints, setIsLoadingHints] = useState(false);
  const [isEventDetailsOpen, setIsEventDetailsOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [eventEditError, setEventEditError] = useState<string | null>(null);
  const [schedulingHints, setSchedulingHints] =
    useState<DaySchedulingHints | null>(null);
  const [nowMinutes, setNowMinutes] = useState(() => getCurrentMinutes());
  const [eventTimeDrafts, setEventTimeDrafts] = useState<
    Record<string, EventTimeDraft>
  >({});
  const [interactionState, setInteractionState] =
    useState<EventInteractionState | null>(null);
  const [savingEventIds, setSavingEventIds] = useState<string[]>([]);
  const dayGridScrollRef = useRef<HTMLDivElement | null>(null);
  // Ref mirror of eventTimeDrafts so pointer handlers can read the latest draft without stale closures
  const eventTimeDraftsRef = useRef<Record<string, EventTimeDraft>>({});
  // Prevents the event detail panel from opening after a drag or resize completes
  const suppressOpenRef = useRef(false);
  // Tracks the visible date so async responses arriving after navigation are discarded
  const selectedDateKeyRef = useRef(selectedDate.toDateString());

  const dateLabel = selectedDate.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const isToday = selectedDate.toDateString() === new Date().toDateString();

  // Keeps the ref in sync with state so pointer event handlers always read the latest drafts
  useEffect(() => {
    eventTimeDraftsRef.current = eventTimeDrafts;
  }, [eventTimeDrafts]);

  // Keeps the ref in sync so stale date checks in async callbacks stay accurate
  useEffect(() => {
    selectedDateKeyRef.current = selectedDate.toDateString();
  }, [selectedDate]);

  useEffect(() => {
    if (!selectedCalendarId) {
      setItems([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    dataService
      .fetchDayTimeline(selectedDate, selectedCalendarId)
      .then((data) => {
        setItems(data);
        setIsLoading(false);
        setPersistError(null);
      })
      .catch(() => {
        setError("Could not load events for this day.");
        setIsLoading(false);
      });
  }, [selectedCalendarId, selectedDate, eventsRefreshKey]);

  // Clears all drag/resize state when the user navigates to a different date
  useEffect(() => {
    setInteractionState(null);
    setEventTimeDrafts({});
    setSavingEventIds([]);
  }, [selectedDate]);

  /* Debounces hints fetch by 180ms so a request isn't fired on every keystroke;
  cancels in-flight requests if the time changes or the modal closes before they resolve */
  useEffect(() => {
    if (!isAddOpen) {
      setIsLoadingHints(false);
      setHintError(null);
      setSchedulingHints(null);
      return;
    }

    const parsedStart = parseTimeToMinutes(newTime);
    if (parsedStart === null) {
      setIsLoadingHints(false);
      setHintError(null);
      setSchedulingHints(null);
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      if (!selectedCalendarId) {
        setHintError("Select a calendar first.");
        setSchedulingHints(null);
        setIsLoadingHints(false);
        return;
      }

      setIsLoadingHints(true);
      setHintError(null);
      dataService
        .getDaySchedulingHints(selectedDate, {
          startTime: minutesToTimeString(parsedStart),
          durationMinutes: DEFAULT_DURATION_MINUTES,
        }, selectedCalendarId)
        .then((hints) => {
          if (cancelled) return;
          setSchedulingHints(hints);
          setIsLoadingHints(false);
        })
        .catch(() => {
          if (cancelled) return;
          setHintError("Could not load availability hints.");
          setSchedulingHints(null);
          setIsLoadingHints(false);
        });
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [isAddOpen, newTime, selectedCalendarId, selectedDate]);

  /* Overlays in-progress drag/resize times onto the real items for live visual feedback
  without mutating the source data until the interaction is committed */
  const itemsWithDrafts = useMemo(
    () =>
      items.map((item) => {
        const draft = eventTimeDrafts[item.id];
        if (!draft) return item;
        return {
          ...item,
          start: toISODateTime(selectedDate, draft.start),
          end: toISODateTime(selectedDate, draft.end),
        };
      }),
    [items, eventTimeDrafts, selectedDate]
  );

  const positionedItems = useMemo(
    () => buildPositionedEvents(itemsWithDrafts),
    [itemsWithDrafts]
  );

  const selectedEvent = useMemo(
    () =>
      selectedEventId
        ? items.find((item) => item.id === selectedEventId) ?? null
        : null,
    [items, selectedEventId]
  );

  // Derived flag passed to the detail panel to disable actions while a save is in flight
  const isSelectedEventSaving = selectedEventId
    ? savingEventIds.includes(selectedEventId)
    : false;

  const hours = useMemo(
    () => Array.from({ length: HOURS_IN_DAY }, (_, hour) => hour),
    []
  );

  // Only runs when viewing today in day view so it avoids unnecessary intervals on other dates/views
  useEffect(() => {
    if (!isToday || selectedView !== "day") return;
    setNowMinutes(getCurrentMinutes());
    const intervalId = window.setInterval(() => {
      setNowMinutes(getCurrentMinutes());
    }, 60 * 1000);
    return () => window.clearInterval(intervalId);
  }, [isToday, selectedView]);

  useEffect(() => {
    if (!isToday || selectedView !== "day") return;
    const container = dayGridScrollRef.current;
    if (!container) return;
    const targetTop =
      (getCurrentMinutes() / 60) * HOUR_ROW_HEIGHT - container.clientHeight * 0.35;
    container.scrollTop = Math.max(0, targetTop);
  }, [selectedDate, isToday, isLoading, selectedView]);

  /* Applies drag/resize result optimistically, then rolls back to the previous snapshot on failure
   Discards the response if the user has navigated away before it resolves */
  const persistDayEventTimeChange = useCallback(
    async (eventId: string, draft: EventTimeDraft | undefined) => {
      if (!draft) return;

      const current = items.find((item) => item.id === eventId);
      if (!current) return;

      const draftStartISO = toISODateTime(selectedDate, draft.start);
      const draftEndISO = toISODateTime(selectedDate, draft.end);

      if (current.start === draftStartISO && current.end === draftEndISO) return;

      const previousItems = items;
      const targetDate = new Date(selectedDate);
      const targetDateKey = targetDate.toDateString();
      const optimisticItems = previousItems.map((item) =>
        item.id === eventId
          ? { ...item, start: draftStartISO, end: draftEndISO }
          : item
      );

      setItems(optimisticItems);
      setPersistError(null);
      setSavingEventIds((prev) =>
        prev.includes(eventId) ? prev : [...prev, eventId]
      );

      try {
        await dataService.updateDayEvent(targetDate, eventId, {
          start: draftStartISO,
          end: draftEndISO,
        });
        const refreshed = await dataService.fetchDayTimeline(targetDate, selectedCalendarId);
        if (selectedDateKeyRef.current === targetDateKey) {
          setItems(sortItemsByStart(refreshed));
        }
      } catch {
        if (selectedDateKeyRef.current === targetDateKey) {
          setItems(previousItems);
          setPersistError("Could not save the event time change.");
        }
      } finally {
        setSavingEventIds((prev) => prev.filter((id) => id !== eventId));
      }
    },
    [items, selectedCalendarId, selectedDate]
  );

  /* Initializes drag or resize state. Downplays detail-panel open immediately for resize
   but not for move, since a move that doesn't travel far enough is treated as a click */
  const startEventInteraction = useCallback(
    (
      event: ReactPointerEvent<HTMLElement>,
      item: PositionedEvent,
      mode: InteractionMode
    ) => {
      if (selectedView !== "day" || savingEventIds.includes(item.id)) return;

      if (mode !== "move") {
        event.preventDefault();
      }
      event.stopPropagation();
      setPersistError(null);
      suppressOpenRef.current = mode !== "move";

      setInteractionState({
        eventId: item.id,
        mode,
        pointerStartY: event.clientY,
        initialStartMinutes: item.startMinutes,
        initialEndMinutes: item.endMinutes,
      });
    },
    [selectedView, savingEventIds]
  );

  useEffect(() => {
    if (!interactionState) return;

    const handlePointerMove = (event: PointerEvent) => {
      const deltaMinutes = roundMinutesToStep(
        ((event.clientY - interactionState.pointerStartY) / HOUR_ROW_HEIGHT) * 60
      );
      if (deltaMinutes !== 0) {
        suppressOpenRef.current = true;
      }

      const maxMinutes = HOURS_IN_DAY * 60;

      let nextStart = interactionState.initialStartMinutes;
      let nextEnd = interactionState.initialEndMinutes;

      if (interactionState.mode === "move") {
        const duration = Math.max(
          MIN_DURATION_MINUTES,
          interactionState.initialEndMinutes - interactionState.initialStartMinutes
        );
        const movedStart = interactionState.initialStartMinutes + deltaMinutes;
        nextStart = Math.max(0, Math.min(movedStart, maxMinutes - duration));
        nextEnd = nextStart + duration;
      } else if (interactionState.mode === "resize-start") {
        const resizedStart = interactionState.initialStartMinutes + deltaMinutes;
        const maxStart = interactionState.initialEndMinutes - MIN_DURATION_MINUTES;
        nextStart = Math.max(0, Math.min(resizedStart, maxStart));
      } else {
        const resizedEnd = interactionState.initialEndMinutes + deltaMinutes;
        const minEnd = interactionState.initialStartMinutes + MIN_DURATION_MINUTES;
        nextEnd = Math.max(minEnd, Math.min(resizedEnd, maxMinutes));
      }

      const nextDraft: EventTimeDraft = {
        start: minutesToTimeString(nextStart),
        end: minutesToTimeString(nextEnd),
      };

      setEventTimeDrafts((prev) => {
        const existing = prev[interactionState.eventId];
        if (
          existing &&
          existing.start === nextDraft.start &&
          existing.end === nextDraft.end
        ) {
          return prev;
        }
        return { ...prev, [interactionState.eventId]: nextDraft };
      });
    };

    // Reads draft from the reference rather than state to avoid a stale closure over the final pointer position
    const finishInteraction = () => {
      const draft = eventTimeDraftsRef.current[interactionState.eventId];
      setInteractionState(null);
      setEventTimeDrafts((prev) => {
        const next = { ...prev };
        delete next[interactionState.eventId];
        return next;
      });
      void persistDayEventTimeChange(interactionState.eventId, draft);
      window.setTimeout(() => {
        suppressOpenRef.current = false;
      }, 80);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", finishInteraction);
    window.addEventListener("pointercancel", finishInteraction);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", finishInteraction);
      window.removeEventListener("pointercancel", finishInteraction);
    };
  }, [interactionState, persistDayEventTimeChange]);

  const handleOpenAdd = () => {
    setNewTitle("");
    setNewTime("");
    setNewDescription("");
    setNewLocation("");
    setAddTaskError(null);
    setHintError(null);
    setSchedulingHints(null);
    setPersistError(null);
    setIsAddOpen(true);
  };

  const handleCloseAdd = () => setIsAddOpen(false);

  const handleOpenEventDetails = (eventId: string) => {
    if (suppressOpenRef.current) return;

    const eventToOpen = items.find((item) => item.id === eventId);
    if (!eventToOpen) return;

    setEditTitle(eventToOpen.name);
    setEditStartTime(extractTimeHHMM(eventToOpen.start));
    setEditEndTime(extractTimeHHMM(eventToOpen.end));
    setEditDescription(eventToOpen.description ?? "");
    setEditLocation(eventToOpen.location ?? "");
    setIsEditingEvent(false);
    setEventEditError(null);
    setSelectedEventId(eventId);
    setIsEventDetailsOpen(true);
  };

  const handleCloseEventDetails = () => {
    setIsEventDetailsOpen(false);
    setIsEditingEvent(false);
    setEventEditError(null);
    setSelectedEventId(null);
  };

  const handleStartEventEdit = () => {
    if (!selectedEvent) return;
    setEditTitle(selectedEvent.name);
    setEditStartTime(extractTimeHHMM(selectedEvent.start));
    setEditEndTime(extractTimeHHMM(selectedEvent.end));
    setEditDescription(selectedEvent.description ?? "");
    setEditLocation(selectedEvent.location ?? "");
    setEventEditError(null);
    setIsEditingEvent(true);
  };

  const handleCancelEventEdit = () => {
    if (selectedEvent) {
      setEditTitle(selectedEvent.name);
      setEditStartTime(extractTimeHHMM(selectedEvent.start));
      setEditEndTime(extractTimeHHMM(selectedEvent.end));
      setEditDescription(selectedEvent.description ?? "");
      setEditLocation(selectedEvent.location ?? "");
    }
    setEventEditError(null);
    setIsEditingEvent(false);
  };

  const handleSaveEventEdit = async () => {
    if (!selectedEvent) return;

    const trimmedName = editTitle.trim();
    if (!trimmedName) {
      setEventEditError("Title is required.");
      return;
    }

    const startMinutes = parseTimeToMinutes(editStartTime.trim());
    if (startMinutes === null) {
      setEventEditError("Start time must use HH:MM (24h), for example 14:30.");
      return;
    }

    const normalizedStart = toISODateTime(selectedDate, minutesToTimeString(startMinutes));

    const endInput = editEndTime.trim();
    let normalizedEnd: string;
    if (endInput !== "") {
      const endMinutes = parseTimeToMinutes(endInput);
      if (endMinutes === null) {
        setEventEditError("End time must use HH:MM (24h), for example 14:30.");
        return;
      }
      if (endMinutes <= startMinutes) {
        setEventEditError("End time must be after start time.");
        return;
      }
      normalizedEnd = toISODateTime(selectedDate, minutesToTimeString(endMinutes));
    } else {
      // End time cleared by user: default to start + 60 min so the event has a valid duration
      normalizedEnd = toISODateTime(
        selectedDate,
        minutesToTimeString(Math.min(startMinutes + DEFAULT_DURATION_MINUTES, HOURS_IN_DAY * 60 - 1))
      );
    }

    const normalizedDescription = editDescription.trim() || undefined;
    const normalizedLocation = editLocation.trim() || null;

    const unchanged =
      selectedEvent.name === trimmedName &&
      selectedEvent.start === normalizedStart &&
      selectedEvent.end === normalizedEnd &&
      (selectedEvent.description ?? "") === (normalizedDescription ?? "") &&
      (selectedEvent.location ?? null) === normalizedLocation;

    if (unchanged) {
      setIsEditingEvent(false);
      return;
    }

    const previousItems = items;
    const targetDate = new Date(selectedDate);
    const targetDateKey = targetDate.toDateString();
    const optimisticItems = previousItems.map((item) =>
      item.id === selectedEvent.id
        ? {
            ...item,
            name: trimmedName,
            start: normalizedStart,
            end: normalizedEnd,
            description: normalizedDescription,
            location: normalizedLocation,
          }
        : item
    );

    setItems(sortItemsByStart(optimisticItems));
    setPersistError(null);
    setEventEditError(null);
    setSavingEventIds((prev) =>
      prev.includes(selectedEvent.id) ? prev : [...prev, selectedEvent.id]
    );

    try {
      await dataService.updateDayEvent(targetDate, selectedEvent.id, {
        name: trimmedName,
        start: normalizedStart,
        end: normalizedEnd,
        description: normalizedDescription,
        location: normalizedLocation,
      });
      const refreshed = await dataService.fetchDayTimeline(targetDate, selectedCalendarId);
      if (selectedDateKeyRef.current === targetDateKey) {
        setItems(sortItemsByStart(refreshed));
      }
      setIsEditingEvent(false);
    } catch {
      if (selectedDateKeyRef.current === targetDateKey) {
        setItems(previousItems);
        setPersistError("Could not save event changes.");
        setEventEditError("Could not save event changes.");
      }
    } finally {
      setSavingEventIds((prev) =>
        prev.filter((id) => id !== selectedEvent.id)
      );
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;

    const confirmDelete = window.confirm("Delete this event?");
    if (!confirmDelete) return;

    const previousItems = items;
    const targetDate = new Date(selectedDate);
    const targetDateKey = targetDate.toDateString();

    setItems(previousItems.filter((item) => item.id !== selectedEvent.id));
    setIsEditingEvent(false);
    setEventEditError(null);
    setPersistError(null);
    setIsEventDetailsOpen(false);
    setSelectedEventId(null);

    try {
      await dataService.deleteDayEvent(targetDate, selectedEvent.id);
      const refreshed = await dataService.fetchDayTimeline(targetDate, selectedCalendarId);
      if (selectedDateKeyRef.current === targetDateKey) {
        setItems(sortItemsByStart(refreshed));
      }
    } catch {
      if (selectedDateKeyRef.current === targetDateKey) {
        setItems(previousItems);
        setPersistError("Could not delete event.");
      }
    }
  };

  // Closes the detail panel if the selected event is removed from the list (ex deleted externally)
  useEffect(() => {
    if (!selectedEventId || selectedEvent) return;
    setIsEventDetailsOpen(false);
    setIsEditingEvent(false);
    setEventEditError(null);
    setSelectedEventId(null);
  }, [selectedEvent, selectedEventId]);

  const handleAddTask = async () => {
  console.log("HANDLE ADD TASK FIRED", { newTitle, newTime });

  if (!selectedCalendarId) {
    setAddTaskError("Select a calendar first.");
    return;
  }

  const startMinutes = parseTimeToMinutes(newTime);

  if (!newTitle.trim()) {
    setAddTaskError("Title is required.");
    return;
  }

  if (startMinutes === null) {
    setAddTaskError("Time must use HH:MM (24h), for example 14:30.");
    return;
  }

  const normalizedStart = toISODateTime(
    selectedDate,
    minutesToTimeString(startMinutes)
  );

  const endMinutes = Math.min(
    startMinutes + DEFAULT_DURATION_MINUTES,
    HOURS_IN_DAY * 60 - 1
  );

  const normalizedEnd = toISODateTime(
    selectedDate,
    minutesToTimeString(endMinutes)
  );

  const tempId = `temp-${Date.now()}`;
  const tempItem: DailyTimelineItem = {
    id: tempId,
    name: newTitle.trim(),
    start: normalizedStart,
    end: normalizedEnd,
    description: newDescription.trim() || undefined,
    location: newLocation.trim() || null,
    priority: 0,
    flexible: false,
    travel_time_min: 0,
  };

  const targetDate = new Date(selectedDate);
  const targetDateKey = targetDate.toDateString();

  setIsCreatingEvent(true);
  setAddTaskError(null);
  setPersistError(null);
  setItems((prev) => sortItemsByStart([...prev, tempItem]));
  setIsAddOpen(false);

  try {
    await dataService.createDayEvent(targetDate, {
      name: tempItem.name,
      start: tempItem.start,
      end: tempItem.end,
      description: tempItem.description,
      location: tempItem.location,
      priority: tempItem.priority,
      flexible: tempItem.flexible,
      travel_time_min: tempItem.travel_time_min,
    }, selectedCalendarId);

    const refreshed = await dataService.fetchDayTimeline(targetDate, selectedCalendarId);

    if (selectedDateKeyRef.current === targetDateKey) {
      setItems(sortItemsByStart(refreshed));
    }
  } catch (error) {
    console.error("ADD TASK ERROR", error);

    if (selectedDateKeyRef.current === targetDateKey) {
      setItems((prev) => prev.filter((item) => item.id !== tempId));
      setPersistError("Could not save the new event.");
    }
  } finally {
    setIsCreatingEvent(false);
  }
};

  return {
    addTaskError,
    dateLabel,
    dayGridScrollRef,
    error,
    handleAddTask,
    handleCloseAdd,
    handleOpenAdd,
    hours,
    hintError,
    interactionState,
    isAddOpen,
    isCreatingEvent,
    isEventDetailsOpen,
    isLoading,
    isLoadingHints,
    isToday,
    isSelectedEventSaving,
    items,
    isEditingEvent,
    eventEditError,
    selectedEvent,
    editTitle,
    editStartTime,
    editEndTime,
    editDescription,
    editLocation,
    newDescription,
    newLocation,
    newTime,
    newTitle,
    nowMinutes,
    persistError,
    positionedItems,
    savingEventIds,
    schedulingHints,
    setNewDescription,
    setNewLocation,
    setNewTime,
    setNewTitle,
    setEditDescription,
    setEditLocation,
    setEditEndTime,
    setEditStartTime,
    setEditTitle,
    handleOpenEventDetails,
    handleCloseEventDetails,
    handleCancelEventEdit,
    handleDeleteEvent,
    handleSaveEventEdit,
    handleStartEventEdit,
    startEventInteraction,
  };
}
