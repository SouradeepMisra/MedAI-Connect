import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { registerDoctor } from '../../api/doctor';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

export function DoctorRegisterPage() {
  const [name, setName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [degree, setDegree] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [experience, setExperience] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [document, setDocument] = useState<File | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedName, setSubmittedName] = useState<string | null>(null);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setError(null);

    if (file && !ALLOWED_FILE_TYPES.includes(file.type)) {
      setError('Only PDF, JPG, and PNG files are allowed');
      setDocument(null);
      return;
    }
    if (file && file.size > MAX_FILE_SIZE_BYTES) {
      setError('File must be 5MB or smaller');
      setDocument(null);
      return;
    }
    setDocument(file);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!document) {
      setError('A registration document (PDF, JPG, or PNG) is required');
      return;
    }

    const formData = new FormData();
    formData.set('name', name);
    formData.set('registrationNumber', registrationNumber);
    formData.set('degree', degree);
    formData.set('specialization', specialization);
    formData.set('experience', experience);
    formData.set('password', password);
    formData.set('document', document);

    setSubmitting(true);
    try {
      const { doctor } = await registerDoctor(formData);
      setSubmittedName(doctor.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (submittedName) {
    return (
      <div className="mx-auto mt-12 max-w-md rounded-lg border border-green-200 bg-green-50 p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-green-900">Registration submitted</h1>
        <p className="mt-3 text-sm text-green-800">
          Thanks, Dr. {submittedName}. Your application is now pending admin review. Once
          approved, you'll receive a Login ID to sign in with.
        </p>
        <Link to="/doctor/login" className="mt-6 inline-block text-sm text-green-900 underline">
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-12 max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-xl font-semibold text-slate-900">Doctor Registration</h1>
      <p className="mt-1 text-sm text-slate-500">
        Submit your details and a registration document for admin review.
      </p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Registration Number</label>
          <input
            type="text"
            required
            value={registrationNumber}
            onChange={(e) => setRegistrationNumber(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Degree</label>
          <input
            type="text"
            required
            placeholder="e.g. MBBS, MD"
            value={degree}
            onChange={(e) => setDegree(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Specialization</label>
          <input
            type="text"
            required
            value={specialization}
            onChange={(e) => setSpecialization(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Experience (years)</label>
          <input
            type="number"
            required
            min={0}
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Re-enter Password</label>
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Registration Document</label>
          <input
            type="file"
            required
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileChange}
            className="mt-1 w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-teal-600 file:px-3 file:py-1.5 file:text-sm file:text-white hover:file:bg-teal-700"
          />
          <p className="mt-1 text-xs text-slate-400">PDF, JPG, or PNG, up to 5MB.</p>
        </div>

        {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-teal-600 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {submitting ? 'Submitting...' : 'Submit Registration'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-500">
        Already approved?{' '}
        <Link to="/doctor/login" className="text-teal-600 underline hover:text-teal-700">
          Log in
        </Link>
      </p>
    </div>
  );
}
