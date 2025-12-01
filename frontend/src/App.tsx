import { Routes, Route, Navigate } from "react-router-dom";
import { LoginPage } from "./app/Pages/Login/LoginPage";
import { DashboardPage } from "./app/Pages/Dashboard/DashboardPage";
import { TodaysPlanPage } from "./app/Pages/TodaysPlan/TodaysPlanPage";
import { EventDetailsPage } from "./app/Pages/EventDetails/EventDetailsPage";
import { ProposalsPage } from "./app/Pages/Proposals/ProposalsPage";
import { AppShell } from "./app/AppShell";

function App() {
  return (
    <Routes>
      {/* Public route */}
      <Route path="/login" element={<LoginPage />} />

      {/* App routes inside shell */}
      <Route element={<AppShell />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/today" element={<TodaysPlanPage />} />
        <Route path="/events/:eventId" element={<EventDetailsPage />} />
        <Route path="/proposals" element={<ProposalsPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;