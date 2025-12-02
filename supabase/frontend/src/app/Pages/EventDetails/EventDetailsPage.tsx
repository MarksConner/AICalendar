import { useParams } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "../../design_system/components/ui/Card";
import { Badge } from "../../design_system/components/ui/Badge";
import { Button } from "../../design_system/components/ui/Button";

export const EventDetailsPage = () => {
  const { eventId } = useParams();

  return (
    <div className="space-y-4 max-w-xl">
      <h1 className="text-2xl font-semibold">Event details</h1>
      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Event #{eventId}</h2>
            <Badge variant="info">AI-scheduled</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted">
            Detailed info for this event will go here (time, location, notes,
            constraints, etc.).
          </p>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button variant="ghost" size="sm">
            Cancel
          </Button>
          <Button size="sm">Reschedule</Button>
        </CardFooter>
      </Card>
    </div>
  );
};