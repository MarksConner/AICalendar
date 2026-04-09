import type { ReactNode, JSX } from "react";
import Drawer from "@mui/material/Drawer";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import type { DrawerProps } from "@mui/material/Drawer";
import type { SxProps, Theme } from "@mui/material/styles";
import { X } from "lucide-react";

export interface SidePanelProps extends Omit<DrawerProps, "open" | "onClose"> {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  side?: 'left' | 'right';
}

export const SidePanel = ({
  isOpen,
  onClose,
  title,
  children,
  side = "right",
  className = "",
  PaperProps,
  ...props
}: SidePanelProps): JSX.Element => {
  const basePaperSx: SxProps<Theme> = {
    width: "100%",
    maxWidth: 448,
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 10px 25px rgba(15, 23, 42, 0.08)",
  };
  const mergedPaperSx: SxProps<Theme> = !PaperProps?.sx
    ? basePaperSx
    : Array.isArray(PaperProps.sx)
    ? [basePaperSx, ...PaperProps.sx]
    : [basePaperSx, PaperProps.sx];

  const mergedPaperProps: DrawerProps["PaperProps"] = {
    ...PaperProps,
    className:
      [PaperProps?.className, className].filter(Boolean).join(" ") || undefined,
    sx: mergedPaperSx,
  };

  return (
    <Drawer
      anchor={side}
      open={isOpen}
      onClose={onClose}
      PaperProps={mergedPaperProps}
      {...props}
    >
      {title && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            p: 3,
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Typography variant="h6" fontWeight={600}>
            {title}
          </Typography>
          <IconButton onClick={onClose} aria-label="Close">
            <X size={20} />
          </IconButton>
        </Box>
      )}
      <Box sx={{ flex: 1, overflowY: "auto", p: 3 }}>
        {children}
      </Box>
    </Drawer>
  );
};
