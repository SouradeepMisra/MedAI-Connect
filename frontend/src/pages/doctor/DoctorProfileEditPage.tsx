import { useEffect, useState, type FormEvent } from 'react';
import { API_BASE_URL } from '../../api/client';
import { getProfile, updateDoctorProfile } from '../../api/doctor';
import { useDoctorAuth } from '../../context/DoctorAuthContext';

const MAX_BIO_LENGTH = 1000;

export function DoctorProfileEditPage() {
  const { token, doctor } = useDoctorAuth();

  const [bio, setBio] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!token) return;
    getProfile(token)
      .then(({ doctor: profile }) => {
        setBio(profile.bio ?? '');
        setPhotoUrl(profile.photoUrl ?? null);
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Failed to load profile'))
      .finally(() => setLoading(false));
  }, [token]);

  function handlePhotoChange(file: File | null) {
    setPhotoFile(file);
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token) return;

    setSaveError(null);
    setSaved(false);
    setSaving(true);
    try {
      const formData = new FormData();
      formData.set('bio', bio);
      if (photoFile) formData.set('photo', photoFile);

      const result = await updateDoctorProfile(token, formData);
      setPhotoUrl(result.photoUrl ?? photoUrl);
      setPhotoFile(null);
      setPreviewUrl(null);
      setSaved(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="mx-auto max-w-2xl px-6 py-10 text-sm text-slate-500">Loading...</p>;
  if (loadError) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10">
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{loadError}</div>
      </div>
    );
  }

  const displayedPhoto = previewUrl ?? (photoUrl ? `${API_BASE_URL}${photoUrl}` : null);

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">Edit Profile</h1>
      <p className="mt-1 text-sm text-slate-500">
        This photo and bio are shown on your public profile to patients browsing for a doctor.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          {displayedPhoto ? (
            <img src={displayedPhoto} alt="Profile" className="h-20 w-20 rounded-full object-cover" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-teal-50 text-2xl font-semibold text-teal-700">
              {doctor?.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700">Photo</label>
            <input
              type="file"
              accept="image/jpeg,image/png"
              onChange={(e) => handlePhotoChange(e.target.files?.[0] ?? null)}
              className="mt-1 text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-teal-600 file:px-3 file:py-1.5 file:text-sm file:text-white hover:file:bg-teal-700"
            />
            <p className="mt-1 text-xs text-slate-400">JPG or PNG, up to 2MB.</p>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-slate-700">Bio</label>
            <span className="text-xs text-slate-400">
              {bio.length}/{MAX_BIO_LENGTH}
            </span>
          </div>
          <textarea
            rows={6}
            maxLength={MAX_BIO_LENGTH}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell patients a bit about your experience and approach to care..."
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        {saveError && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{saveError}</div>}
        {saved && <p className="text-sm text-teal-700">Profile updated.</p>}

        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </form>
    </div>
  );
}
