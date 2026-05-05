/* AiSuggestionsPanel Shows LLM-generated schedule insights, tips, and travel alerts for the selected day. Sits alongside the DayGrid in the day view.
 Written by: Byron Billy
 FRs: 10, 15, 23 */
import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Lightbulb, TriangleAlert, Info } from "lucide-react";

import { Card, CardContent, CardHeader } from "../../design_system/components/ui/Card";
import { getDayAiSuggestions } from "../../api/AiSuggestions";
import type { AiSuggestion } from "../../services/contracts";
import type { DailyTimelineItem } from "../../Types/Calendar";

const PANEL_WIDTH = 360;

type AiSuggestionsPanelProps = {
  date: Date;
  items: DailyTimelineItem[];
};

// Map a suggestion category to its icon
function SuggestionIcon({ category }: { category?: string }) {
  const lower = category?.toLowerCase() ?? "";
  if (lower.includes("tip")) return <Lightbulb size={16} />;
  if (lower.includes("travel")) return <TriangleAlert size={16} />;
  return <Info size={16} />;
}

// Color token per category — keeps cards visually distinct
function categoryColor(category?: string): string {
  const lower = category?.toLowerCase() ?? "";
  if (lower.includes("tip")) return "warning.main";
  if (lower.includes("travel")) return "error.main";
  return "info.main";
}

export function AiSuggestionsPanel({ date, items }: AiSuggestionsPanelProps) {
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-fetch whenever the selected date or item list changes
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    getDayAiSuggestions(date, items)
      .then((res) => {
        if (!cancelled) setSuggestions(res.suggestions);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load suggestions right now.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [date, items]);

  return (
    <Box
      sx={{
        width: PANEL_WIDTH,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
        borderLeft: "1px solid",
        borderColor: "divider",
        pl: 2,
        alignSelf: "flex-start",
      }}
    >
      <Card variant="elevated">
        <CardHeader>
          <Stack spacing={0.75}>
            <Typography variant="subtitle2" fontWeight={700}>
              AI Suggestions
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Personalised insights for your{" "}
              {date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}{" "}
              schedule.
            </Typography>
          </Stack>
        </CardHeader>

        <CardContent>
          {isLoading && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "text.secondary" }}>
              <CircularProgress size={14} />
              <Typography variant="caption">Generating insights…</Typography>
            </Box>
          )}

          {!isLoading && error && (
            <Typography variant="caption" color="error">
              {error}
            </Typography>
          )}

          {!isLoading && !error && suggestions.length === 0 && (
            <Typography variant="caption" color="text.secondary">
              No suggestions available for this day.
            </Typography>
          )}

          {!isLoading && suggestions.length > 0 && (
            <Stack spacing={1.5}>
              {suggestions.map((suggestion) => (
                <Box
                  key={suggestion.id}
                  sx={{
                    borderRadius: 1.5,
                    border: "1px solid",
                    borderColor: "divider",
                    p: 1.5,
                    display: "flex",
                    flexDirection: "column",
                    gap: 0.75,
                  }}
                >
                  {/* Category badge row */}
                  {suggestion.category && (
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                        color: categoryColor(suggestion.category),
                      }}
                    >
                      <SuggestionIcon category={suggestion.category} />
                      <Typography variant="caption" fontWeight={600} color="inherit">
                        {suggestion.category}
                      </Typography>
                    </Box>
                  )}

                  <Typography variant="body2">
                    {suggestion.title}
                  </Typography>

                  {suggestion.event_name && (
                    <Typography variant="body2" color="text.secondary">
                      Event: {suggestion.event_name}
                    </Typography>
                  )}

                  {suggestion.description && (
                    <Typography variant="body2" color="text.secondary">
                      {suggestion.description}
                    </Typography>
                  )}

                  {suggestion.distance_from_user && (
                    <Typography variant="body2" color="text.secondary">
                      Distance: {suggestion.distance_from_user}
                    </Typography>
                  )}

                  {suggestion.participants_summary && (
                    <Typography variant="body2" color="text.secondary">
                      Participants: {suggestion.participants_summary}
                    </Typography>
                  )}

                  {suggestion.reminder && (
                    <Typography variant="body2" color="text.secondary">
                      Reminder: {suggestion.reminder}
                    </Typography>
                  )}
                </Box>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}