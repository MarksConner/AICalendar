/**
 * MOCK ONLY — do not import this file outside of mockDataService.ts.
 *
 * When the real LLM endpoint is ready, implement getDayAiSuggestions()
 * in httpDataService.ts using:
 *   requestJson("/ai/day-suggestions", { method: "POST", body: { date, events: items } })
 */
import type { DailyTimelineItem } from "../Types/Calendar";
import type { AiSuggestionsResponse } from "../services/contracts";

const NETWORK_DELAY_MS = 900;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Mock implementation of the AI suggestions endpoint.
 *
 * In production this call hits the backend, which sends the date + schedule
 * context to the LLM and streams back personalised suggestions. The mock
 * returns static placeholder text so the UI can be built and tested before
 * the real endpoint is wired up.
 *
 * Replace this with a real fetch inside httpDataService.getDayAiSuggestions.
 */
export async function getDayAiSuggestions(
  date: Date,
  items: DailyTimelineItem[]
): Promise<AiSuggestionsResponse> {
  await wait(NETWORK_DELAY_MS);

  const eventCount = items.length;
  const dateLabel = date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  // Static mock suggestions — the real backend will generate these from the LLM
  // using the actual schedule context passed in the request body.
  return {
    suggestions: [
      {
        id: "mock-ai-1",
        category: "Schedule Insight",
        text: `You have ${eventCount} event${eventCount !== 1 ? "s" : ""} on ${dateLabel}. Consider blocking a 30-minute buffer between back-to-back meetings to give yourself time to decompress and prepare.`,
      },
      {
        id: "mock-ai-2",
        category: "Tip",
        text: "Your morning looks relatively open. High-focus tasks like deep work or creative projects are best tackled before midday when cognitive energy peaks.",
      },
      {
        id: "mock-ai-3",
        category: "Travel Alert",
        text: "If any of your events require travel, check traffic conditions 30–45 minutes before departure to avoid delays during peak hours.",
      },
    ],
  };
}
