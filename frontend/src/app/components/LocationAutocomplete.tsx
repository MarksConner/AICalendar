/* File that handles the autocomplete feature when adding a location in Events or Tasks
Written by: Byron Billy
FRs: 13 */
import { useState, useEffect, useRef, useCallback } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { Input } from "../design_system/components/ui/Input";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string;

interface MapboxFeature {
  id: string;
  place_name: string; // full formatted address
  text: string;       // short place name (venue, street, etc.)
  center: [number, number]; // [lng, lat]
}

interface LocationAutocompleteProps {
  value: string;
  // coords are provided when user picks a suggestion; undefined when typing freely
  onChange: (address: string, coords?: [number, number]) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function LocationAutocomplete({
  value,
  onChange,
  label = "Location",
  placeholder = "Search for a place...",
  disabled = false,
}: LocationAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<MapboxFeature[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // prevents re-fetching after user selects a suggestion
  const suppressFetch = useRef(false);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2 || !MAPBOX_TOKEN) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    try {
      const encoded = encodeURIComponent(query);
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?autocomplete=true&limit=5&access_token=${MAPBOX_TOKEN}`
      );
      if (!res.ok) return;
      const data = await res.json();
      const features: MapboxFeature[] = data.features ?? [];
      setSuggestions(features);
      setIsOpen(features.length > 0);
      setActiveIndex(-1);
    } catch {
      // silently fail — user can still type a location manually
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val); // propagate raw typed value immediately
    suppressFetch.current = false;

    // debounce API calls to avoid firing on every keystroke
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      if (!suppressFetch.current) fetchSuggestions(val);
    }, 300);
  };

  const handleSelect = (feature: MapboxFeature) => {
    suppressFetch.current = true;
    setSuggestions([]);
    setIsOpen(false);
    setActiveIndex(-1);
    onChange(feature.place_name, feature.center);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  // close dropdown when clicking outside the component
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // cleanup pending debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  // strip the short name prefix from place_name to get the address remainder
  const getSecondaryText = (feature: MapboxFeature): string => {
    const full = feature.place_name;
    const name = feature.text;
    if (full.startsWith(name)) {
      return full.substring(name.length).replace(/^,\s*/, "");
    }
    return full;
  };

  return (
    <Box ref={containerRef} sx={{ position: "relative", width: "100%" }}>
      <Input
        label={label}
        placeholder={placeholder}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        autoComplete="off"
        fullWidth
      />
      {isOpen && suggestions.length > 0 && (
        <Paper
          elevation={4}
          sx={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 1300,
            mt: 0.5,
            borderRadius: 1,
            overflow: "hidden",
          }}
        >
          {suggestions.map((feature, index) => (
            <Box
              key={feature.id}
              onMouseDown={(e) => {
                // prevent input blur from firing before the click registers
                e.preventDefault();
                handleSelect(feature);
              }}
              sx={{
                px: 2,
                py: 1.25,
                cursor: "pointer",
                bgcolor: index === activeIndex ? "action.selected" : "background.paper",
                "&:hover": { bgcolor: "action.hover" },
                borderBottom: index < suggestions.length - 1 ? "1px solid" : "none",
                borderColor: "divider",
              }}
            >
              {/* Short name (venue / street) on top, full address below */}
              <Typography variant="body2" fontWeight={500} noWrap>
                {feature.text}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {getSecondaryText(feature)}
              </Typography>
            </Box>
          ))}
        </Paper>
      )}
    </Box>
  );
}
