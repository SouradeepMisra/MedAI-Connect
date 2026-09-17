import { Link, useNavigate } from 'react-router-dom';
import { useDoctorAuth } from '../context/DoctorAuthContext';

export function DoctorNavbar() {
  const { doctor, logout } = useDoctorAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/doctor/login');
  }

  return (
    <nav className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
      <Link to="/doctor" className="text-lg font-semibold text-slate-900">
        MedAI Connect Doctor
      </Link>
      {doctor && (
        <div className="flex items-center gap-6 text-sm">
          <Link to="/doctor" className="text-slate-600 hover:text-slate-900">
            Dashboard
          </Link>
          <Link to="/doctor/availability" className="text-slate-600 hover:text-slate-900">
            Availability
          </Link>
          <Link to="/doctor/appointments" className="text-slate-600 hover:text-slate-900">
            Appointments
          </Link>
          <span className="text-slate-500">Dr. {doctor.name}</span>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-white hover:bg-slate-700"
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}
