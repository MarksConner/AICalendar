import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Typography from "@mui/material/Typography";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  extractTimeHHMM,
  getEventTone,
  HOUR_ROW_HEIGHT,
  MIN_EVENT_HEIGHT,
} from "./dayPlannerUtils";
import type { InteractionMode, PositionedEvent } from "./dayPlannerUtils";

type EventBlockProps = {
  item: PositionedEvent;
  isInteracting: boolean;
  isSaving: boolean;
  onOpen: () => void;
  onStartInteraction: (
    event: ReactPointerEvent<HTMLElement>,
    item: PositionedEvent,
    mode: InteractionMode
  ) => void;
};

export function EventBlock({
  item,
  isInteracting,
  isSaving,
  onOpen,
  onStartInteraction,
}: EventBlockProps) {
  const top = (item.startMinutes / 60) * HOUR_ROW_HEIGHT + 2;
  const duration = item.endMinutes - item.startMinutes;
  const height = Math.max((duration / 60) * HOUR_ROW_HEIGHT - 4, MIN_EVENT_HEIGHT);
  const widthPercent = 100 / item.columnCount;
  const leftPercent = widthPercent * item.column;
  const tone = getEventTone(item.priority);

  return (
    <ButtonBase
      type="button"
      onClick={onOpen}
      disabled={isSaving}
      sx={{
        position: "absolute",
        top,
        left: `calc(${leftPercent}% + 4px)`,
        width: `calc(${widthPercent}% - 8px)`,
        minHeight: MIN_EVENT_HEIGHT,
        height,
        borderRadius: 1.5,
        border: "1px solid",
        borderColor: tone.borderColor,
        bgcolor: tone.bgcolor,
        px: 1,
        py: 0.75,
        alignItems: "flex-start",
        justifyContent: "flex-start",
        textAlign: "left",
        pointerEvents: "auto",
        overflow: "hidden",
        opacity: isSaving ? 0.7 : 1,
        boxShadow: isInteracting ? "0 0 0 2px rgba(90, 133, 226, 0.45)" : "none",
        transition: "box-shadow 120ms ease, opacity 120ms ease",
      }}
    >
      <Box sx={{ minWidth: 0, width: "100%" }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 600 }}>
            {extractTimeHHMM(item.start)} – {extractTimeHHMM(item.end)}
          </Typography>
          <Box
            role="button"
            aria-label="Move event"
            onPointerDown={(event) => onStartInteraction(event, item, "move")}
            sx={{
              width: 22,
              height: 14,
              borderRadius: 999,
              border: "1px dashed",
              borderColor: tone.borderColor,
              opacity: 0.65,
              cursor: isSaving ? "not-allowed" : "grab",
              pointerEvents: "auto",
              flexShrink: 0,
            }}
          />
        </Box>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            lineHeight: 1.25,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {item.name}
        </Typography>
        {item.description && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              mt: 0.25,
              display: "block",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {item.description}
          </Typography>
        )}
        {isSaving && (
          <Typography variant="caption" color="text.secondary">
            Saving…
          </Typography>
        )}
      </Box>
      <Box
        role="button"
        aria-label="Resize event"
        onPointerDown={(event) => onStartInteraction(event, item, "resize")}
        sx={{
          position: "absolute",
          left: 6,
          right: 6,
          bottom: 2,
          height: 8,
          borderTop: "2px solid",
          borderColor: tone.borderColor,
          opacity: 0.55,
          cursor: isSaving ? "not-allowed" : "ns-resize",
          pointerEvents: "auto",
        }}
      />
    </ButtonBase>
  );
}
