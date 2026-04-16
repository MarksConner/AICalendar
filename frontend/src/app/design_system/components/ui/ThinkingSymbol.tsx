import { CircularProgress } from "@mui/material";

export function ThinkingSymbol() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "8px",
      }}
      aria-label="Thinking"
    >
      <CircularProgress size={20} thickness={5} />
    </div>
  );
}