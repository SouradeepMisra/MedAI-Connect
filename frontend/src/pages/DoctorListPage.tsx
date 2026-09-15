import { useEffect, useState } from 'react';
import { listDoctors } from '../api/doctors';
import { DoctorCard } from '../components/DoctorCard';
import type { Doctor } from '../types';

export function DoctorListPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [search, setSearch] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    listDoctors({ search, specialization })
      .then(({ doctors: fetched }) => {
        if (!cancelled) setDoctors(fetched);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load doctors');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [search, specialization]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">Find a Doctor</h1>
      <p className="mt-1 text-sm text-slate-500">
        Search by name or filter by specialization to book an appointment.
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          placeholder="Search by doctor name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none sm:w-2/3"
        />
        <input
          type="text"
          placeholder="Filter by specialization..."
          value={specialization}
          onChange={(e) => setSpecialization(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none sm:w-1/3"
        />
      </div>

      {loading && <p className="mt-8 text-sm text-slate-500">Loading doctors...</p>}
      {error && <p className="mt-8 text-sm text-red-600">{error}</p>}

      {!loading && !error && doctors.length === 0 && (
        <p className="mt-8 text-sm text-slate-500">No doctors found.</p>
      )}

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {doctors.map((doctor) => (
          <DoctorCard key={doctor._id} doctor={doctor} />
        ))}
      </div>
    </div>
  );
}
