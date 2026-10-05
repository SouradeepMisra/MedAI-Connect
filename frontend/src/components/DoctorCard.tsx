import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../api/client';
import type { Doctor } from '../types';

export function DoctorCard({ doctor }: { doctor: Doctor }) {
  return (
    <Link
      to={`/doctors/${doctor._id}`}
      className="block rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        {doctor.photoUrl ? (
          <img
            src={`${API_BASE_URL}${doctor.photoUrl}`}
            alt=""
            className="h-10 w-10 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-50 text-sm font-semibold text-teal-700">
            {doctor.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <h3 className="text-base font-semibold text-slate-900">Dr. {doctor.name}</h3>
          <p className="text-sm text-teal-700">{doctor.specialization}</p>
        </div>
      </div>
      <p className="mt-3 text-sm text-slate-600">
        {doctor.degree} &middot; {doctor.experience} yrs experience
      </p>
    </Link>
  );
}
