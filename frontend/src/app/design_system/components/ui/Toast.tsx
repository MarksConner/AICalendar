import type { JSX } from "react";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import type { PaperProps } from "@mui/material/Paper";
import type { SxProps, Theme } from "@mui/material/styles";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastProps extends Omit<PaperProps, "children" | "variant"> {
  variant?: ToastVariant;
  title: string;
  description?: string;
  onClose?: () => void;
}

const icons: Record<ToastVariant, JSX.Element> = {
  success: <CheckCircle2 size={20} />,
  error: <AlertCircle size={20} />,
  info: <Info size={20} />,
};
const iconColors: Record<ToastVariant, (theme: Theme) => string> = {
  success: (theme) => theme.palette.success.main,
  error: (theme) => theme.palette.error.main,
  info: (theme) => theme.palette.primary.main,
};

export const Toast = ({
  variant = "info",
  title,
  description,
  onClose,
  className = "",
  sx,
  ...props
}: ToastProps): JSX.Element => {
  const baseSx: SxProps<Theme> = {
    display: "flex",
    alignItems: "flex-start",
    gap: 1.5,
    p: 2,
    bgcolor: "background.paper",
    borderColor: "divider",
    borderRadius: 2,
    boxShadow: "0 10px 25px rgba(15, 23, 42, 0.08)",
    maxWidth: 384,
  };
  const mergedSx = (Array.isArray(sx) ? [baseSx, ...sx] : [baseSx, sx]).filter(
    Boolean
  ) as SxProps<Theme>;

  return (
    <Paper
      {...props}
      className={className}
      variant="outlined"
      sx={mergedSx}
    >
      <Box sx={{ flexShrink: 0, mt: 0.5, color: iconColors[variant] }}>
        {icons[variant]}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" color="text.primary">
          {title}
        </Typography>
        {description && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
            {description}
          </Typography>
        )}
      </Box>
      {onClose && (
        <IconButton
          size="small"
          onClick={onClose}
          aria-label="Close"
          sx={{ color: "text.secondary" }}
        >
          <X size={16} />
        </IconButton>
      )}
    </Paper>
  );
};
