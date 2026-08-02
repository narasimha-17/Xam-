import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { ProtectedRoute, RoleRoute } from "./auth/ProtectedRoute";
import { AppShell } from "./components/layout/AppShell";
import { SidebarProvider } from "./components/layout/SidebarContext";
import { FullPageLoader } from "./components/ui/Loader";
import { Landing } from "./pages/Landing";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { ForgotPassword } from "./pages/ForgotPassword";
import { ResetPassword } from "./pages/ResetPassword";
import { Dashboard } from "./pages/Dashboard";
import { Subjects } from "./pages/Subjects";
import { SubjectDetail } from "./pages/SubjectDetail";
import { ExamBuilder } from "./pages/admin/ExamBuilder";
import { QuestionReports } from "./pages/admin/QuestionReports";
import { StudentsProgress } from "./pages/admin/StudentsProgress";
import { UserManagement } from "./pages/admin/UserManagement";
import { PlatformDashboard } from "./pages/admin/PlatformDashboard";
import { ExamTake } from "./pages/ExamTake";
import { ExamResult } from "./pages/ExamResult";
import { Discussion } from "./pages/Discussion";
import { SubjectDiscussion } from "./pages/SubjectDiscussion";
import { ThreadDetail } from "./pages/ThreadDetail";
import { Progress } from "./pages/Progress";
import { Profile } from "./pages/Profile";
import { NotFound } from "./pages/NotFound";

function RootRoute() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <FullPageLoader />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <Landing />;
}

function App() {
  return (
    <AuthProvider>
      <SidebarProvider>
        <Routes>
          <Route path="/" element={<RootRoute />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <AppShell>
                  <Dashboard />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/subjects"
            element={
              <ProtectedRoute>
                <AppShell>
                  <Subjects />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/subjects/:id"
            element={
              <ProtectedRoute>
                <AppShell>
                  <SubjectDetail />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/subjects/:subjectId/exams/new"
            element={
              <RoleRoute role="admin">
                <AppShell>
                  <ExamBuilder />
                </AppShell>
              </RoleRoute>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <RoleRoute role="admin">
                <AppShell>
                  <QuestionReports />
                </AppShell>
              </RoleRoute>
            }
          />
          <Route
            path="/admin/students"
            element={
              <RoleRoute role="admin">
                <AppShell>
                  <StudentsProgress />
                </AppShell>
              </RoleRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <RoleRoute role="admin">
                <AppShell>
                  <UserManagement />
                </AppShell>
              </RoleRoute>
            }
          />
          <Route
            path="/admin/overview"
            element={
              <RoleRoute role="admin">
                <AppShell>
                  <PlatformDashboard />
                </AppShell>
              </RoleRoute>
            }
          />
          <Route
            path="/exams/:id/take"
            element={
              <ProtectedRoute>
                <ExamTake />
              </ProtectedRoute>
            }
          />
          <Route
            path="/exams/attempts/:attemptId"
            element={
              <ProtectedRoute>
                <AppShell>
                  <ExamResult />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/progress"
            element={
              <ProtectedRoute>
                <AppShell>
                  <Progress />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/discussion"
            element={
              <ProtectedRoute>
                <AppShell>
                  <Discussion />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/subjects/:id/discussion"
            element={
              <ProtectedRoute>
                <AppShell>
                  <SubjectDiscussion />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/subjects/:id/discussion/:threadId"
            element={
              <ProtectedRoute>
                <AppShell>
                  <ThreadDetail />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <AppShell>
                  <Profile />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </SidebarProvider>
    </AuthProvider>
  );
}

export default App;
