import type { DailyTimelineItem } from "../Types/Calendar";

const MOCK_TODAY_ITEMS: DailyTimelineItem[] = [
  {
    id: "t1",
    startTime: "09:00",
    endTime: "10:00",
    title: "Deep work – OS project",
    description: "Finish memory management section.",
    status: "completed",
  },
  {
    id: "t2",
    startTime: "11:00",
    endTime: "12:00",
    title: "Team sync – AI Calendar",
    description: "Review UI progress and next steps.",
    status: "active",
  },
  {
    id: "t3",
    startTime: "14:00",
    endTime: "15:00",
    title: "Study block – SVMs",
    status: "default",
  },
];

export async function fetchTodayTimeline(): Promise<DailyTimelineItem[]> {
  await new Promise((resolve) => setTimeout(resolve, 300)); // fake delay
  return MOCK_TODAY_ITEMS;
}