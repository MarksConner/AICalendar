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

//Declare Login page as a React functional component. This means that LoginPage is a function that returns JSX to render the login interface.
export const LoginPage = () => {
  const [email, SetEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
    
      const response = await fetch("http://127.0.0.1:8000/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        console.log("Login failed response body:", errData);
        setSuccess(false);
        setError(errData?.detail ?? "Login failed");
        return;
      }
//If the response is correct , it parses the JSON data and updates the messages state with the retrieved messages.
//Console logs for debugging purposes.
      const data = await response.json();
      console.log("JSON:", data);
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("user_id", data.user_id);
      console.log("Stored user_id:", data.user_id);
      setSuccess(true);

//Navigate to the main dashboard page /
      navigate("/");
    } catch (error) {

      setError("Unexpected error during login");
      setSuccess(false);
    } finally {
      console.log("Request has finished");
    }
  };

  return (
    <div className="login-root">
      <form onSubmit={onSubmit}>
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
              value={email}
              onChange={(e) => SetEmail(e.target.value)}
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              className="mt-3"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
              <form action="/provide-email" method="get">
                <button type="button" className="text-primary hover:underline" onClick ={() => navigate("/provideemail")}>
                  Forgot password?
                </button>
              </form>
            </div>
            {error && (
              <p className="text-sm text-red-600 text-center">
                Errors during login, please try again. Click forgot password to recover your account.
                <br/>
                <span className="text-xs">{error}</span>
              </p>
            )}
            <Button className="w-full mt-2">Log in</Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
};