import { Link } from 'react-router-dom';
import type { Doctor } from '../types';

export function DoctorCard({ doctor }: { doctor: Doctor }) {
  return (
    <Link
      to={`/doctors/${doctor._id}`}
      className="block rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
    >
      <h3 className="text-base font-semibold text-slate-900">Dr. {doctor.name}</h3>
      <p className="mt-1 text-sm text-slate-500">{doctor.specialization}</p>
      <p className="mt-2 text-sm text-slate-600">
        {doctor.degree} &middot; {doctor.experience} yrs experience
      </p>
    </Link>
  );
}
