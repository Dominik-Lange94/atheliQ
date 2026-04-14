import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { ThemeProvider } from "./hooks/useTheme";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import AthleteDashboard from "./pages/athlete/AthleteDashboard";
import CoachDashboard from "./pages/coach/CoachDashboard";
import OnboardingPage from "./pages/onboarding/OnboardingPage";
import ChatPage from "./pages/chat/ChatPage";
import GlobalChatNotifier from "./components/chat/GlobalChatNotifier";
import AthleteProfileSettingsPage from "./pages/athlete/AthleteProfileSettingsPage";
import AthleteAnalyzePage from "./pages/athlete/AthleteAnalyzePage";
import CoachAthleteAnalyzePage from "./pages/coach/CoachAthleteAnalyzePage";

const ProtectedRoute = ({
  children,
  role,
}: {
  children: React.ReactNode;
  role?: "athlete" | "coach";
}) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center text-muted">
        Loading…
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;

  const isAthlete = user.role === "athlete";
  const needsOnboarding = isAthlete && !user.onboardingCompleted;
  const isOnboardingRoute = location.pathname === "/onboarding";

  if (needsOnboarding && !isOnboardingRoute) {
    return <Navigate to="/onboarding" replace />;
  }

  if (isAthlete && user.onboardingCompleted && isOnboardingRoute) {
    return <Navigate to="/athlete" replace />;
  }

  return <>{children}</>;
};

const RoleRedirect = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;

  if (user.role === "coach") return <Navigate to="/coach" replace />;

  return (
    <Navigate
      to={user.onboardingCompleted ? "/athlete" : "/onboarding"}
      replace
    />
  );
};

function AppChrome() {
  const location = useLocation();

  const hideChatNotifier =
    location.pathname === "/login" ||
    location.pathname === "/register" ||
    location.pathname === "/onboarding";

  return <>{!hideChatNotifier && <GlobalChatNotifier />}</>;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppChrome />
          <Routes>
            <Route path="/" element={<RoleRedirect />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route
              path="/onboarding"
              element={
                <ProtectedRoute role="athlete">
                  <OnboardingPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/athlete"
              element={
                <ProtectedRoute role="athlete">
                  <AthleteDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/athlete/settings/profile"
              element={
                <ProtectedRoute role="athlete">
                  <AthleteProfileSettingsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/athlete/analyze"
              element={
                <ProtectedRoute role="athlete">
                  <AthleteAnalyzePage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/coach"
              element={
                <ProtectedRoute role="coach">
                  <CoachDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/coach/athlete/:athleteId/analyze"
              element={
                <ProtectedRoute role="coach">
                  <CoachAthleteAnalyzePage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <ChatPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
