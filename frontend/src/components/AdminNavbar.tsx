import { Link, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';

export function AdminNavbar() {
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/admin/login');
  }

  return (
    <nav className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-6 py-4">
      <Link to="/admin" className="text-lg font-semibold text-white">
        MedAI Connect Admin
      </Link>
      {admin && (
        <div className="flex items-center gap-4 text-sm">
          <span className="text-slate-300">{admin.name}</span>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-md bg-white px-3 py-1.5 text-slate-900 hover:bg-slate-200"
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}
