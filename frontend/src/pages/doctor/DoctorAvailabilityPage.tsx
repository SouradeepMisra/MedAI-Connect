import { useEffect, useState } from 'react';
import { blockHoliday, getAvailability, saveAvailability } from '../../api/doctor';
import { useDoctorAuth } from '../../context/DoctorAuthContext';

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface DayEntry {
  enabled: boolean;
  startTime: string;
  endTime: string;
}

function defaultDayEntries(): DayEntry[] {
  return DAY_LABELS.map(() => ({ enabled: false, startTime: '09:00', endTime: '17:00' }));
}

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function DoctorAvailabilityPage() {
  const { token } = useDoctorAuth();
  const [days, setDays] = useState<DayEntry[]>(defaultDayEntries());
  const [slotDurationMinutes, setSlotDurationMinutes] = useState(15);
  const [maxPatientsPerSlot, setMaxPatientsPerSlot] = useState(1);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [newHolidayDate, setNewHolidayDate] = useState(todayISODate());
  const [holidayError, setHolidayError] = useState<string | null>(null);
  const [blockingHoliday, setBlockingHoliday] = useState(false);

  useEffect(() => {
    if (!token) return;
    getAvailability(token)
      .then(({ availability }) => {
        if (!availability) return;
        const nextDays = defaultDayEntries();
        for (const entry of availability.weeklySchedule) {
          nextDays[entry.dayOfWeek] = { enabled: true, startTime: entry.startTime, endTime: entry.endTime };
        }
        setDays(nextDays);
        setSlotDurationMinutes(availability.slotDurationMinutes);
        setMaxPatientsPerSlot(availability.maxPatientsPerSlot);
        setBlockedDates(availability.blockedDates);
      })
      .finally(() => setLoading(false));
  }, [token]);

  function updateDay(index: number, patch: Partial<DayEntry>) {
    setDays((prev) => prev.map((day, i) => (i === index ? { ...day, ...patch } : day)));
  }

  async function handleSave() {
    if (!token) return;
    setSaveError(null);
    setSaved(false);

    const weeklySchedule = days
      .map((day, dayOfWeek) => ({ ...day, dayOfWeek }))
      .filter((day) => day.enabled)
      .map(({ dayOfWeek, startTime, endTime }) => ({ dayOfWeek, startTime, endTime }));

    if (weeklySchedule.length === 0) {
      setSaveError('Enable at least one day');
      return;
    }

    setSaving(true);
    try {
      await saveAvailability(token, { weeklySchedule, slotDurationMinutes, maxPatientsPerSlot });
      setSaved(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save availability');
    } finally {
      setSaving(false);
    }
  }

  async function handleBlockHoliday() {
    if (!token) return;
    setHolidayError(null);
    setBlockingHoliday(true);
    try {
      const { blockedDates: updated } = await blockHoliday(token, newHolidayDate);
      setBlockedDates(updated);
    } catch (err) {
      setHolidayError(err instanceof Error ? err.message : 'Failed to block date');
    } finally {
      setBlockingHoliday(false);
    }
  }

  if (loading) return <p className="mx-auto max-w-3xl px-6 py-10 text-sm text-slate-500">Loading...</p>;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">Availability</h1>

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Weekly Schedule</h2>
        <div className="mt-4 space-y-2">
          {DAY_LABELS.map((label, index) => {
            const day = days[index];
            return (
              <div key={label} className="flex items-center gap-3 text-sm">
                <label className="flex w-32 items-center gap-2">
                  <input
                    type="checkbox"
                    checked={day.enabled}
                    onChange={(e) => updateDay(index, { enabled: e.target.checked })}
                  />
                  {label}
                </label>
                <input
                  type="time"
                  value={day.startTime}
                  disabled={!day.enabled}
                  onChange={(e) => updateDay(index, { startTime: e.target.value })}
                  className="rounded-md border border-slate-300 px-2 py-1 disabled:bg-slate-100"
                />
                <span className="text-slate-400">to</span>
                <input
                  type="time"
                  value={day.endTime}
                  disabled={!day.enabled}
                  onChange={(e) => updateDay(index, { endTime: e.target.value })}
                  className="rounded-md border border-slate-300 px-2 py-1 disabled:bg-slate-100"
                />
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex gap-6 text-sm">
          <div>
            <label className="block font-medium text-slate-700">Slot duration (min)</label>
            <input
              type="number"
              min={1}
              value={slotDurationMinutes}
              onChange={(e) => setSlotDurationMinutes(Number(e.target.value))}
              className="mt-1 w-24 rounded-md border border-slate-300 px-2 py-1"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700">Max patients per slot</label>
            <input
              type="number"
              min={1}
              value={maxPatientsPerSlot}
              onChange={(e) => setMaxPatientsPerSlot(Number(e.target.value))}
              className="mt-1 w-24 rounded-md border border-slate-300 px-2 py-1"
            />
          </div>
        </div>

        {saveError && <p className="mt-3 text-sm text-red-600">{saveError}</p>}
        {saved && <p className="mt-3 text-sm text-green-600">Availability saved.</p>}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Availability'}
        </button>
      </div>

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Blocked Dates (Holidays)</h2>

        {blockedDates.length === 0 && <p className="mt-3 text-sm text-slate-500">No dates blocked yet.</p>}
        {blockedDates.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {blockedDates.map((date) => (
              <li key={date} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                {new Date(date).toLocaleDateString(undefined, { timeZone: 'UTC' })}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex items-center gap-2">
          <input
            type="date"
            value={newHolidayDate}
            min={todayISODate()}
            onChange={(e) => setNewHolidayDate(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
          <button
            type="button"
            onClick={handleBlockHoliday}
            disabled={blockingHoliday}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {blockingHoliday ? 'Blocking...' : 'Block this date'}
          </button>
        </div>
        {holidayError && <p className="mt-2 text-sm text-red-600">{holidayError}</p>}
      </div>
    </div>
  );
}
