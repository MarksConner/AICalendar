import Map, { Marker } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import Box from "@mui/material/Box";
import { MapPin } from "lucide-react";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string;

interface EventMapProps {
  latitude: number;
  longitude: number;
}

/**
 * Embedded interactive map that shows a pin at the event's location.
 * scroll-zoom is intentionally disabled so users don't accidentally zoom
 * the map while scrolling through the event details dialog.
 */
export const EventMap = ({ latitude, longitude }: EventMapProps) => (
  <Box sx={{ height: 200, borderRadius: 1, overflow: "hidden" }}>
    <Map
      mapboxAccessToken={MAPBOX_TOKEN}
      initialViewState={{ latitude, longitude, zoom: 14 }}
      style={{ width: "100%", height: "100%" }}
      mapStyle="mapbox://styles/mapbox/streets-v12"
      scrollZoom={false}
    >
      <Marker latitude={latitude} longitude={longitude} anchor="bottom">
        <MapPin size={28} color="#e53935" fill="#e53935" />
      </Marker>
    </Map>
  </Box>
);
