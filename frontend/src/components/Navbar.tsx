import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function navLinkClass({ isActive }: { isActive: boolean }) {
  return isActive ? 'font-medium text-teal-600' : 'text-slate-600 hover:text-teal-600';
}

export function Navbar() {
  const { patient, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <nav className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
      <Link to="/" className="text-lg font-semibold text-slate-900">
        MedAI Connect
      </Link>
      <div className="flex items-center gap-6 text-sm">
        <NavLink to="/" end className={navLinkClass}>
          Find Doctors
        </NavLink>
        {patient ? (
          <>
            <NavLink to="/my-appointments" className={navLinkClass}>
              My Appointments
            </NavLink>
            <NavLink to="/chat" className={navLinkClass}>
              AI Symptom Chat
            </NavLink>
            <span className="text-slate-500">Hi, {patient.name}</span>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-md bg-teal-600 px-3 py-1.5 text-white hover:bg-teal-700"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <NavLink to="/login" className={navLinkClass}>
              Login
            </NavLink>
            <Link
              to="/register"
              className="rounded-md bg-teal-600 px-3 py-1.5 text-white hover:bg-teal-700"
            >
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
