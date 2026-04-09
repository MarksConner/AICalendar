/**
 * Single entry point for all data access in the app.
 * Here is where we import `dataService` — never import httpDataService or mockDataService directly.
 *
 * Switch between mock and real backend via .env.local:
 *   VITE_DATA_SOURCE=mock  -> uses local mock data, no backend needed (default), what I use for dev mode
 *   VITE_DATA_SOURCE=api   -> loads from our FastAPI server
 *
 * Also set the API base URL when using the real backend to avoid blocks from browser:
 *   VITE_API_BASE_URL=http://localhost:8000
 */
import type { AppDataService } from "./contracts";
import { httpDataService } from "./adapters/http/httpDataService";
import { mockDataService } from "./adapters/mockDataService";

export type DataSource = "mock" | "api";

function readDataSource(): DataSource {
  const raw = import.meta.env.VITE_DATA_SOURCE?.trim().toLowerCase();

  if (!raw || raw === "mock") {
    return "mock";
  }
  if (raw === "api") {
    return "api";
  }

  console.warn(
    `Unknown VITE_DATA_SOURCE "${raw}". Falling back to "mock".`
  );
  return "mock";
}

export const DATA_SOURCE = readDataSource();

export const dataService: AppDataService =
  DATA_SOURCE === "api" ? httpDataService : mockDataService;

console.log("VITE_DATA_SOURCE =", import.meta.env.VITE_DATA_SOURCE);
console.log("dataService =", dataService);
console.log("DATA_SOURCE =", DATA_SOURCE);

export type {
  AppDataService,
  CreateDayEventInput,
  CreateUserPayload,
  CreateUserResult,
  DaySchedulingHints,
  DaySchedulingHintsRequest,
  LoginResponse,
  UpdateDayEventInput,
} from "./contracts";
