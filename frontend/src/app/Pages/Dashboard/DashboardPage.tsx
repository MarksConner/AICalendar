import {
  Card,
  CardHeader,
  CardContent,
} from "../../design_system/components/ui/Card";
import { Badge } from "../../design_system/components/ui/Badge";

export const DashboardPage = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Badge variant="info">Week overview</Badge>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Calendar overview</h2>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted">
            Week / month calendar grid will go here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};