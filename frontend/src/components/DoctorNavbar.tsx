import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useDoctorAuth } from '../context/DoctorAuthContext';

function navLinkClass({ isActive }: { isActive: boolean }) {
  return isActive ? 'font-medium text-teal-600' : 'text-slate-600 hover:text-teal-600';
}

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
          <NavLink to="/doctor" end className={navLinkClass}>
            Dashboard
          </NavLink>
          <NavLink to="/doctor/availability" className={navLinkClass}>
            Availability
          </NavLink>
          <NavLink to="/doctor/appointments" className={navLinkClass}>
            Appointments
          </NavLink>
          <span className="text-slate-500">Dr. {doctor.name}</span>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-md bg-teal-600 px-3 py-1.5 text-white hover:bg-teal-700"
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}
