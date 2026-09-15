import { useEffect, useState } from 'react';
import { getMyAppointments } from '../api/appointments';
import { useAuth } from '../context/AuthContext';
import type { Appointment, Doctor } from '../types';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export function MyAppointmentsPage() {
  const { token } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    getMyAppointments(token)
      .then(({ appointments: fetched }) => setAppointments(fetched))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load appointments'))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">My Appointments</h1>

      {loading && <p className="mt-6 text-sm text-slate-500">Loading...</p>}
      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

      {!loading && !error && appointments.length === 0 && (
        <p className="mt-6 text-sm text-slate-500">You haven't booked any appointments yet.</p>
      )}

      <div className="mt-6 space-y-3">
        {appointments.map((appointment) => {
          const doctor = appointment.doctor as Doctor;
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
