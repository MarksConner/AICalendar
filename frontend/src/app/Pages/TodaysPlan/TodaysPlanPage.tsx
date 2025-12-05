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
import { useState, useEffect } from "react";
import type { DailyTimelineItem } from "../../Types/Calendar";
import { fetchTodayTimeline } from "../../api/Today";

export const TodaysPlanPage = () => {
  const navigate = useNavigate();

  const [items, setItems] = useState<DailyTimelineItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newDescription, setNewDescription] = useState("");

  useEffect(() => {
    fetchTodayTimeline()
      .then((data) => {
        setItems(data);
        setIsLoading(false);
      })
      .catch(() => {
        setError("Could not load today\u2019s plan.");
        setIsLoading(false);
      });
  }, []);

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

    const newItem: DailyTimelineItem = {
      id: Date.now().toString(),
      startTime: newTime,
      title: newTitle,
      description: newDescription || undefined,
      status: "default",
    };

    setItems((prev) =>
      [...prev, newItem].sort((a, b) => a.startTime.localeCompare(b.startTime))
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
          {isLoading && (
            <p className="text-sm text-muted">Loading today&apos;s plan…</p>
          )}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          {!isLoading && !error && items.length === 0 && (
            <p className="text-sm text-muted">
              No events yet. Use &quot;Add task&quot; to start planning your day.
            </p>
          )}
          {!isLoading &&
            !error &&
            items.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className="w-full text-left"
                onClick={() => navigate(`/events/${item.id}`)}
              >
                <TimelineRow
                  time={item.startTime}
                  title={item.title}
                  description={item.description}
                  status={item.status}
                  className={index !== items.length - 1 ? "pb-2" : ""}
                />
              </button>
            ))}
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