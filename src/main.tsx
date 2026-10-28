import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import App from "./App";
import DashboardPage from "./pages/Dashboard";
import ComparePage from "./pages/Compare";
import ReportsPage from "./pages/Reports";
import ProfilePage from "./pages/Profile";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<App />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>
);

