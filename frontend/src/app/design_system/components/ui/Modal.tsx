import type { ReactNode, JSX } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import IconButton from "@mui/material/IconButton";
import Box from "@mui/material/Box";
import type { DialogProps } from "@mui/material/Dialog";
import type { SxProps, Theme } from "@mui/material/styles";
import { X } from "lucide-react";

export interface ModalProps extends Omit<DialogProps, "open" | "onClose"> {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  className = "",
  PaperProps,
  ...props
}: ModalProps): JSX.Element => {
  const handleClose: DialogProps["onClose"] = () => {
    onClose();
  };

  const basePaperSx: SxProps<Theme> = {
    width: "100%",
    maxWidth: 512,
    maxHeight: "90vh",
    display: "flex",
    flexDirection: "column",
    borderRadius: 2,
  };
  const mergedPaperSx: SxProps<Theme> = !PaperProps?.sx
    ? basePaperSx
    : Array.isArray(PaperProps.sx)
    ? [basePaperSx, ...PaperProps.sx]
    : [basePaperSx, PaperProps.sx];

  const mergedPaperProps: DialogProps["PaperProps"] = {
    ...PaperProps,
    className: [PaperProps?.className, className].filter(Boolean).join(" ") || undefined,
    sx: mergedPaperSx,
  };

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      scroll="paper"
      PaperProps={mergedPaperProps}
      {...props}
    >
      {title && (
        <DialogTitle sx={{ p: 3, borderBottom: "1px solid", borderColor: "divider" }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
            <span>{title}</span>
            <IconButton onClick={onClose} aria-label="Close">
              <X size={20} />
            </IconButton>
          </Box>
        </DialogTitle>
      )}
      <DialogContent sx={{ p: 3 }}>{children}</DialogContent>
      {footer && (
        <DialogActions
          sx={{
            p: 3,
            pt: 0,
            gap: 1,
            borderTop: "1px solid",
            borderColor: "divider",
            justifyContent: "flex-end",
          }}
        >
          {footer}
        </DialogActions>
      )}
    </Dialog>
  );
};
