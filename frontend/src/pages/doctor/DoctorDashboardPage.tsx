import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../../api/client';
import { activateDoctor, getAvailability, getProfile } from '../../api/doctor';
import { useDoctorAuth } from '../../context/DoctorAuthContext';
import type { DoctorDetail } from '../../types';

export function DoctorDashboardPage() {
  const { token } = useDoctorAuth();
  const [profile, setProfile] = useState<DoctorDetail | null>(null);
  const [hasAvailability, setHasAvailability] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activating, setActivating] = useState(false);
  const [activateError, setActivateError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    Promise.all([getProfile(token), getAvailability(token)])
      .then(([profileResult, availabilityResult]) => {
        setProfile(profileResult.doctor);
        setHasAvailability(Boolean(availabilityResult.availability));
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleActivate() {
    if (!token) return;
    setActivating(true);
    setActivateError(null);
    try {
      await activateDoctor(token);
      setProfile((prev) => (prev ? { ...prev, isActivated: true } : prev));
    } catch (err) {
      setActivateError(err instanceof Error ? err.message : 'Activation failed');
    } finally {
      setActivating(false);
    }
  }

  if (loading) return <p className="mx-auto max-w-3xl px-6 py-10 text-sm text-slate-500">Loading...</p>;
  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      </div>
    );
  }
  if (!profile) return null;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="flex items-center gap-4">
        {profile.photoUrl ? (
          <img
            src={`${API_BASE_URL}${profile.photoUrl}`}
            alt="Profile"
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-50 text-xl font-semibold text-teal-700">
            {profile.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dr. {profile.name}</h1>
          <p className="text-slate-500">{profile.specialization}</p>
        </div>
      </div>
      {profile.bio && <p className="mt-4 text-sm text-slate-600">{profile.bio}</p>}

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Profile</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Registration No.</dt>
            <dd className="text-slate-900">{profile.registrationNumber}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Login ID</dt>
            <dd className="font-mono text-slate-900">{profile.loginId}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Degree</dt>
            <dd className="text-slate-900">{profile.degree}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Experience</dt>
            <dd className="text-slate-900">{profile.experience} yrs</dd>
          </div>
        </dl>
      </div>

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Activation Status</h2>
        {profile.isActivated ? (
          <p className="mt-3 inline-block rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
            Activated — patients can book appointments with you
          </p>
        ) : (
          <div className="mt-3">
            {!hasAvailability && (
              <p className="text-sm text-slate-600">
                Set your{' '}
                <Link to="/doctor/availability" className="text-teal-600 underline hover:text-teal-700">
                  availability
                </Link>{' '}
                before activating.
              </p>
            )}
            {activateError && <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{activateError}</div>}
            <button
              type="button"
              onClick={handleActivate}
              disabled={!hasAvailability || activating}
              className="mt-3 rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {activating ? 'Activating...' : 'Activate'}
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          to="/doctor/availability"
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md"
        >
          <h3 className="font-medium text-slate-900">Manage Availability</h3>
          <p className="mt-1 text-sm text-slate-500">Set your weekly schedule and block holidays.</p>
        </Link>
        <Link
          to="/doctor/appointments"
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md"
        >
          <h3 className="font-medium text-slate-900">View Appointments</h3>
          <p className="mt-1 text-sm text-slate-500">See your upcoming patient bookings.</p>
        </Link>
        <Link
          to="/doctor/profile/edit"
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md"
        >
          <h3 className="font-medium text-slate-900">Edit Profile</h3>
          <p className="mt-1 text-sm text-slate-500">Set your photo and bio for patients to see.</p>
        </Link>
      </div>
    </div>
  );
}
