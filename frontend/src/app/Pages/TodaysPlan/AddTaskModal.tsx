import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { DaySchedulingHints } from "../../services";
import { Banner } from "../../design_system/components/ui/Banner";
import { Button } from "../../design_system/components/ui/Button";
import { Input } from "../../design_system/components/ui/Input";
import { Modal } from "../../design_system/components/ui/Modal";
import { LocationAutocomplete } from "../../components/LocationAutocomplete";

type AddTaskModalProps = {
  addTaskError: string | null;
  hintError: string | null;
  isCreatingEvent: boolean;
  isLoadingHints: boolean;
  isOpen: boolean;
  newDescription: string;
  newLocation: string;
  newTime: string;
  newTitle: string;
  onClose: () => void;
  onDescriptionChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onSave: () => void;
  onTimeChange: (value: string) => void;
  onTitleChange: (value: string) => void;
  schedulingHints: DaySchedulingHints | null;
};

export function AddTaskModal({
  addTaskError,
  hintError,
  isCreatingEvent,
  isLoadingHints,
  isOpen,
  newDescription,
  newLocation,
  newTime,
  newTitle,
  onClose,
  onDescriptionChange,
  onLocationChange,
  onSave,
  onTimeChange,
  onTitleChange,
  schedulingHints,
}: AddTaskModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add task"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isCreatingEvent}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={isCreatingEvent}>
            {isCreatingEvent ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      <Stack spacing={1.0}>
        <Input
          label="Title"
          placeholder="e.g., Deep work – ML project"
          value={newTitle}
          onChange={(event) => onTitleChange(event.target.value)}
        />
        <Input
          label="Time"
          placeholder="HH:MM (24h)"
          value={newTime}
          onChange={(event) => onTimeChange(event.target.value)}
        />
        {/* coords are unused for tasks — only the address string is stored */}
        <LocationAutocomplete
          label="Location (optional)"
          placeholder="e.g., 123 Main St, Boston, MA"
          value={newLocation}
          onChange={(address) => onLocationChange(address)}
        />
        <Input
          label="Description (optional)"
          placeholder="Short note about this task"
          value={newDescription}
          onChange={(event) => onDescriptionChange(event.target.value)}
        />
        {isLoadingHints && (
          <Typography variant="caption" color="text.secondary">
            Checking conflicts and availability…
          </Typography>
        )}
        {hintError && (
          <Typography variant="caption" color="error">
            {hintError}
          </Typography>
        )}
        {schedulingHints && (
          <Box
            sx={{
              border: 1,
              borderColor: "divider",
              borderRadius: 1,
              p: 1.5,
              bgcolor: "background.default",
              display: "flex",
              flexDirection: "column",
              gap: 1,
            }}
          >
            <Typography variant="caption" color="text.secondary">
              Working hours: {schedulingHints.workingHours.startTime} -{" "}
              {schedulingHints.workingHours.endTime}
            </Typography>

            {schedulingHints.hasConflict ? (
              <Banner
                variant="warning"
                title="Conflicts detected"
                message={`${schedulingHints.conflicts.length} event(s) overlap with this time.`}
              />
            ) : (
              <Banner
                variant="success"
                title="No conflicts"
                message="This time slot is currently open."
              />
            )}

            {schedulingHints.conflicts.length > 0 && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                {schedulingHints.conflicts.slice(0, 3).map((conflict) => (
                  <Typography
                    key={conflict.eventId}
                    variant="caption"
                    color="text.secondary"
                  >
                    {conflict.start}
                    {conflict.end ? ` – ${conflict.end}` : ""} · {conflict.name}
                  </Typography>
                ))}
              </Box>
            )}

            {schedulingHints.suggestions.length > 0 && (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {schedulingHints.suggestions.slice(0, 3).map((suggestion) => (
                  <Button
                    key={`${suggestion.startTime}-${suggestion.endTime}`}
                    size="sm"
                    variant="secondary"
                    onClick={() => onTimeChange(suggestion.startTime)}
                  >
                    {suggestion.startTime} ({suggestion.label})
                  </Button>
                ))}
              </Box>
            )}

            {!schedulingHints.inWorkingHours && (
              <Typography variant="caption" color="warning.main">
                Selected time is outside working hours.
              </Typography>
            )}
          </Box>
        )}
        {addTaskError && (
          <Typography variant="caption" color="error">
            {addTaskError}
          </Typography>
        )}
      </Stack>
    </Modal>
  );
}
