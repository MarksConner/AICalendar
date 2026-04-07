import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { DailyTimelineItem } from "../../Types/Calendar";
import { Badge } from "../../design_system/components/ui/Badge";
import { Button } from "../../design_system/components/ui/Button";
import { Modal } from "../../design_system/components/ui/Modal";
import { Input } from "../../design_system/components/ui/Input";
import { extractTimeHHMM } from "./dayPlannerUtils";

type EventDetailsDialogProps = {
  // Selected event to show in the popup; null means unavailable.
  event: DailyTimelineItem | null;
  // Controls popup visibility.
  isOpen: boolean;
  // Close handler for backdrop / close button.
  onClose: () => void;
  isEditing: boolean;
  isSaving: boolean;
  editDescription: string;
  editEndTime: string;
  editError: string | null;
  editStartTime: string;
  editTitle: string;
  onCancelEdit: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onSaveEdit: () => void;
  onSetEditDescription: (value: string) => void;
  onSetEditEndTime: (value: string) => void;
  onSetEditStartTime: (value: string) => void;
  onSetEditTitle: (value: string) => void;
};

const formatPriorityLabel = (priority: number): string => {
  if (priority >= 2) return "High priority";
  if (priority === 1) return "Medium priority";
  return "Normal";
};

const priorityBadgeVariant = (
  priority: number
): "default" | "warning" | "error" => {
  if (priority >= 2) return "error";
  if (priority === 1) return "warning";
  return "default";
};

export const EventDetailsDialog = ({
  event,
  isOpen,
  onClose,
  isEditing,
  isSaving,
  editDescription,
  editEndTime,
  editError,
  editStartTime,
  editTitle,
  onCancelEdit,
  onDelete,
  onEdit,
  onSaveEdit,
  onSetEditDescription,
  onSetEditEndTime,
  onSetEditStartTime,
  onSetEditTitle,
}: EventDetailsDialogProps) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Event details"
      footer={
        <>
          {isEditing ? (
            <>
              <Button
                variant="ghost"
                onClick={onCancelEdit}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button onClick={onSaveEdit} disabled={isSaving}>
                {isSaving ? "Saving…" : "Save"}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="secondary"
                onClick={onClose}
              >
                Close
              </Button>
              <Button variant="secondary" onClick={onEdit} disabled={isSaving}>
                Edit
              </Button>
              {/* Delete currently uses a confirm prompt and restores state if API fails. */}
              <Button variant="secondary" onClick={onDelete} disabled={isSaving}>
                Delete
              </Button>
            </>
          )}
        </>
      }
    >
      {event ? (
        <Stack spacing={1.5}>
          {isEditing ? (
            <>
              <Input
                label="Title"
                value={editTitle}
                onChange={(htmlEvent) => onSetEditTitle(htmlEvent.target.value)}
              />
              <Input
                label="Start time"
                placeholder="HH:MM (24h)"
                value={editStartTime}
                onChange={(htmlEvent) =>
                  onSetEditStartTime(htmlEvent.target.value)
                }
              />
              <Input
                label="End time (optional)"
                placeholder="HH:MM (24h)"
                value={editEndTime}
                onChange={(htmlEvent) =>
                  onSetEditEndTime(htmlEvent.target.value)
                }
              />
              <Input
                label="Description"
                placeholder="Short note about this task"
                value={editDescription}
                onChange={(htmlEvent) =>
                  onSetEditDescription(htmlEvent.target.value)
                }
              />
            </>
          ) : (
            <>
              <Typography variant="h6" fontWeight={600}>
                {event.name}
              </Typography>
              <Badge variant={priorityBadgeVariant(event.priority)}>
                {formatPriorityLabel(event.priority)}
              </Badge>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  {extractTimeHHMM(event.start)} – {extractTimeHHMM(event.end)}
                </Typography>
                {event.location && (
                  <Typography variant="body2" color="text.secondary">
                    {event.location}
                    {event.travel_time_min > 0
                      ? ` · ${event.travel_time_min} min travel`
                      : ""}
                  </Typography>
                )}
                {event.flexible && (
                  <Typography variant="caption" color="text.secondary">
                    Flexible
                  </Typography>
                )}
              </Box>
              <Typography
                variant="body2"
                color={event.description ? "text.primary" : "text.secondary"}
              >
                {event.description || "No description provided."}
              </Typography>
            </>
          )}
          {editError && (
            <Typography variant="caption" color="error">
              {editError}
            </Typography>
          )}
        </Stack>
      ) : (
        /* Fallback for timing edge cases where the selected event is no longer present. */
        <Typography variant="body2" color="text.secondary">
          Event details are not available.
        </Typography>
      )}
    </Modal>
  );
};
