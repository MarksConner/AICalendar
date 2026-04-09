import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "../../design_system/components/ui/Card";
import { Button } from "../../design_system/components/ui/Button";
import { Input } from "../../design_system/components/ui/Input";
import { dataService } from "../../services";

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
      const result = await dataService.login(email, password);

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
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        color: "text.primary",
        px: 2,
      }}
    >
      <Card variant="elevated" sx={{ width: "100%", maxWidth: 400 }}>
        <CardHeader sx={{ textAlign: "center" }}>
          <Typography variant="h5" fontWeight={600}>
            Welcome to our AI-Agent Scheduler
          </Typography>
        </CardHeader>

        <Box component="form" onSubmit={handleSubmit}>
          <CardContent>
            <Stack spacing={2}>
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
                <Typography variant="body2" color="error">
                  {error}
                </Typography>
              )}
            </Stack>
          </CardContent>

          <CardFooter
            sx={{
              flexDirection: "column",
              alignItems: "stretch",
              gap: 2,
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                gap: 2,
              }}
            >
              <FormControlLabel
                control={<Checkbox size="small" />}
                label="Remember me"
                sx={{
                  m: 0,
                  "& .MuiFormControlLabel-label": {
                    fontSize: "0.75rem",
                    color: "text.secondary",
                  },
                }}
              />
              <Link
                component="button"
                type="button"
                underline="hover"
                color="primary"
                variant="caption"
                sx={{ fontWeight: 500 }}
                onClick={() => navigate("/recover-account")}
              >
                Forgot password?
              </Link>
            </Box>

            <Button fullWidth type="submit" disabled={isLoading}>
              {isLoading ? "Logging in…" : "Log in"}
            </Button>
            <Typography variant="caption" color="text.secondary" align="center">
              Don&apos;t have an account?{" "}
              <Link
                component="button"
                type="button"
                underline="hover"
                color="primary"
                onClick={() => navigate("/create-user")}
              >
                Create one
              </Link>
            </Typography>
          </CardFooter>
        </Box>
      </Card>
    </Box>
  );
};
