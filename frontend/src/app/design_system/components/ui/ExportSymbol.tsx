import Button from "@mui/material/Button";
import SvgIcon from "@mui/material/SvgIcon";

function DownloadSymbol(props: any) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M5 20h14v-2H5v2zm7-18v10.17l3.59-3.58L17 10l-5 5-5-5 1.41-1.41L11 12.17V2h1z" />
    </SvgIcon>
  );
}

export default function ExportButton() {
  return (
    <Button variant="contained" startIcon={<DownloadSymbol />}>
      Export
    </Button>
  );
}