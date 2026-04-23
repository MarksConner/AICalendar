import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { Modal } from "../../design_system/components/ui/Modal";
import { Button } from "../../design_system/components/ui/Button";
import { Input } from "../../design_system/components/ui/Input";
import CalendarClient from "../../api_client/CalendarClient";
import type { LocalEventSuggestion } from "../../api/Events";

interface CalendarOption {
  calendar_id?: string;
  id?: string;
  calendar_name?: string;
  name?: string;
}

interface AddSuggestedEventModalProps {
  isOpen: boolean;
  suggestion: LocalEventSuggestion | null;
  selectedDate: Date;
  selectedCalendarId: string | null;
  onClose: () => void;
  onConfirm: (payload: {
    calendar_id: string;
    title: string;
    description?: string;
    address?: string;
    start_time: string;
    end_time?: string;
    priority_rank?: number;
  }) => Promise<void>;
}

const toLocalDateTimeValue = (isoString?: string | null, fallbackDate?: Date) => {
  const base = isoString ? new Date(isoString) : new Date(fallbackDate ?? Date.now() + 60 * 60 * 1000);
  const year = base.getFullYear();
  const month = `${base.getMonth() + 1}`.padStart(2, "0");
  const day = `${base.getDate()}`.padStart(2, "0");
  const hours = `${base.getHours()}`.padStart(2, "0");
  const minutes = `${base.getMinutes()}`.padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export function AddSuggestedEventModal({
  isOpen,
  suggestion,
  selectedDate,
  selectedCalendarId,
  onClose,
  onConfirm,
}: AddSuggestedEventModalProps) {
  const [calendars, setCalendars] = useState<CalendarOption[]>([]);
  const [calendarId, setCalendarId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const loadCalendars = async () => {
      try {
        const client = new CalendarClient();
        const response = await client.getCalendarsAPI();
        if (!response.ok) {
          throw new Error("Could not load calendars.");
        }
        const data = await response.json();
        setCalendars(data ?? []);
        const matchingSelected = data?.find((calendar: CalendarOption) => (calendar.calendar_id ?? calendar.id) === selectedCalendarId);
        const defaultCalendarId = matchingSelected?.calendar_id ?? matchingSelected?.id ?? data?.[0]?.calendar_id ?? data?.[0]?.id ?? "";
        setCalendarId(defaultCalendarId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load calendars.");
      }
    };

    setError(null);
    setDescription(suggestion?.description ?? "Imported from Google Places");

    const fallbackStart = new Date(selectedDate);
    fallbackStart.setHours(18, 0, 0, 0);
    const fallbackEnd = new Date(selectedDate);
    fallbackEnd.setHours(20, 0, 0, 0);

    setStartTime(toLocalDateTimeValue(suggestion?.start_time, fallbackStart));
    setEndTime(toLocalDateTimeValue(suggestion?.end_time ?? suggestion?.start_time, fallbackEnd));
    void loadCalendars();
  }, [isOpen, selectedCalendarId, selectedDate, suggestion]);

  const handleConfirm = async () => {
    if (!suggestion) return;
    if (!calendarId) {
      setError("Select a calendar first.");
      return;
    }
    if (!startTime) {
      setError("Choose a start time.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await onConfirm({
        calendar_id: calendarId,
        title: suggestion.title,
        description,
        address: suggestion.address ?? suggestion.venue_name ?? suggestion.title,
        start_time: new Date(startTime).toISOString(),
        end_time: endTime ? new Date(endTime).toISOString() : undefined,
        priority_rank: 3,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add suggested event.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add suggested event"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isSaving}>
            {isSaving ? "Adding…" : "Add event"}
          </Button>
        </>
      }
    >
      <Stack spacing={2}>
        <Box>
          <Typography variant="subtitle1" fontWeight={600}>
            {suggestion?.title ?? "Suggested event"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {suggestion?.address ?? suggestion?.venue_name ?? "No location provided"}
          </Typography>
        </Box>

        <Input
          label="Calendar"
          select
          value={calendarId}
          onChange={(event) => setCalendarId(event.target.value)}
          required
        >
          <MenuItem value="" disabled>
            Select a calendar
          </MenuItem>
          {calendars.map((calendar) => {
            const value = calendar.calendar_id ?? calendar.id ?? "";
            const label = calendar.calendar_name ?? calendar.name ?? value;
            return (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            );
          })}
        </Input>

        <Input
          label="Start time"
          type="datetime-local"
          value={startTime}
          onChange={(event) => setStartTime(event.target.value)}
          required
        />

        <Input
          label="End time"
          type="datetime-local"
          value={endTime}
          onChange={(event) => setEndTime(event.target.value)}
        />

        <Input
          label="Description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />

        {error && (
          <Typography variant="body2" color="error">
            {error}
          </Typography>
        )}
      </Stack>
    </Modal>
  );
}
