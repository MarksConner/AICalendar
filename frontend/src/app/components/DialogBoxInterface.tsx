import type { ReactNode } from "react";
import Dialog from "@mui/material/Dialog";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";

type DialogBoxInterfaceProps = {
  open: boolean;
  title: string;
  content: ReactNode;
  actions: ReactNode;
  onClose: () => void;
};

export const DialogBoxInterface: React.FC<DialogBoxInterfaceProps> = ({open,title,content,actions,onClose,}) => {
  return (
    <Dialog open={open} onClose={onClose}>
      <Box sx={{ p: 2, minWidth: 320 }}>
        <Stack spacing={2}>
          <Box component="h2" sx={{ m: 0 }}>
            {title}
          </Box>

          <Box>{content}</Box>

          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
            {actions}
          </Box>
        </Stack>
      </Box>
    </Dialog>
  );
};