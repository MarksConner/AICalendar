/**
 * Mock adapter — mirrors httpDataService.ts method-for-method using local data.
 * Active when VITE_DATA_SOURCE=mock (the default). No backend needed.
 *
 * Mock data is stored in localStorage so it persists across page reloads.
 * To reset it, run this in the browser console: localStorage.clear()
 *
 * When you add a new method to AppDataService in contracts.ts, you must add
 * a matching stub here — TypeScript will error if any method is missing.
 */
import { createUser as mockCreateUser, login as mockLogin } from "../../api/Auth";
import { fetchMonthEvents as mockFetchMonthEvents } from "../../api/Calendar";
import {
  createDayTimelineItem as mockCreateDayTimelineItem,
  deleteDayTimelineItem as mockDeleteDayTimelineItem,
  fetchDayTimeline as mockFetchDayTimeline,
  getDaySchedulingHints as mockGetDaySchedulingHints,
  updateDayTimelineItem as mockUpdateDayTimelineItem,
} from "../../api/Today";
import { getDayAiSuggestions as mockGetDayAiSuggestions } from "../../api/AiSuggestions";
import type { AppDataService } from "../contracts";

export const mockDataService: AppDataService = {
  login(email, password) {
    return mockLogin(email, password);
  },
  createUser(payload) {
    return mockCreateUser(
      payload.email,
      payload.username,
      payload.first_name,
      payload.last_name,
      payload.password
    );
  },
  fetchMonthEvents(year, monthIndex) {
    return mockFetchMonthEvents(year, monthIndex);
  },
  fetchDayTimeline(date) {
    return mockFetchDayTimeline(date);
  },
  getDaySchedulingHints(date, request) {
    return mockGetDaySchedulingHints(date, request);
  },
  createDayEvent(date, input) {
    return mockCreateDayTimelineItem(date, {
      name: input.name,
      start: input.start,
      end: input.end ?? input.start,
      description: input.description,
      priority: input.priority ?? 0,
      location: input.location ?? null,
      flexible: input.flexible ?? false,
      travel_time_min: input.travel_time_min ?? 0,
    });
  },
  updateDayEvent(date, eventId, updates) {
    return mockUpdateDayTimelineItem(date, eventId, updates);
  },
  deleteDayEvent(date, eventId) {
    return mockDeleteDayTimelineItem(date, eventId);
  },
  getDayAiSuggestions(date, items) {
    return mockGetDayAiSuggestions(date, items);
  },
};
