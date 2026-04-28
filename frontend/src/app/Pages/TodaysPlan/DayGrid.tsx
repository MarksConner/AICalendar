import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { MutableRefObject } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  Card,
  CardContent,
  CardHeader,
} from "../../design_system/components/ui/Card";
import { Button } from "../../design_system/components/ui/Button";
import { EventBlock } from "./EventBlock";
import {
  formatHourLabel,
  HOUR_ROW_HEIGHT,
  HOURS_IN_DAY,
  TIME_GUTTER_WIDTH,
} from "./dayPlannerUtils";
import type {
  EventInteractionState,
  InteractionMode,
  PositionedEvent,
} from "./dayPlannerUtils";

type DayGridProps = {
  dayGridScrollRef: MutableRefObject<HTMLDivElement | null>;
  error: string | null;
  hours: number[];
  interactionState: EventInteractionState | null;
  isCreatingEvent: boolean;
  isLoading: boolean;
  isToday: boolean;
  itemsCount: number;
  nowMinutes: number;
  onOpenAdd: () => void;
  onOpenEvent: (eventId: string) => void;
  onStartInteraction: (
    event: ReactPointerEvent<HTMLElement>,
    item: PositionedEvent,
    mode: InteractionMode
  ) => void;
  positionedItems: PositionedEvent[];
  savingEventIds: string[];
};

export function DayGrid({
  dayGridScrollRef,
  error,
  hours,
  interactionState,
  isCreatingEvent,
  isLoading,
  isToday,
  itemsCount,
  nowMinutes,
  onOpenAdd,
  onOpenEvent,
  onStartInteraction,
  positionedItems,
  savingEventIds,
}: DayGridProps) {
  return (
    <Card>
      <CardHeader sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="h6" fontWeight={600}>
          Day schedule
        </Typography>
        <Button size="sm" onClick={onOpenAdd} disabled={isCreatingEvent}>
          {isCreatingEvent ? "Saving…" : "+ Add task"}
        </Button>
      </CardHeader>
      <CardContent sx={{ p: 0 }}>
        {isLoading && (
          <Typography variant="body2" color="text.secondary" sx={{ px: 2, pb: 2 }}>
            Loading events…
          </Typography>
        )}
        {error && (
          <Typography variant="body2" color="error" sx={{ px: 2, pb: 2 }}>
            {error}
          </Typography>
        )}
        {!isLoading && !error && itemsCount === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ px: 2, pb: 2 }}>
            No events yet. Use &quot;Add task&quot; to start planning your day.
          </Typography>
        )}
        {!isLoading && !error && (
          <Box
            ref={dayGridScrollRef}
            sx={{
              maxHeight: { xs: 460, md: 620 },
              overflowY: "auto",
              borderTop: 1,
              borderColor: "divider",
              position: "relative",
            }}
          >
            <Box
              sx={{
                minHeight: HOURS_IN_DAY * HOUR_ROW_HEIGHT,
                position: "relative",
              }}
            >
              {hours.map((hour) => (
                <Box
                  key={hour}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: `${TIME_GUTTER_WIDTH}px 1fr`,
                    minHeight: HOUR_ROW_HEIGHT,
                  }}
                >
                  <Box sx={{ pr: 1.5, pt: 0.25, textAlign: "right" }}>
                    <Typography variant="caption" color="text.secondary">
                      {formatHourLabel(hour)}
                    </Typography>
                  </Box>
                  <Box sx={{ borderTop: 1, borderColor: "divider" }} />
                </Box>
              ))}

              <Box
                sx={{
                  position: "absolute",
                  top: 0,
                  left: TIME_GUTTER_WIDTH,
                  right: 8,
                  bottom: 0,
                  pointerEvents: "none",
                }}
              >
                {positionedItems.map((item) => (
                  <EventBlock
                    key={item.id}
                    item={item}
                    isSaving={savingEventIds.includes(item.id)}
                    isInteracting={interactionState?.eventId === item.id}
                    onOpen={() => onOpenEvent(item.id)}
                    onStartInteraction={onStartInteraction}
                  />
                ))}
              </Box>

              {isToday && (
                <Box
                  sx={{
                    position: "absolute",
                    top: (nowMinutes / 60) * HOUR_ROW_HEIGHT,
                    left: TIME_GUTTER_WIDTH,
                    right: 0,
                    display: "flex",
                    alignItems: "center",
                    pointerEvents: "none",
                    zIndex: 2,
                  }}
                >
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      bgcolor: "error.main",
                      transform: "translateX(-50%)",
                    }}
                  />
                  <Box
                    sx={{
                      flex: 1,
                      borderTop: "2px solid",
                      borderColor: "error.main",
                    }}
                  />
                </Box>
              )}
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
