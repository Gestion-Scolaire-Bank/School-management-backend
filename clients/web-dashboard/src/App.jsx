import { Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/toast";
import Layout from "./components/Layout.jsx";
import RequireAuth from "./components/RequireAuth.jsx";
import RequireRole from "./components/RequireRole.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import EstablishmentsPage from "./pages/EstablishmentsPage.jsx";
import PaymentsPage from "./pages/PaymentsPage.jsx";
import AnnouncementsPage from "./pages/AnnouncementsPage.jsx";
import GradesPage from "./pages/GradesPage.jsx";
import PresencePage from "./pages/PresencePage.jsx";
import ResourcesPage from "./pages/ResourcesPage.jsx";
import ChildPage from "./pages/ChildPage.jsx";
import RegistrationPage from "./pages/RegistrationPage.jsx";
import UsersPage from "./pages/UsersPage.jsx";
import NotificationsPage from "./pages/NotificationsPage.jsx";
import FeePaymentPage from "./pages/FeePaymentPage.jsx";
import ClassesPage from "./pages/ClassesPage.jsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx";
import StatusPage from "./pages/StatusPage.jsx";
import DesignSamplePage from "./pages/DesignSamplePage.jsx";
import SchoolIdManagementPage from "./pages/SchoolIdManagementPage.jsx";

export default function App() {
  return (
    <Toaster>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<RequireRole />}>
            <Route element={<Layout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/registrations" element={<RegistrationPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/status" element={<StatusPage />} />
              <Route path="/fees" element={<FeePaymentPage />} />
              <Route path="/establishments" element={<EstablishmentsPage />} />
              <Route path="/classes" element={<ClassesPage />} />
              <Route path="/payments" element={<PaymentsPage />} />
              <Route path="/grades" element={<GradesPage />} />
              <Route path="/presence" element={<PresencePage />} />
              <Route path="/resources" element={<ResourcesPage />} />
              <Route path="/announcements" element={<AnnouncementsPage />} />
              <Route path="/child" element={<ChildPage />} />
              <Route path="/design-samples" element={<DesignSamplePage />} />
              <Route path="/school-ids" element={<SchoolIdManagementPage />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </Toaster>
  );
}
