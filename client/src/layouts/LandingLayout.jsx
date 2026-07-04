import { Outlet, Navigate } from 'react-router-dom';
import useAuthStore from '../store/authStore.js';
import Navbar from '../components/common/Navbar.jsx';

const LandingLayout = () => {
  const { isAuthenticated, user } = useAuthStore();

  if (isAuthenticated && user) {
    return <Navigate to={`/${user.role}/dashboard`} replace />;
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <Outlet />
    </div>
  );
};

export default LandingLayout;
