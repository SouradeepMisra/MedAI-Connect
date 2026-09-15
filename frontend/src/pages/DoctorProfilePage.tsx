import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getDoctor, getSlots } from '../api/doctors';
import { bookAppointment } from '../api/appointments';
import { useAuth } from '../context/AuthContext';
import type { Doctor, Slot } from '../types';

const DEFAULT_AMOUNT = 100;

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

function maxBookableISODate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().slice(0, 10);
}

export function DoctorProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();

  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [doctorError, setDoctorError] = useState<string | null>(null);

  const [date, setDate] = useState(todayISODate());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [amount, setAmount] = useState(DEFAULT_AMOUNT);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  useEffect(() => {
    if (!id) return;
    getDoctor(id)
      .then(({ doctor: fetched }) => setDoctor(fetched))
      .catch((err) => setDoctorError(err instanceof Error ? err.message : 'Doctor not found'));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setSlotsLoading(true);
    setSlotsError(null);
    setSelectedTime(null);
    setBookingSuccess(false);

    getSlots(id, date)
      .then(({ slots: fetched }) => {
        if (!cancelled) setSlots(fetched);
      })
      .catch((err) => {
        if (!cancelled) setSlotsError(err instanceof Error ? err.message : 'Failed to load slots');
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, date]);

  async function handleBook() {
    if (!id || !selectedTime || !token) return;
    setBookingSubmitting(true);
    setBookingError(null);
    try {
      await bookAppointment(token, { doctorId: id, date, time: selectedTime, amount });
      setBookingSuccess(true);
      setSelectedTime(null);
      const { slots: refreshed } = await getSlots(id, date);
      setSlots(refreshed);
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : 'Booking failed');
    } finally {
      setBookingSubmitting(false);
    }
  }

  if (doctorError) {
    return <p className="mx-auto max-w-3xl px-6 py-10 text-sm text-red-600">{doctorError}</p>;
  }

  if (!doctor) {
    return <p className="mx-auto max-w-3xl px-6 py-10 text-sm text-slate-500">Loading...</p>;
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">Dr. {doctor.name}</h1>
      <p className="mt-1 text-slate-500">{doctor.specialization}</p>
      <p className="mt-2 text-sm text-slate-600">
        {doctor.degree} &middot; {doctor.experience} years of experience
      </p>

      <div className="mt-8 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Available Slots</h2>
          <input
            type="date"
            value={date}
            min={todayISODate()}
            max={maxBookableISODate()}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>

        {slotsLoading && <p className="mt-4 text-sm text-slate-500">Loading slots...</p>}
        {slotsError && <p className="mt-4 text-sm text-red-600">{slotsError}</p>}

        {!slotsLoading && !slotsError && slots.length === 0 && (
          <p className="mt-4 text-sm text-slate-500">No slots available on this date.</p>
        )}

        {!slotsLoading && !slotsError && slots.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {slots.map((slot) => (
              <button
                key={slot.time}
                type="button"
                disabled={slot.isFull}
                onClick={() => {
                  setSelectedTime(slot.time);
                  setBookingError(null);
                  setBookingSuccess(false);
                }}
                className={`rounded-md border px-3 py-2 text-sm ${
                  slot.isFull
                    ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                    : selectedTime === slot.time
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-300 text-slate-700 hover:border-slate-500'
                }`}
              >
                {slot.time}
              </button>
            ))}
          </div>
        )}

        {selectedTime && !bookingSuccess && (
          <div className="mt-6 rounded-md border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-700">
              Booking <span className="font-medium">{selectedTime}</span> on {date}
            </p>

            {!token ? (
              <p className="mt-3 text-sm text-slate-600">
                <Link to="/login" className="text-slate-900 underline">
                  Log in
                </Link>{' '}
                to confirm this booking.
              </p>
            ) : (
              <>
                <label className="mt-3 block text-sm font-medium text-slate-700">
                  Booking Amount
                </label>
                <input
                  type="number"
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="mt-1 w-32 rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
                />

                {bookingError && <p className="mt-2 text-sm text-red-600">{bookingError}</p>}

                <button
                  type="button"
                  onClick={handleBook}
                  disabled={bookingSubmitting}
                  className="mt-3 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
                >
                  {bookingSubmitting ? 'Booking...' : 'Confirm Booking'}
                </button>
              </>
            )}
          </div>
        )}

        {bookingSuccess && (
          <div className="mt-6 rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            Appointment booked!{' '}
            <Link to="/my-appointments" className="underline">
              View my appointments
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
