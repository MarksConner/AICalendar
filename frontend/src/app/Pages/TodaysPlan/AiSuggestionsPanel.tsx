import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import type { Theme } from "@mui/material/styles";
import { Lightbulb, TriangleAlert, Info } from "lucide-react";
import type { DailyTimelineItem } from "../../Types/Calendar";
import type { AiSuggestion } from "../../services/contracts";
import { dataService } from "../../services";

const PANEL_WIDTH = 300; 

// Maps optional category labels to icons.
// Triangle Alert to alert user of travel times 
// Lightbulb to give user tips 
// Otherwise use info icon
const categoryIcon = (category?: string) => {
  if (!category) return <Lightbulb size={14} />;
  const lower = category.toLowerCase();
  if (lower.includes("travel")) return <TriangleAlert size={14} />;
  if (lower.includes("tip")) return <Lightbulb size={14} />;
  return <Info size={14} />;
};

//
type AiSuggestionCardProps = {
  suggestion: AiSuggestion;
};

function AiSuggestionCard({ suggestion }: AiSuggestionCardProps) {
  return (
    <Box
      sx={{
        borderRadius: 1.5,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        p: 1.5,
        display: "flex",
        flexDirection: "column",
        gap: 0.75,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
        <Box
          sx={{
            color: (theme: Theme) => theme.palette.primary.main,
            display: "flex",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          {categoryIcon(suggestion.category)}
        </Box>
        {suggestion.category && (
          <Typography
            sx={{
              fontSize: "0.6875rem",
              fontWeight: 600,
              color: "primary.main",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {suggestion.category}
          </Typography>
        )}
      </Box>
      <Typography
        variant="body2"
        sx={{ fontSize: "0.8125rem", lineHeight: 1.55, color: "text.primary" }}
      >
        <Box component="span" sx={{ fontWeight: 600 }}>
          {suggestion.title}
        </Box>
        {suggestion.description ? ` — ${suggestion.description}` : ""}
      </Typography>
    </Box>
  );
}
type AiSuggestionsPanelProps = {
  date: Date;
  items: DailyTimelineItem[];
};

export function AiSuggestionsPanel({ date, items }: AiSuggestionsPanelProps) {
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stable reference for items — we only want to re-fetch when the date changes
  // or when the item list settles after load (not on every drag/edit).
  const dateKey = date.toDateString();
  const itemCountRef = useRef(items.length);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    itemCountRef.current = items.length;

    dataService
      .getDayAiSuggestions(date, items)
      .then((response) => {
        if (cancelled) return;
        setSuggestions(response.suggestions);
        setIsLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Could not load AI suggestions.");
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // Re-fetch only when the selected date changes, not on every item edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateKey]);

  return (
    <Box
      sx={{
        width: PANEL_WIDTH,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        gap: 1,
        borderLeft: "1px solid",
        borderColor: "divider",
        pl: 2,
        alignSelf: "flex-start",
      }}
    >
      {/* Panel heading */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.5 }}>
        <Box
          sx={{
            color: (theme: Theme) => theme.palette.primary.main,
            display: "flex",
            alignItems: "center",
          }}
        >
        </Box>
        <Typography
          variant="subtitle2"
          fontWeight={700}
          sx={{ letterSpacing: "0.01em" }}
        >
          AI Suggestions
        </Typography>
      </Box>

      {isLoading && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            py: 2,
            color: "text.secondary",
          }}
        >
          <CircularProgress size={14} />
          <Typography variant="caption">Generating suggestions…</Typography>
        </Box>
      )}

      {error && !isLoading && (
        <Box
          sx={{
            borderRadius: 1.5,
            border: "1px solid",
            borderColor: (theme: Theme) => alpha(theme.palette.error.main, 0.3),
            bgcolor: (theme: Theme) => alpha(theme.palette.error.main, 0.06),
            p: 1.5,
          }}
        >
          <Typography variant="caption" color="error">
            {error}
          </Typography>
        </Box>
      )}

      {!isLoading && !error && suggestions.length === 0 && (
        <Typography variant="caption" color="text.secondary">
          No suggestions for this day.
        </Typography>
      )}

      {!isLoading &&
        !error &&
        suggestions.map((s) => <AiSuggestionCard key={s.id} suggestion={s} />)}
    </Box>
  );
}
