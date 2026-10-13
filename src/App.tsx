import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AdminProtectedRoute from "@/components/AdminProtectedRoute";
import AdminLayout from "@/components/AdminLayout";

const AdminLoginPage = lazy(() => import("@/pages/AdminLoginPage"));
const AdminDashboardPage = lazy(() => import("@/pages/AdminDashboardPage"));
const DailyTrackerPage = lazy(() => import("@/pages/DailyTrackerPage"));
const ReportDetailsPage = lazy(() => import("@/pages/ReportDetailsPage"));
const ManageMenteesPage = lazy(() => import("@/pages/ManageMenteesPage"));

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
      <Suspense fallback={null}>
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
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
