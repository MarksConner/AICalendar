import { createTheme } from "@mui/material/styles";
import type { PaletteMode } from "@mui/material";

const lightColors = {
  bg: "#f3f4f6",
  surface: "#ffffff",
  text: "#0f172a",
  muted: "#6b7280",
  border: "#e5e7eb",
  primary: "#5a85e2",
  primaryForeground: "#ffffff",
  danger: "#ef4444",
};

const darkColors = {
  bg: "#0f172a",
  surface: "#1e293b",
  text: "#f1f5f9",
  muted: "#94a3b8",
  border: "#334155",
  primary: "#5a85e2",
  primaryForeground: "#ffffff",
  danger: "#ef4444",
};

export function createAppTheme(mode: PaletteMode) {
  const c = mode === "light" ? lightColors : darkColors;

  return createTheme({
    palette: {
      mode,
      primary: {
        main: c.primary,
        contrastText: c.primaryForeground,
      },
      background: {
        default: c.bg,
        paper: c.surface,
      },
      text: {
        primary: c.text,
        secondary: c.muted,
      },
      error: {
        main: c.danger,
      },
      divider: c.border,
    },
    typography: {
      fontFamily:
        'system-ui, -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif',
      button: {
        textTransform: "none",
        fontWeight: 600,
      },
    },
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
      },
      MuiTextField: {
        defaultProps: {
          variant: "outlined",
          size: "small",
          fullWidth: true,
          InputLabelProps: { shrink: true },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            backgroundColor: c.surface,
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: c.border,
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: c.text,
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: c.primary,
            },
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            fontSize: "0.75rem",
            color: c.muted,
            "&.Mui-focused": {
              color: c.text,
            },
          },
        },
      },
      MuiInputBase: {
        styleOverrides: {
          input: {
            "&::placeholder": {
              color: c.muted,
              opacity: 1,
            },
          },
        },
      },
      MuiFormHelperText: {
        styleOverrides: {
          root: {
            marginLeft: 1,
            fontSize: "0.75rem",
          },
        },
      },
    },
  });
}

export const muiTheme = createAppTheme("light");
