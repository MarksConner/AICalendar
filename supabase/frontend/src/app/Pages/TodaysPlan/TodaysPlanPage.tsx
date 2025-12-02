import { TimelineRow } from "../../design_system/components/ui/TimelineRow";

export const TodaysPlanPage = () => {
  return (
    <div className="space-y-4 max-w-xl">
      <h1 className="text-2xl font-semibold">Today&apos;s plan</h1>
      <p className="text-sm text-muted">
        Timeline and tasks for today will go here.
      </p>

      <div className="space-y-2">
        <TimelineRow
          time="09:00"
          title="Deep work: OS project"
          description="Finish the memory management section."
          status="completed"
        />
        <TimelineRow
          time="11:00"
          title="Team sync – AI Calendar"
          description="Review UI progress and next steps."
          status="active"
        />
        <TimelineRow
          time="14:00"
          title="Study: SVMs quiz"
          description="Do practice problems and review notes."
          status="default"
        />
      </div>
    </div>
  );
};