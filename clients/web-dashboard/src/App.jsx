import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import EstablishmentsPage from "./pages/EstablishmentsPage.jsx";
import PaymentsPage from "./pages/PaymentsPage.jsx";
import AnnouncementsPage from "./pages/AnnouncementsPage.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<Layout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/establishments" element={<EstablishmentsPage />} />
        <Route path="/payments" element={<PaymentsPage />} />
        <Route path="/announcements" element={<AnnouncementsPage />} />
      </Route>
    </Routes>
  );
}
