import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TimelineRow } from "../../design_system/components/ui/TimelineRow";
import {
  Card,
  CardHeader,
  CardContent,
} from "../../design_system/components/ui/Card";
import { Banner } from "../../design_system/components/ui/Banner";
import { Button } from "../../design_system/components/ui/Button";
import { Modal } from "../../design_system/components/ui/Modal";
import { Input } from "../../design_system/components/ui/Input";

type TodayEventStatus = "default" | "active" | "completed";

interface TodayEvent {
  id: string;
  time: string; // HH:MM (for now)
  title: string;
  description?: string;
  status: TodayEventStatus;
}

const initialEvents: TodayEvent[] = [
  {
    id: "101",
    time: "09:00",
    title: "Deep work – OS project",
    description: "Finish memory management section.",
    status: "completed",
  },
  {
    id: "102",
    time: "11:00",
    title: "Team sync – AI Calendar",
    description: "Review UI progress and next steps.",
    status: "active",
  },
  {
    id: "103",
    time: "14:00",
    title: "Study block – SVMs",
    description: "Quiz prep and practice problems.",
    status: "default",
  },
  {
    id: "104",
    time: "17:30",
    title: "Gym + unwind",
    description: "Strength training and cooldown.",
    status: "default",
  },
];

export const TodaysPlanPage = () => {
  const navigate = useNavigate();

  const [events, setEvents] = useState<TodayEvent[]>(initialEvents);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const handleOpenAdd = () => {
    setNewTitle("");
    setNewTime("");
    setNewDescription("");
    setIsAddOpen(true);
  };

  const handleAddTask = () => {
    if (!newTitle || !newTime) {
      // in the future we could show a Banner/Toast error
      return;
    }

    const newEvent: TodayEvent = {
      id: Date.now().toString(),
      time: newTime,
      title: newTitle,
      description: newDescription || undefined,
      status: "default",
    };

    setEvents((prev) =>
      [...prev, newEvent].sort((a, b) => a.time.localeCompare(b.time))
    );
    setIsAddOpen(false);
  };

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Today&apos;s plan</h1>
          <p className="text-sm text-muted">
            A timeline of your day with AI-powered insights.
          </p>
        </div>
        <Button size="sm" onClick={handleOpenAdd}>
          Add task
        </Button>
      </div>

      {/* AI insight banner */}
      <Banner
        variant="info"
        title="AI suggestion"
        message="If you leave by 10:35 AM, you’ll arrive on time for your team sync, accounting for traffic and buffer time."
      />

      {/* Timeline card */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Timeline</h2>
        </CardHeader>
        <CardContent className="space-y-2">
          {events.map((event, index) => (
            <button
              key={event.id}
              type="button"
              className="w-full text-left"
              onClick={() => navigate(`/events/${event.id}`)}
            >
              <TimelineRow
                time={event.time}
                title={event.title}
                description={event.description}
                status={event.status}
                className={index !== events.length - 1 ? "pb-2" : ""}
              />
            </button>
          ))}
          {events.length === 0 && (
            <p className="text-sm text-muted">
              No events yet. Use &quot;Add task&quot; to start planning your day.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Add Task modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add task"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddTask}>Save</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input
            label="Title"
            placeholder="e.g., Deep work – ML project"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <Input
            label="Time"
            placeholder="HH:MM (24h)"
            value={newTime}
            onChange={(e) => setNewTime(e.target.value)}
          />
          <Input
            label="Description (optional)"
            placeholder="Short note about this task"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
};