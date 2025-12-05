import { Routes, Route, Navigate } from "react-router-dom";
import { LoginPage } from "./app/Pages/Login/LoginPage";
import { DashboardPage } from "./app/Pages/Dashboard/DashboardPage";
import { TodaysPlanPage } from "./app/Pages/TodaysPlan/TodaysPlanPage";
import { EventDetailsPage } from "./app/Pages/EventDetails/EventDetailsPage";
import { ProposalsPage } from "./app/Pages/Proposals/ProposalsPage";
import { AppShell } from "./app/AppShell";
import { CreateUser } from "./app/Pages/CreateUser/CreateUser";
import {ChatPage}  from "./app/Pages/Chat/Chat";
import { CreateCalendar } from "./app/Pages/CreateCalendar/CreateCalendar";
import { ProvideEmail  }  from "./app/Pages/ResetLogin/ProvideEmail";
import { ResetLogin } from "./app/Pages/ResetLogin/ResetLogin";

function App() {
  return (
    <Routes>
      {/* Public route */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/provideemail" element={<ProvideEmail />} />
      <Route path="/createuser" element={<CreateUser />} />
      <Route path="/resetlogin" element={<ResetLogin />} />
       
      {/* App routes inside shell */}
      <Route element={<AppShell />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/today" element={<TodaysPlanPage />} />
        <Route path="/events/:eventId" element={<EventDetailsPage />} />
        <Route path="/proposals" element={<ProposalsPage />} />
        <Route path="/chat" element={<ChatPage />}/>
        <Route path="/createcalendar" element={<CreateCalendar />} />


      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;