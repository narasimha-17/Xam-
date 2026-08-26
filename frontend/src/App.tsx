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
import { Dashboard } from "./pages/Dashboard";
import { Subjects } from "./pages/Subjects";
import { SubjectDetail } from "./pages/SubjectDetail";
import { ExamBuilder } from "./pages/admin/ExamBuilder";
import { QuestionReports } from "./pages/admin/QuestionReports";
import { StudentsProgress } from "./pages/admin/StudentsProgress";
import { StudentDetail } from "./pages/admin/StudentDetail";
import { UserManagement } from "./pages/admin/UserManagement";
import { PlatformDashboard } from "./pages/admin/PlatformDashboard";
import { SubjectExamAdmin } from "./pages/admin/SubjectExamAdmin";
import { PdfAdmin } from "./pages/admin/PdfAdmin";
import { PuzzleAdmin } from "./pages/admin/PuzzleAdmin";
import { ActivityLogs } from "./pages/admin/ActivityLogs";
import { ExamPreview } from "./pages/admin/ExamPreview";
import { ExamTake } from "./pages/ExamTake";
import { ExamResult } from "./pages/ExamResult";
import { Discussion } from "./pages/Discussion";
import { SubjectDiscussion } from "./pages/SubjectDiscussion";
import { ThreadDetail } from "./pages/ThreadDetail";
import { Progress } from "./pages/Progress";
import { StudyPlanner } from "./pages/StudyPlanner";
import { DailyPuzzle } from "./pages/DailyPuzzle";
import { CodingPractice } from "./pages/CodingPractice";
import { CodingProblemSolve } from "./pages/CodingProblemSolve";
import { MockInterview } from "./pages/MockInterview";
import { DevPractice } from "./pages/DevPractice";
import { Jobs } from "./pages/Jobs";
import { Companies } from "./pages/Companies";
import { CompanyDetail } from "./pages/CompanyDetail";
import { CompanyAdmin } from "./pages/admin/CompanyAdmin";
import { AiRadar } from "./pages/AiRadar";
import { Courses } from "./pages/Courses";
import { CoursePlayer } from "./pages/CoursePlayer";
import { Competitions } from "./pages/Competitions";
import { CompetitionRoom } from "./pages/CompetitionRoom";
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
          <Route path="/reset-password" element={<Navigate to="/forgot-password" replace />} />
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
            path="/admin/students/:userId"
            element={
              <RoleRoute role="admin">
                <AppShell>
                  <StudentDetail />
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
            path="/admin/subjects"
            element={
              <RoleRoute role="admin">
                <AppShell>
                  <SubjectExamAdmin />
                </AppShell>
              </RoleRoute>
            }
          />
          <Route
            path="/admin/pdfs"
            element={
              <RoleRoute role="admin">
                <AppShell>
                  <PdfAdmin />
                </AppShell>
              </RoleRoute>
            }
          />
          <Route
            path="/admin/puzzles"
            element={
              <RoleRoute role="admin">
                <AppShell>
                  <PuzzleAdmin />
                </AppShell>
              </RoleRoute>
            }
          />
          <Route
            path="/admin/logs"
            element={
              <RoleRoute role="admin">
                <AppShell>
                  <ActivityLogs />
                </AppShell>
              </RoleRoute>
            }
          />
          <Route
            path="/admin/exams/:id/preview"
            element={
              <RoleRoute role="admin">
                <AppShell>
                  <ExamPreview />
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
            path="/planner"
            element={
              <ProtectedRoute>
                <AppShell>
                  <StudyPlanner />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/puzzle"
            element={
              <ProtectedRoute>
                <AppShell>
                  <DailyPuzzle />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/coding"
            element={
              <ProtectedRoute>
                <AppShell>
                  <CodingPractice />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/coding/:id"
            element={
              <ProtectedRoute>
                <AppShell>
                  <CodingProblemSolve />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/mock-interview"
            element={
              <ProtectedRoute>
                <AppShell>
                  <MockInterview />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dev-practice"
            element={
              <ProtectedRoute>
                <AppShell>
                  <DevPractice />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/jobs"
            element={
              <ProtectedRoute>
                <AppShell>
                  <Jobs />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/companies"
            element={
              <ProtectedRoute>
                <AppShell>
                  <Companies />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/companies/:id"
            element={
              <ProtectedRoute>
                <AppShell>
                  <CompanyDetail />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/companies"
            element={
              <RoleRoute role="admin">
                <AppShell>
                  <CompanyAdmin />
                </AppShell>
              </RoleRoute>
            }
          />
          <Route
            path="/ai-radar"
            element={
              <ProtectedRoute>
                <AppShell>
                  <AiRadar />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/courses"
            element={
              <ProtectedRoute>
                <AppShell>
                  <Courses />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/courses/:id"
            element={
              <ProtectedRoute>
                <AppShell>
                  <CoursePlayer />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/competitions"
            element={
              <ProtectedRoute>
                <AppShell>
                  <Competitions />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/competitions/:roomId"
            element={
              <ProtectedRoute>
                <AppShell>
                  <CompetitionRoom />
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
