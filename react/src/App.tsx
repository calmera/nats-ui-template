import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AutoConnect } from "@/components/AutoConnect";
import { Navigation } from "@/components/Navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { HomePage } from "@/pages/HomePage";
import { AuthPage } from "@/pages/AuthPage";
import { DashboardPage } from "@/pages/DashboardPage";

/**
 * Layout wrapper with navigation
 */
function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main>{children}</main>
    </div>
  );
}

function App() {
  return (
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

            {/* Private routes - wrapped with ProtectedRoute */}
            <Route
              path="/dashboard"
              element={
                <Layout>
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                </Layout>
              }
            />
          </Routes>
        </BrowserRouter>
      </AutoConnect>
    </AuthProvider>
  );
}

export default App;
