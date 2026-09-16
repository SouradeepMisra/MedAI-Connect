import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AdminAuthProvider } from './context/AdminAuthContext';
import { Navbar } from './components/Navbar';
import { AdminNavbar } from './components/AdminNavbar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminProtectedRoute } from './components/AdminProtectedRoute';
import { DoctorListPage } from './pages/DoctorListPage';
import { DoctorProfilePage } from './pages/DoctorProfilePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { MyAppointmentsPage } from './pages/MyAppointmentsPage';
import { ChatPage } from './pages/ChatPage';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminPendingDoctorsPage } from './pages/admin/AdminPendingDoctorsPage';
import { AdminDoctorDetailPage } from './pages/admin/AdminDoctorDetailPage';

function PatientLayout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <Outlet />
    </div>
  );
}

function AdminLayout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNavbar />
      <Outlet />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AdminAuthProvider>
          <Routes>
            <Route element={<PatientLayout />}>
              <Route path="/" element={<DoctorListPage />} />
              <Route path="/doctors/:id" element={<DoctorProfilePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/my-appointments" element={<MyAppointmentsPage />} />
                <Route path="/chat" element={<ChatPage />} />
              </Route>
            </Route>

            <Route element={<AdminLayout />}>
              <Route path="/admin/login" element={<AdminLoginPage />} />
              <Route element={<AdminProtectedRoute />}>
                <Route path="/admin" element={<AdminPendingDoctorsPage />} />
                <Route path="/admin/doctors/:id" element={<AdminDoctorDetailPage />} />
              </Route>
            </Route>
          </Routes>
        </AdminAuthProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
