import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "../../design_system/components/ui/Card";
import { Button } from "../../design_system/components/ui/Button";
import { Input } from "../../design_system/components/ui/Input";
import { login } from "../../api/Auth";

export const LoginPage = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await login(email, password);

      // For now, store the token in localStorage so other parts of the app
      // (or future auth context) can read it.
      localStorage.setItem("authToken", result.token);
      localStorage.setItem("authEmail", result.user.email);

      // Navigate to dashboard after successful login
      navigate("/");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Login failed. Please try again.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-root">
      <Card variant="elevated" className="login-card">
        <CardHeader>
          <h1 className="text-2xl font-semibold text-center">
            Welcome to our AI-Agent Scheduler
          </h1>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {error && (
              <p className="text-body text-destructive" style={{ marginTop: 8 }}>
                {error}
              </p>
            )}
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

            <Button className="w-full mt-1" type="submit" disabled={isLoading}>
              {isLoading ? "Logging in…" : "Log in"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};