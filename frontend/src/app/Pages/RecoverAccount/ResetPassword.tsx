/* Followup page to Recover Account where the user sets their new password
Written by: Byron Billy
FR: 4 UC: 3 */
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import { createAppTheme } from "../../muiTheme";

const BASE_API_URL = import.meta.env.VITE_BASE_API_URL;
const lightTheme = createAppTheme("light");

export const ResetLogin = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email");
  const token = searchParams.get("token");

  const [new_password, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !token) {
      setError("Invalid or expired reset link.");
      return;
    }

    if (!new_password) {
      setError("Please enter a new password.");
      return;
    }

    if (new_password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${BASE_API_URL}/users/update_password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, new_password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.detail ?? "Invalid or expired token.");
        return;
      }

      navigate("/login", { replace: true });
    } catch (err) {
      console.error(err);
      setError("Server error. Please try again.");
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
        background: "linear-gradient(135deg, #1e3c72 0%, #2a5298 45%, #7b2ff7 100%)",
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

      <ThemeProvider theme={lightTheme}>
        <Card variant="elevated" sx={{
          width: "100%", maxWidth: 420,
          background: "rgba(255, 255, 255, 0.88)",
          backdropFilter: "blur(24px)",
          border: "1px solid rgba(255, 255, 255, 0.35)",
          boxShadow: "0 12px 40px rgba(0, 0, 0, 0.35)",
          position: "relative", zIndex: 1,
        }}>
          <CardHeader sx={{ textAlign: "center" }}>
            <Typography variant="h5" fontWeight={600}>
              Reset your password
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Enter a new password for your account.
            </Typography>
          </CardHeader>

          <Box component="form" onSubmit={onSubmit}>
            <CardContent>
              <Stack spacing={2}>
                <Input
                  label="New password"
                  type="password"
                  placeholder="Create a new password"
                  autoComplete="new-password"
                  value={new_password}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <Input
                  label="Confirm new password"
                  type="password"
                  placeholder="Re-enter your new password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                {error && (
                  <Typography variant="body2" color="error">
                    {error}
                  </Typography>
                )}
              </Stack>
            </CardContent>

            <CardFooter sx={{ flexDirection: "column", alignItems: "stretch", gap: 1.5 }}>
              <Button fullWidth type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Updating…" : "Update password"}
              </Button>
              <Typography variant="caption" color="text.secondary" align="center">
                Remembered your password?{" "}
                <Link
                  component="button"
                  type="button"
                  underline="hover"
                  color="primary"
                  onClick={() => navigate("/login")}
                >
                  Back to login
                </Link>
              </Typography>
            </CardFooter>
          </Box>
        </Card>
      </ThemeProvider>
    </Box>
  );
};
