import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AdminLoginPage from "@/pages/AdminLoginPage";
import AdminDashboardPage from "@/pages/AdminDashboardPage";
import DailyTrackerPage from "@/pages/DailyTrackerPage";
import ReportDetailsPage from "@/pages/ReportDetailsPage";
import ManageMenteesPage from "@/pages/ManageMenteesPage";
import AdminProtectedRoute from "@/components/AdminProtectedRoute";
import AdminLayout from "@/components/AdminLayout";

function ProtectedPage({ children }: { children: React.ReactNode }) {
  return (
    <AdminProtectedRoute>
      <AdminLayout>{children}</AdminLayout>
    </AdminProtectedRoute>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<AdminLoginPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedPage>
              <AdminDashboardPage />
            </ProtectedPage>
          }
        />
        <Route
          path="/tracker"
          element={
            <ProtectedPage>
              <DailyTrackerPage />
            </ProtectedPage>
          }
        />
        <Route
          path="/mentees"
          element={
            <ProtectedPage>
              <ManageMenteesPage />
            </ProtectedPage>
          }
        />
        <Route
          path="/reports/:reportId"
          element={
            <ProtectedPage>
              <ReportDetailsPage />
            </ProtectedPage>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
