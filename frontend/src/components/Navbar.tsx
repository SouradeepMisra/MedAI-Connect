import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
        <Link to="/" className="text-slate-600 hover:text-slate-900">
          Find Doctors
        </Link>
        {patient ? (
          <>
            <Link to="/my-appointments" className="text-slate-600 hover:text-slate-900">
              My Appointments
            </Link>
            <Link to="/chat" className="text-slate-600 hover:text-slate-900">
              AI Symptom Chat
            </Link>
            <span className="text-slate-500">Hi, {patient.name}</span>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-md bg-slate-900 px-3 py-1.5 text-white hover:bg-slate-700"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="text-slate-600 hover:text-slate-900">
              Login
            </Link>
            <Link
              to="/register"
              className="rounded-md bg-slate-900 px-3 py-1.5 text-white hover:bg-slate-700"
            >
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
