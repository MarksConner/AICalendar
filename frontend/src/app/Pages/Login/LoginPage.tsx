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
    <div className="login-root">
      <Card variant="elevated" className="login-card">
        <CardHeader>
          <h1 className="text-2xl font-semibold text-center">
            Welcome to our AI-Agent Scheduler
          </h1>
        </CardHeader>

        <CardContent className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            className="mt-2"
          />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            className="mt-3"
          />
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs text-muted w-full">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="h-3 w-3 rounded border border-border"
              />
              <span>Remember me</span>
            </label>
            <button type="button" className="text-primary hover:underline">
              Forgot password?
            </button>
          </div>

          <Button className="w-full mt-2">Log in</Button>
        </CardFooter>
      </Card>
    </div>
  );
};