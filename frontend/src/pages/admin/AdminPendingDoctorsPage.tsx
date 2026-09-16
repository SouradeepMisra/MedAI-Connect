import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listPendingDoctors } from '../../api/admin';
import { useAdminAuth } from '../../context/AdminAuthContext';
import type { PendingDoctor } from '../../types';

const STATUS_BADGE: Record<string, string> = {
  NotRun: 'bg-slate-100 text-slate-600',
  Completed: 'bg-green-100 text-green-700',
  Failed: 'bg-red-100 text-red-700',
};

export function AdminPendingDoctorsPage() {
  const { token } = useAdminAuth();
  const [doctors, setDoctors] = useState<PendingDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    listPendingDoctors(token)
      .then(({ doctors: fetched }) => setDoctors(fetched))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load pending doctors'))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">Pending Doctor Verifications</h1>

      {loading && <p className="mt-6 text-sm text-slate-500">Loading...</p>}
      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

      {!loading && !error && doctors.length === 0 && (
        <p className="mt-6 text-sm text-slate-500">No doctors are currently awaiting review.</p>
      )}

      <div className="mt-6 space-y-3">
        {doctors.map((doctor) => {
          const status = doctor.aiVerification?.status ?? 'NotRun';
          return (
            <Link
              key={doctor._id}
              to={`/admin/doctors/${doctor._id}`}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md"
            >
              <div>
                <h3 className="font-medium text-slate-900">Dr. {doctor.name}</h3>
                <p className="text-sm text-slate-500">
                  {doctor.specialization} &middot; {doctor.degree} &middot; {doctor.experience} yrs
                </p>
                <p className="text-xs text-slate-400">Reg. No: {doctor.registrationNumber}</p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[status]}`}>
                AI check: {status}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
