import { Routes, Route, Navigate } from "react-router-dom";
import { LoginPage } from "./app/Pages/Login/LoginPage";
import { ResetLogin } from "./app/Pages/ResetLogin/ResetLogin";
import { ProvideEmail } from "./app/Pages/ResetLogin/ProvideEmail";
import { CreateUser } from "./app/Pages/CreateUser/CreateUser";
import { DashboardPage } from "./app/Pages/Dashboard/DashboardPage";
import { TodaysPlanPage } from "./app/Pages/TodaysPlan/TodaysPlanPage";
import { EventDetailsPage } from "./app/Pages/EventDetails/EventDetailsPage";
import ChatPage from "./app/Pages/Chat/Chat";
import { ProposalsPage } from "./app/Pages/Proposals/ProposalsPage";
import { AppShell } from "./app/AppShell";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AppShell />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/today" element={<TodaysPlanPage />} />
        <Route path="/events/:eventId" element={<EventDetailsPage />} />
        <Route path="/createUser" element={<CreateUser/>} />
        <Route path="/proposals" element={<ProposalsPage />} />
        <Route path="/reset-password" element={<ResetLogin />} />
        <Route path="/provide-email" element={<ProvideEmail/>} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/chat/:chatId" element={<ChatPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;