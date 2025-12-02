import {
  Card,
  CardHeader,
  CardContent,
} from "../../design_system/components/ui/Card";
import { Button } from "../../design_system/components/ui/Button";
import { Chip } from "../../design_system/components/ui/Chip";

export const ProposalsPage = () => {
  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-semibold">Proposed plans</h1>
      <p className="text-sm text-muted">
        These are AI-generated schedule options based on your constraints.
      </p>

      <div className="space-y-3">
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Balanced afternoon</h2>
              <Chip label="Recommended" variant="primary" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted">
              Spreads deep work blocks with short breaks and moves non-urgent
              meetings to tomorrow.
            </p>
            <div className="flex gap-2 mt-2">
              <Button size="sm">Accept</Button>
              <Button size="sm" variant="secondary">
                Compare
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};