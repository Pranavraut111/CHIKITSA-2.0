import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { GamificationProvider } from "./contexts/GamificationContext";
import AppLayout from "./layouts/AppLayout";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import MealsPage from "./pages/MealsPage";
import GroceryPage from "./pages/GroceryPage";
import ChatPage from "./pages/ChatPage";
import LogPage from "./pages/LogPage";

import ProfilePage from "./pages/ProfilePage";
import OnboardingPage from "./pages/OnboardingPage";
import MapPage from "./pages/MapPage";
import AchievementsPage from "./pages/AchievementsPage";

import CommunityPage from "./pages/CommunityPage";
import LandingPage from "./pages/LandingPage";

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <GamificationProvider>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/onboarding" element={<OnboardingPage />} />
                <Route path="/meals" element={<MealsPage />} />
                <Route path="/grocery" element={<GroceryPage />} />
                <Route path="/chat" element={<ChatPage />} />
                <Route path="/log" element={<LogPage />} />

                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/map" element={<MapPage />} />
                <Route path="/achievements" element={<AchievementsPage />} />

                <Route path="/community" element={<CommunityPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </GamificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;


