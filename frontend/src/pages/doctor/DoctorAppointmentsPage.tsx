import { useEffect, useState } from 'react';
import { getDoctorAppointments } from '../../api/doctor';
import { useDoctorAuth } from '../../context/DoctorAuthContext';
import type { Appointment, PopulatedPatient } from '../../types';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export function DoctorAppointmentsPage() {
  const { token } = useDoctorAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    getDoctorAppointments(token)
      .then(({ appointments: fetched }) => setAppointments(fetched))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load appointments'))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">Appointments</h1>

      {loading && <p className="mt-6 text-sm text-slate-500">Loading...</p>}
      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

      {!loading && !error && appointments.length === 0 && (
        <p className="mt-6 text-sm text-slate-500">No patients have booked with you yet.</p>
      )}

      <div className="mt-6 space-y-3">
        {appointments.map((appointment) => {
          const patient = appointment.patient as PopulatedPatient;
          return (
            <div key={appointment._id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-slate-900">{patient?.name ?? 'Unknown patient'}</h3>
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
              {patient?.phone && <p className="mt-1 text-sm text-slate-500">Contact: {patient.phone}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
