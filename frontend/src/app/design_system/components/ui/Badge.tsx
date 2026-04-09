import Chip from "@mui/material/Chip";
import type { ChipProps } from "@mui/material/Chip";
import type { SxProps, Theme } from "@mui/material/styles";
import type { ReactNode } from "react";
import { alpha } from "@mui/material/styles";

export type BadgeVariant = "default" | "success" | "warning" | "error" | "info";

export interface BadgeProps
  extends Omit<ChipProps, "children" | "color" | "size" | "label" | "variant"> {
  variant?: BadgeVariant;
  children: ReactNode;
}

const variantSx: Record<BadgeVariant, SxProps<Theme>> = {
  default: {
    bgcolor: "action.hover",
    color: "text.primary",
  },
  success: {
    bgcolor: (theme) => alpha(theme.palette.success.main, 0.16),
    color: (theme) => theme.palette.success.dark,
  },
  warning: {
    bgcolor: (theme) => alpha(theme.palette.warning.main, 0.16),
    color: (theme) => theme.palette.warning.dark,
  },
  error: {
    bgcolor: (theme) => alpha(theme.palette.error.main, 0.16),
    color: (theme) => theme.palette.error.dark,
  },
  info: {
    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
    color: (theme) => theme.palette.primary.main,
  },
};

export function Badge({ variant = "default", sx, children, ...props }: BadgeProps) {
  const baseSx: SxProps<Theme> = {
    height: 20,
    borderRadius: 999,
    fontSize: "0.75rem",
    "& .MuiChip-label": {
      px: 1,
      py: 0,
    },
  };
  const mergedSx = (
    Array.isArray(sx) ? [baseSx, variantSx[variant], ...sx] : [baseSx, variantSx[variant], sx]
  ).filter(Boolean) as SxProps<Theme>;

  return (
    <Chip
      {...props}
      size="small"
      variant="filled"
      label={children}
      sx={mergedSx}
    />
  );
}
