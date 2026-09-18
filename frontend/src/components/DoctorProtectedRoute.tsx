import { Navigate, Outlet } from 'react-router-dom';
import { useDoctorAuth } from '../context/DoctorAuthContext';

export function DoctorProtectedRoute() {
  const { token } = useDoctorAuth();

  if (!token) {
    return <Navigate to="/doctor/login" replace />;
  }

  return <Outlet />;
}
