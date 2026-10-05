import { useEffect, useState } from 'react';
import { cancelAppointment, getMyAppointments } from '../api/appointments';
import { useAuth } from '../context/AuthContext';
import type { Appointment, Doctor } from '../types';

const CANCELLATION_WINDOW_HOURS = 48;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

// Mirrors the backend's own 48-hour check (appointmentRoutes.ts) — this is
// only used to decide whether to show the Cancel button at all; the backend
// is the actual authority and re-checks this itself on the cancel request.
function hoursUntilAppointment(appointment: Appointment): number {
  const [hours, minutes] = appointment.time.split(':').map(Number);
  const combined = new Date(appointment.date);
  combined.setUTCHours(hours, minutes, 0, 0);
  return (combined.getTime() - Date.now()) / (60 * 60 * 1000);
}

export function MyAppointmentsPage() {
  const { token } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelErrors, setCancelErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!token) return;
    getMyAppointments(token)
      .then(({ appointments: fetched }) => setAppointments(fetched))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load appointments'))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleCancel(appointmentId: string) {
    if (!token) return;
    if (!window.confirm('Cancel this appointment?')) return;

    setCancellingId(appointmentId);
    setCancelErrors((prev) => ({ ...prev, [appointmentId]: '' }));
    try {
      const { appointment: updated } = await cancelAppointment(token, appointmentId);
      // Merge in just the status rather than replacing the whole object —
      // the cancel response's appointment isn't populated with doctor info
      // the way GET /my's is, and we don't want to lose that from state.
      setAppointments((prev) =>
        prev.map((a) => (a._id === updated._id ? { ...a, status: updated.status } : a))
      );
    } catch (err) {
      setCancelErrors((prev) => ({
        ...prev,
        [appointmentId]: err instanceof Error ? err.message : 'Failed to cancel appointment',
      }));
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">My Appointments</h1>

      {loading && <p className="mt-6 text-sm text-slate-500">Loading...</p>}
      {error && <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {!loading && !error && appointments.length === 0 && (
        <p className="mt-6 text-sm text-slate-500">You haven't booked any appointments yet.</p>
      )}

      <div className="mt-6 space-y-3">
        {appointments.map((appointment) => {
          const doctor = appointment.doctor as Doctor;
          const canCancel =
            appointment.status === 'Booked' && hoursUntilAppointment(appointment) >= CANCELLATION_WINDOW_HOURS;
          return (
            <div
              key={appointment._id}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-slate-900">
                  Dr. {doctor?.name ?? 'Unknown'}{' '}
                  {doctor?.specialization && (
                    <span className="font-normal text-slate-500">({doctor.specialization})</span>
                  )}
                </h3>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    appointment.status === 'Booked'
                      ? 'bg-green-100 text-green-700'
                      : appointment.status === 'Cancelled'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {appointment.status}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                {formatDate(appointment.date)} at {appointment.time}
              </p>
              <p className="mt-1 text-sm text-slate-500">Amount: {appointment.amount}</p>

              {canCancel && (
                <button
                  type="button"
                  onClick={() => handleCancel(appointment._id)}
                  disabled={cancellingId === appointment._id}
                  className="mt-3 rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  {cancellingId === appointment._id ? 'Cancelling...' : 'Cancel appointment'}
                </button>
              )}

              {cancelErrors[appointment._id] && (
                <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {cancelErrors[appointment._id]}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
