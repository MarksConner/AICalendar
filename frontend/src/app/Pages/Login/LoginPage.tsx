import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "../../design_system/components/ui/Card";
import { Button } from "../../design_system/components/ui/Button";
import { Input } from "../../design_system/components/ui/Input";

export const LoginPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg text-text">
      <Card variant="elevated" className="w-full max-w-sm">
        <CardHeader>
          <h1 className="text-xl font-semibold">Welcome back</h1>
          <p className="text-sm text-muted">
            Log in to view your AI-powered schedule.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input label="Email" type="email" />
          <Input label="Password" type="password" />
        </CardContent>
        <CardFooter>
          <Button className="w-full mt-2">Log in</Button>
        </CardFooter>
      </Card>
    </div>
  );
};