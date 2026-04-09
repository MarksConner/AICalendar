import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "@mui/material/Link";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "../../design_system/components/ui/Card";
import { Input } from "../../design_system/components/ui/Input";
import { Button } from "../../design_system/components/ui/Button";
import { dataService } from "../../services";

export const CreateUserPage = () => {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!firstName || !lastName || !username || !email || !password || !confirmPassword) {
      setError("Please fill out all fields.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await dataService.createUser({
        first_name: firstName,
        last_name: lastName,
        username,
        email,
        password,
      });

      if (result?.token) {
        // If backend returns an auth token on create, start session immediately.
        localStorage.setItem("authToken", result.token);
      }

      if (result?.user?.email) {
        localStorage.setItem("authEmail", result.user.email);
      }

      // Successful create in mock mode currently returns no token, so
      // sending them to login keeps behavior predictable.
      if (result?.token) {
        navigate("/");
      } else {
        navigate("/login");
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to create account. Please try again.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
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
      <Card variant="elevated" sx={{ width: "100%", maxWidth: 460 }}>
        <CardHeader sx={{ textAlign: "center" }}>
          <Typography variant="h5" fontWeight={600}>
            Create your account
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Start building schedules with AI assistance.
          </Typography>
        </CardHeader>

        <Box component="form" onSubmit={handleSubmit}>
          <CardContent>
            <Stack spacing={2}>
              <Input
                label="First name"
                placeholder="Jane"
                autoComplete="given-name"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
              />
              <Input
                label="Last name"
                placeholder="Doe"
                autoComplete="family-name"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
              />
              <Input
                label="Username"
                placeholder="janedoe"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
              <Input
                label="Email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <Input
                label="Password"
                type="password"
                placeholder="Create a password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <Input
                label="Confirm password"
                type="password"
                placeholder="Re-enter your password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
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
              gap: 1.5,
            }}
          >
            <Button fullWidth type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating account…" : "Create account"}
            </Button>
            <Typography variant="caption" color="text.secondary" align="center">
              Already have an account?{" "}
              <Link
                component="button"
                type="button"
                underline="hover"
                color="primary"
                onClick={() => navigate("/login")}
              >
                Log in
              </Link>
            </Typography>
          </CardFooter>
        </Box>
      </Card>
    </Box>
  );
};
