/* File that handles rendering Event details when clicked + editing/modifying the Events at User's will
Written by: Byron Billy
FRs: All that have to do with editing and viewing Events */
import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { DailyTimelineItem } from "../../Types/Calendar";
import { Badge } from "../../design_system/components/ui/Badge";
import { Button } from "../../design_system/components/ui/Button";
import { Modal } from "../../design_system/components/ui/Modal";
import { Input } from "../../design_system/components/ui/Input";
import { EventMap } from "../../components/EventMap";
import { LocationAutocomplete } from "../../components/LocationAutocomplete";
import { extractTimeHHMM } from "./dayPlannerUtils";

const BASE_API_URL = import.meta.env.VITE_BASE_API_URL;

type EventParticipant = {
  participant_id?: string;
  name?: string | null;
  info?: string | null;
  full_address?: string | null;
};

type EventDetailsTimelineItem = DailyTimelineItem & {
  participants?: EventParticipant[];
};

type EventDetailsDialogProps = {
  // Selected event to show in the popup; null means unavailable.
  event: EventDetailsTimelineItem | null;
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
  onSetEditLocation: (value: string) => void;
  onSetEditStartTime: (value: string) => void;
  onSetEditTitle: (value: string) => void;
  editLocation: string;
  // Location / travel time (populated by useEventLocation in TodaysPlanPage)
  eventLat?: number | null;
  eventLng?: number | null;
  travelTimeMin?: number | null;
  isTravelLoading?: boolean;
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
  onSetEditLocation,
  onSetEditStartTime,
  onSetEditTitle,
  editLocation,
  eventLat,
  eventLng,
  travelTimeMin,
  isTravelLoading,
}: EventDetailsDialogProps) => {
  const [participants, setParticipants] = useState<EventParticipant[]>([]);
  const [isParticipantsLoading, setIsParticipantsLoading] = useState(false);

  useEffect(() => {
    let canceled = false;

    const fetchParticipants = async () => {
      if (!isOpen || !event?.id) {
        setParticipants([]);
        return;
      }

      setParticipants(event.participants ?? []);
      setIsParticipantsLoading(true);

      try {
        const accessToken = localStorage.getItem("access_token");

        const response = await fetch(
          `${BASE_API_URL}/events/participants_for_event/${event.id}`,
          {
            headers: {
              ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch participants");
        }

        const data = await response.json();

        if (!canceled) {
          setParticipants(data.participants ?? []);
        }
      } catch (err) {
        console.error("Failed to fetch participants", err);

        if (!canceled) {
          setParticipants(event.participants ?? []);
        }
      } finally {
        if (!canceled) {
          setIsParticipantsLoading(false);
        }
      }
    };

    fetchParticipants();

    return () => {
      canceled = true;
    };
  }, [isOpen, event?.id]);

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
              <LocationAutocomplete
                label="Location (optional)"
                placeholder="e.g., 123 Main St, Boston, MA"
                value={editLocation}
                onChange={(address) => onSetEditLocation(address)}
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
                  <Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <Typography variant="body2" color="text.secondary">
                        {event.location}
                      </Typography>
                      {isTravelLoading ? (
                        <CircularProgress size={10} sx={{ ml: 0.5 }} />
                      ) : travelTimeMin != null ? (
                        <Typography variant="body2" color="text.secondary">
                          {` · ~${travelTimeMin} min travel`}
                        </Typography>
                      ) : null}
                    </Box>
                    {eventLat != null && eventLng != null && (
                      <Box sx={{ mt: 1 }}>
                        <EventMap latitude={eventLat} longitude={eventLng} />
                      </Box>
                    )}
                  </Box>
                )}
                {event.flexible && (
                  <Typography variant="caption" color="text.secondary">
                    Flexible
                  </Typography>
                )}
              </Box>
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  Participants
                </Typography>

                {isParticipantsLoading ? (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
                    <CircularProgress size={12} />
                    <Typography variant="body2" color="text.secondary">
                      Loading participants...
                    </Typography>
                  </Box>
                ) : participants.length > 0 ? (
                  <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                    {participants.map((participant, index) => (
                      <Box key={participant.participant_id || index}>
                        <Typography variant="body2" color="text.primary">
                          {participant.name || "Unnamed participant"}
                        </Typography>

                        {participant.info && (
                          <Typography variant="caption" color="text.secondary">
                            {participant.info}
                          </Typography>
                        )}

                        {participant.full_address && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            {participant.full_address}
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No participants added.
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