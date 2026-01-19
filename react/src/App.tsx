import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { EventProvider } from "@/contexts/EventContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AutoConnect } from "@/components/AutoConnect";
import { Navigation } from "@/components/Navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { HomePage } from "@/pages/HomePage";
import { AuthPage } from "@/pages/AuthPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { SettingsPage } from "@/pages/SettingsPage";

/**
 * Layout wrapper with navigation
 */
function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main>{children}</main>
    </div>
  );
}

/**
 * Protected layout with EventProvider for event-driven state
 */
function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <EventProvider>
      <Layout>{children}</Layout>
    </EventProvider>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AutoConnect>
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route
                path="/"
                element={
                  <Layout>
                    <HomePage />
                  </Layout>
                }
              />
              <Route path="/auth" element={<AuthPage />} />

              {/* Private routes - wrapped with ProtectedRoute and EventProvider */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <ProtectedLayout>
                      <DashboardPage />
                    </ProtectedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <ProtectedLayout>
                      <SettingsPage />
                    </ProtectedLayout>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </BrowserRouter>
        </AutoConnect>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
