import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AdminAuthProvider } from './context/AdminAuthContext';
import { DoctorAuthProvider } from './context/DoctorAuthContext';
import { Navbar } from './components/Navbar';
import { AdminNavbar } from './components/AdminNavbar';
import { DoctorNavbar } from './components/DoctorNavbar';
import { Footer } from './components/Footer';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminProtectedRoute } from './components/AdminProtectedRoute';
import { DoctorProtectedRoute } from './components/DoctorProtectedRoute';
import { DoctorListPage } from './pages/DoctorListPage';
import { DoctorProfilePage } from './pages/DoctorProfilePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { MyAppointmentsPage } from './pages/MyAppointmentsPage';
import { ChatPage } from './pages/ChatPage';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminPendingDoctorsPage } from './pages/admin/AdminPendingDoctorsPage';
import { AdminDoctorDetailPage } from './pages/admin/AdminDoctorDetailPage';
import { DoctorLoginPage } from './pages/doctor/DoctorLoginPage';
import { DoctorRegisterPage } from './pages/doctor/DoctorRegisterPage';
import { DoctorDashboardPage } from './pages/doctor/DoctorDashboardPage';
import { DoctorAvailabilityPage } from './pages/doctor/DoctorAvailabilityPage';
import { DoctorAppointmentsPage } from './pages/doctor/DoctorAppointmentsPage';

function PatientLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />
      <div className="flex-1">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
}

function AdminLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <AdminNavbar />
      <div className="flex-1">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
}

function DoctorLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <DoctorNavbar />
      <div className="flex-1">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AdminAuthProvider>
          <DoctorAuthProvider>
            <Routes>
              <Route element={<PatientLayout />}>
                <Route path="/" element={<DoctorListPage />} />
                <Route path="/doctors/:id" element={<DoctorProfilePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
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

              <Route element={<DoctorLayout />}>
                <Route path="/doctor/login" element={<DoctorLoginPage />} />
                <Route path="/doctor/register" element={<DoctorRegisterPage />} />
                <Route element={<DoctorProtectedRoute />}>
                  <Route path="/doctor" element={<DoctorDashboardPage />} />
                  <Route path="/doctor/availability" element={<DoctorAvailabilityPage />} />
                  <Route path="/doctor/appointments" element={<DoctorAppointmentsPage />} />
                </Route>
              </Route>
            </Routes>
          </DoctorAuthProvider>
        </AdminAuthProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
