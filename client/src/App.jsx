import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { Suspense, lazy, useEffect } from 'react';

import useAuthStore from './store/authStore.js';
import { SocketProvider } from './context/SocketContext.jsx';

// Layouts
import LandingLayout from './layouts/LandingLayout.jsx';
import DashboardLayout from './layouts/DashboardLayout.jsx';
import AuthLayout from './layouts/AuthLayout.jsx';

// Guards
import ProtectedRoute from './components/common/ProtectedRoute.jsx';
import RoleRoute from './components/common/RoleRoute.jsx';

// Pages — Lazy loaded for code splitting
const Landing = lazy(() => import('./pages/Landing.jsx'));
const Login = lazy(() => import('./pages/auth/Login.jsx'));
const Signup = lazy(() => import('./pages/auth/Signup.jsx'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword.jsx'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword.jsx'));
const VerifyEmail = lazy(() => import('./pages/auth/VerifyEmail.jsx'));

// Donor
const DonorDashboard = lazy(() => import('./pages/donor/Dashboard.jsx'));
const DonorDonations = lazy(() => import('./pages/donor/Donations.jsx'));
const AddDonation = lazy(() => import('./pages/donor/AddDonation.jsx'));
const EditDonation = lazy(() => import('./pages/donor/EditDonation.jsx'));
const DonationDetail = lazy(() => import('./pages/donor/DonationDetail.jsx'));
const DonorAnalytics = lazy(() => import('./pages/donor/Analytics.jsx'));
const DonorFeedback = lazy(() => import('./pages/donor/Feedback.jsx'));
const DonorNotifications = lazy(() => import('./pages/donor/Notifications.jsx'));
const DonorProfile = lazy(() => import('./pages/donor/Profile.jsx'));

// Receiver
const ReceiverDashboard = lazy(() => import('./pages/receiver/Dashboard.jsx'));
const BrowseDonations = lazy(() => import('./pages/receiver/Browse.jsx'));
const ReceiverRequests = lazy(() => import('./pages/receiver/Requests.jsx'));
const ReceivedItems = lazy(() => import('./pages/receiver/ReceivedItems.jsx'));
const ReceiverFeedback = lazy(() => import('./pages/receiver/Feedback.jsx'));
const ReceiverNotifications = lazy(() => import('./pages/receiver/Notifications.jsx'));
const ReceiverProfile = lazy(() => import('./pages/receiver/Profile.jsx'));

// Admin
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard.jsx'));
const AdminUsers = lazy(() => import('./pages/admin/Users.jsx'));
const AdminPendingDonations = lazy(() => import('./pages/admin/PendingDonations.jsx'));
const AdminPendingRequests = lazy(() => import('./pages/admin/PendingRequests.jsx'));
const AdminMatching = lazy(() => import('./pages/admin/Matching.jsx'));
const AdminAnalytics = lazy(() => import('./pages/admin/Analytics.jsx'));
const AdminAuditLogs = lazy(() => import('./pages/admin/AuditLogs.jsx'));
const AdminNotifications = lazy(() => import('./pages/admin/Notifications.jsx'));

// Loading fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-950">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 rounded-full border-4 border-primary-600/30 border-t-primary-600 animate-spin" />
      <p className="text-gray-400 text-sm font-medium">Loading...</p>
    </div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: (failureCount, error) => {
        if (error?.response?.status === 401) return false;
        if (error?.response?.status === 403) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      onError: (error) => {
        console.error('Mutation error:', error);
      },
    },
  },
});

function App() {
  const { fetchMe, isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (localStorage.getItem('accessToken')) {
      fetchMe();
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SocketProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public Landing */}
              <Route element={<LandingLayout />}>
                <Route index element={<Landing />} />
              </Route>

              {/* Auth Pages */}
              <Route element={<AuthLayout />}>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password/:token" element={<ResetPassword />} />
                <Route path="/verify-email/:token" element={<VerifyEmail />} />
              </Route>

              {/* Donor Routes */}
              <Route element={<ProtectedRoute />}>
                <Route element={<RoleRoute allowedRoles={['donor']} />}>
                  <Route element={<DashboardLayout role="donor" />}>
                    <Route path="/donor/dashboard" element={<DonorDashboard />} />
                    <Route path="/donor/donations" element={<DonorDonations />} />
                    <Route path="/donor/donations/new" element={<AddDonation />} />
                    <Route path="/donor/donations/:id" element={<DonationDetail />} />
                    <Route path="/donor/donations/:id/edit" element={<EditDonation />} />
                    <Route path="/donor/analytics" element={<DonorAnalytics />} />
                    <Route path="/donor/feedback" element={<DonorFeedback />} />
                    <Route path="/donor/notifications" element={<DonorNotifications />} />
                    <Route path="/donor/profile" element={<DonorProfile />} />
                    <Route path="/donor" element={<Navigate to="/donor/dashboard" replace />} />
                  </Route>
                </Route>
              </Route>

              {/* Receiver Routes */}
              <Route element={<ProtectedRoute />}>
                <Route element={<RoleRoute allowedRoles={['receiver']} />}>
                  <Route element={<DashboardLayout role="receiver" />}>
                    <Route path="/receiver/dashboard" element={<ReceiverDashboard />} />
                    <Route path="/receiver/browse" element={<BrowseDonations />} />
                    <Route path="/receiver/requests" element={<ReceiverRequests />} />
                    <Route path="/receiver/received" element={<ReceivedItems />} />
                    <Route path="/receiver/feedback" element={<ReceiverFeedback />} />
                    <Route path="/receiver/notifications" element={<ReceiverNotifications />} />
                    <Route path="/receiver/profile" element={<ReceiverProfile />} />
                    <Route path="/receiver" element={<Navigate to="/receiver/dashboard" replace />} />
                  </Route>
                </Route>
              </Route>

              {/* Admin Routes */}
              <Route element={<ProtectedRoute />}>
                <Route element={<RoleRoute allowedRoles={['admin']} />}>
                  <Route element={<DashboardLayout role="admin" />}>
                    <Route path="/admin/dashboard" element={<AdminDashboard />} />
                    <Route path="/admin/users" element={<AdminUsers />} />
                    <Route path="/admin/donations/pending" element={<AdminPendingDonations />} />
                    <Route path="/admin/requests/pending" element={<AdminPendingRequests />} />
                    <Route path="/admin/matching" element={<AdminMatching />} />
                    <Route path="/admin/analytics" element={<AdminAnalytics />} />
                    <Route path="/admin/audit-logs" element={<AdminAuditLogs />} />
                    <Route path="/admin/notifications" element={<AdminNotifications />} />
                    <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
                  </Route>
                </Route>
              </Route>

              {/* Redirect authenticated users */}
              <Route
                path="/dashboard"
                element={
                  isAuthenticated && user
                    ? <Navigate to={`/${user.role}/dashboard`} replace />
                    : <Navigate to="/login" replace />
                }
              />

              {/* 404 */}
              <Route path="*" element={
                <div className="min-h-screen flex items-center justify-center bg-gray-950">
                  <div className="text-center space-y-4">
                    <div className="text-8xl font-black gradient-text">404</div>
                    <p className="text-gray-400 text-xl">Page not found</p>
                    <a href="/" className="btn-primary">Go Home</a>
                  </div>
                </div>
              } />
            </Routes>
          </Suspense>
        </BrowserRouter>

        <Toaster
          position="top-right"
          gutter={8}
          containerStyle={{ top: 80 }}
          toastOptions={{
            className: 'toast-custom',
            duration: 4000,
            success: { icon: '✅' },
            error: { icon: '❌', duration: 6000 },
          }}
        />
      </SocketProvider>
    </QueryClientProvider>
  );
}

export default App;
