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

export const RecoverAccountPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);

    if (!email) {
      setMessage("Please enter your email.");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setMessage("Check your inbox for a recovery link.");
    }, 300);
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
      <Card variant="elevated" sx={{ width: "100%", maxWidth: 440 }}>
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
    </Box>
  );
};
