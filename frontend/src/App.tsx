import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Landing/about page — public default route
const LandingPage = lazy(() =>
  import("./app/Pages/Landing/LandingPage").then((module) => ({
    default: module.LandingPage,
  }))
);

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

const ResetLogin = lazy(() =>
  import("./app/Pages/RecoverAccount/ResetPassword").then((module) => ({
    default: module.ResetLogin,
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
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/create-user" element={<CreateUserPage />} />
        <Route path="/recover-account" element={<RecoverAccountPage />} />
        <Route path="/update" element={<ResetLogin />} />

        {/* App routes inside shell (require auth) */}
        <Route element={<AppShell />}>
          <Route path="/today" element={<TodaysPlanPage />} />
          <Route path="/events/:eventId" element={<EventDetailsPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;
