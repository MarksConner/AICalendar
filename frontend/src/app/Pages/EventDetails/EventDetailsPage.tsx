/* Handles Event details so that when clicked it shows more info for an Event and allows editing, and deletion
Written by: Byron Billy
FRs: 10, 11, 15, 19, 20. UC: 9 and 11 */
import { useParams } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "../../design_system/components/ui/Card";
import { Badge } from "../../design_system/components/ui/Badge";
import { Button } from "../../design_system/components/ui/Button";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

export const EventDetailsPage = () => {
  const { eventId } = useParams();

  return (
    <Stack spacing={2} sx={{ maxWidth: 576 }}>
      <Typography variant="h5" fontWeight={600}>
        Event details
      </Typography>
      <Card variant="elevated">
        <CardHeader>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
            }}
          >
            <Typography variant="h6" fontWeight={600}>
              Event #{eventId}
            </Typography>
            <Badge variant="info">AI-scheduled</Badge>
          </Box>
        </CardHeader>
        <CardContent>
          <Stack spacing={1}>
            <Typography variant="body2" color="text.secondary">
              Detailed info for this event will go here (time, location, notes,
              constraints, etc.).
            </Typography>
          </Stack>
        </CardContent>
        <CardFooter sx={{ justifyContent: "flex-end", gap: 1 }}>
          <Button variant="ghost" size="sm">
            Cancel
          </Button>
          <Button size="sm">Reschedule</Button>
        </CardFooter>
      </Card>
    </Stack>
  );
};
