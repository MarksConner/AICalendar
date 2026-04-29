import { useNavigate } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
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
import { useEffect, useState } from "react";
import LoginClient  from "../../api_client/Auth";
import { createAppTheme } from "../../muiTheme";
import { consumeSessionTimeoutMessage } from "../../services/auth/sessionTimeout";

const lightTheme = createAppTheme("light");

export const LoginPage = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timeoutMessage = consumeSessionTimeoutMessage();
    if (timeoutMessage) {
      setError(timeoutMessage);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setIsLoading(true);
    try {
      const api = new LoginClient();
      const res = await api.login(email, password);

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.message || "Login failed");
      }

      // We store the token in localStorage so other parts of the app can read it.
      const data = await res.json();
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      localStorage.setItem("user_id", data.user_id);
      localStorage.setItem("token_type", data.token_type);

      // Navigate to app dashboard after successful login
      navigate("/today");
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
        background: "linear-gradient(145deg, #1252c8 0%, #7e97d6 45%, #7c2ff7c8 100%)",
        px: 2,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background orbs for depth */}
      <Box sx={{
        position: "absolute", width: 500, height: 500, borderRadius: "50%",
        background: "rgba(123, 47, 247, 0.25)", filter: "blur(90px)",
        top: "-15%", right: "-10%", pointerEvents: "none",
      }} />
      <Box sx={{
        position: "absolute", width: 350, height: 350, borderRadius: "50%",
        background: "rgba(30, 60, 114, 0.35)", filter: "blur(70px)",
        bottom: "-5%", left: "-8%", pointerEvents: "none",
      }} />
      <Box sx={{
        position: "absolute", width: 250, height: 250, borderRadius: "50%",
        background: "rgba(42, 82, 152, 0.3)", filter: "blur(60px)",
        top: "40%", left: "20%", pointerEvents: "none",
      }} />

      <ThemeProvider theme={lightTheme}>
      <Card variant="elevated" sx={{
        width: "100%", maxWidth: 400,
        background: "rgba(255, 255, 255, 0.88)",
        backdropFilter: "blur(24px)",
        border: "1px solid rgba(255, 255, 255, 0.35)",
        boxShadow: "0 12px 40px rgba(0, 0, 0, 0.35)",
        position: "relative", zIndex: 1,
      }}>
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
      </ThemeProvider>
    </Box>
  );
};