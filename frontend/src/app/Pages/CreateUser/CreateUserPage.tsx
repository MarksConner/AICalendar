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
import CreateUserClient from "../../api_client/CreateUserClient";
import LoginClient from "../../api_client/Auth"; 

export const CreateUserPage = () => {
  const navigate = useNavigate();
  const [first_name, setFirstName] = useState("");
  const [last_name, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!first_name || !last_name || !email || !password || !confirmPassword || !username) {
      setError("Please fill out all fields.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setIsSubmitting(true);

      const api = new CreateUserClient();

      const res = await api.createUser({
        email,
        username,
        first_name,
        last_name,
        password,
      });

      const body = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(body?.detail || body?.message || "Failed to create account");
      }
      const verifyRes = await new LoginClient().sendVerificationEmail(email);

      if (!verifyRes.ok) {
        const vbody = await verifyRes.json().catch(() => null);
        console.warn("Verification email failed:", vbody);
      }
      navigate("/login");
    } catch (e: any) {
      setError(e?.message || "Failed to create account.");
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
                label="First Name"
                placeholder="Jane"
                value={first_name}
                onChange={(event) => setFirstName(event.target.value)}
              />
              <Input
                label="Last Name"
                placeholder="Doe"
                value={last_name}
                onChange={(event) => setLastName(event.target.value)}
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
                label="Username"
                placeholder="janedoe"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
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