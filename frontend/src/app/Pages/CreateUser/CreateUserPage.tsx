import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { keyframes } from "@mui/system";
import { ThemeProvider } from "@mui/material/styles";
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
import { createAppTheme } from "../../muiTheme";

const lightTheme = createAppTheme("light");

const floatAnim = keyframes`
  0%, 100% { transform: translateY(0px); }
  50%       { transform: translateY(-14px); }
`;

const fadeInAnim = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
`;

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

      const res = await api.createUser({email,username,first_name,last_name,password,});

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
        background: "linear-gradient(135deg, #1252c8 0%, #7e97d6 45%, #7b2ff7 100%)",
        px: 2,
        position: "relative",
        overflow: "hidden",
      }}
    >
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

      <Box sx={{
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: 2, position: "relative", zIndex: 1, width: "100%", maxWidth: 460,
      }}>
        <Typography
          sx={{
            fontSize: "clamp(3rem, 8vw, 5.5rem)",
            fontWeight: 800,
            letterSpacing: "0.08em",
            color: "rgba(255, 255, 255, 0.96)",
            textShadow: "0 0 60px rgba(56, 199, 251, 0.81)",
            userSelect: "none",
            pointerEvents: "none",
            animation: `${fadeInAnim} 1s ease-out forwards, ${floatAnim} 5s ease-in-out 1s infinite`,
          }}
        >
          Welcome
        </Typography>

        <ThemeProvider theme={lightTheme}>
        <Card variant="elevated" sx={{
          width: "100%",
          background: "rgba(255, 255, 255, 0.88)",
          backdropFilter: "blur(24px)",
          border: "1px solid rgba(255, 255, 255, 0.35)",
          boxShadow: "0 12px 40px rgba(0, 0, 0, 0.35)",
        }}>
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
                placeholder="Create a password (min 6 characters)"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <Input
                label="Confirm password"
                type="password"
                placeholder="Re-enter your password (min 6 characters)"
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
            <Typography variant="body2" color="text.secondary" align="center">
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
      </ThemeProvider>
      </Box>
    </Box>
  );
};