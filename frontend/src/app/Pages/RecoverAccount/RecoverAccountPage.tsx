/* Frontend page where the User can reset their password to regain access to their account
Written by: Byron Billy
FRs: 4 UC: 3 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import LoginClient from "../../api_client/Auth";
import { createAppTheme } from "../../muiTheme";

const lightTheme = createAppTheme("light");


export const RecoverAccountPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);

    if (!email) {
      setMessage("Please enter your email.");
      return;
    }
    const client = new LoginClient();
    await client.SendRecoverPasswordEmail(email);
    if (!client) {
      setMessage("Failed to send recovery email. Please try again later.");
      return;
    }
    setMessage("Check your email for the recovery link.");
    
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(155deg, #1252c8 0%, #7e97d6 45%, #6218d9 100%)",
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
        width: "100%", maxWidth: 440,
        background: "rgba(255, 255, 255, 0.88)",
        backdropFilter: "blur(24px)",
        border: "1px solid rgba(255, 255, 255, 0.35)",
        boxShadow: "0 12px 40px rgba(0, 0, 0, 0.35)",
        position: "relative", zIndex: 1,
      }}>
        <CardHeader sx={{ textAlign: "center" }}>
          <Typography variant="h5" fontWeight={600}>
            Recover your account
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            We&apos;ll email you a link to reset your password.
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
                onChange={(event) => setEmail(event.target.value)}
              />

              {message && (
                <Typography
                  variant="body2"
                  color={message.startsWith("Check") ? "text.secondary" : "error"}
                >
                  {message}
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
              {isSubmitting ? "Sending link…" : "Send recovery link"}
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