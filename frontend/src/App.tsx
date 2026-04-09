import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

const LoginPage = lazy(() =>
  import("./app/Pages/Login/LoginPage").then((module) => ({
    default: module.LoginPage,
  }))
);
const CreateUserPage = lazy(() =>
  import("./app/Pages/CreateUser/CreateUserPage").then((module) => ({
    default: module.CreateUserPage,
  }))
);
const RecoverAccountPage = lazy(() =>
  import("./app/Pages/RecoverAccount/RecoverAccountPage").then((module) => ({
    default: module.RecoverAccountPage,
  }))
);
const TodaysPlanPage = lazy(() =>
  import("./app/Pages/TodaysPlan/TodaysPlanPage").then((module) => ({
    default: module.TodaysPlanPage,
  }))
);
const EventDetailsPage = lazy(() =>
  import("./app/Pages/EventDetails/EventDetailsPage").then((module) => ({
    default: module.EventDetailsPage,
  }))
);
const ProposalsPage = lazy(() =>
  import("./app/Pages/Proposals/ProposalsPage").then((module) => ({
    default: module.ProposalsPage,
  }))
);
const AppShell = lazy(() =>
  import("./app/AppShell").then((module) => ({
    default: module.AppShell,
  }))
);

function RouteFallback() {
  return <div style={{ padding: "1rem" }}>Loading…</div>;
}

function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* Public route */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/create-user" element={<CreateUserPage />} />
        <Route path="/recover-account" element={<RecoverAccountPage />} />

        {/* App routes inside shell */}
        <Route element={<AppShell />}>
          <Route path="/" element={<TodaysPlanPage />} />
          <Route path="/today" element={<TodaysPlanPage />} />
          <Route path="/events/:eventId" element={<EventDetailsPage />} />
          <Route path="/proposals" element={<ProposalsPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;
