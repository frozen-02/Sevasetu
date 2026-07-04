import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../../store/authStore.js';

const RoleRoute = ({ allowedRoles }) => {
  const { user } = useAuthStore();

  if (!user || !allowedRoles.includes(user.role)) {
    const redirectPath = user ? `/${user.role}/dashboard` : '/login';
    return <Navigate to={redirectPath} replace />;
  }

  return <Outlet />;
};

export default RoleRoute;
