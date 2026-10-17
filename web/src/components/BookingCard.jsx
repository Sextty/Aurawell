import { useEffect, useState } from "react";
import { api } from "../api.js";
import { todayString } from "../lib/datetime.js";

const MAX_REASON = 250;

export function BookingCard({ doctors, onBook }) {
  const [doctorId, setDoctorId] = useState("");
  const [date, setDate] = useState("");
  const [availability, setAvailability] = useState(null);
  const [slotsState, setSlotsState] = useState({ loading: false, error: "" });
  const [time, setTime] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [booked, setBooked] = useState(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!doctorId && doctors.length > 0) setDoctorId(doctors[0].id);
  }, [doctors, doctorId]);

  useEffect(() => {
    if (!doctorId || !date) {
      setAvailability(null);
      return;
    }
    let cancelled = false;
    setSlotsState({ loading: true, error: "" });
    setAvailability(null);
    setTime("");
    api
      .getAvailability(doctorId, date)
      .then((data) => {
        if (!cancelled) {
          setAvailability(data);
          setSlotsState({ loading: false, error: "" });
        }
      })
      .catch((err) => {
        if (!cancelled) setSlotsState({ loading: false, error: err.message });
      });
    return () => {
      cancelled = true;
    };
  }, [doctorId, date]);

  const submit = async (e) => {
    e.preventDefault();
    if (!time) return;
    setConfirming(true);
    setError("");
    setBooked(null);
    try {
      const appt = await onBook(doctorId, date, time, reason);
      setBooked({ date: appt.date, time: appt.time, doctor: appt.doctor?.name });
      setReason("");
      setTime("");
      setAvailability(null);
      setDate("");
    } catch (err) {
      setError(err.message);
    } finally {
      setConfirming(false);
    }
  };

  const pills = availability?.allSlots?.length
    ? availability.allSlots.map((slot) => ({
        slot,
        available: availability.availableSlots.includes(slot),
      }))
    : [];

  return (
    <form className="booking" onSubmit={submit}>
      <h2>Book an appointment</h2>

      {booked && (
        <div className="success" role="status">
          Appointment booked with {booked.doctor} on {new Date(booked.date).toLocaleDateString()} at {booked.time}.
        </div>
      )}
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}

      <div className="row">
        <label>
          Doctor
          <select value={doctorId} onChange={(e) => setDoctorId(e.target.value)} required>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} — {d.specialty}
              </option>
            ))}
          </select>
        </label>
        <label>
          Date
          <input
            type="date"
            value={date}
            min={todayString()}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </label>
      </div>

      <div className="field-group">
        <span className="field-label" id="slot-group-label">
          Available times
        </span>
        {slotsState.loading && (
          <p className="muted" role="status">
            Loading slots…
          </p>
        )}
        {slotsState.error && (
          <p className="error" role="alert">
            {slotsState.error}
          </p>
        )}
        {!slotsState.loading && !slotsState.error && date && availability && pills.length === 0 && (
          <p className="muted" role="status">
            No slots for this date.
          </p>
        )}
        {!slotsState.loading && !slotsState.error && !date && (
          <p className="muted">Pick a date to see available times.</p>
        )}
        {pills.length > 0 && (
          <div className="pills" role="group" aria-labelledby="slot-group-label">
            {pills.map(({ slot, available }) => (
              <button
                key={slot}
                type="button"
                className={`pill${time === slot ? " selected" : ""}`}
                disabled={!available}
                aria-pressed={time === slot}
                title={available ? `Book ${slot}` : "Already booked"}
                onClick={() => setTime(time === slot ? "" : slot)}
              >
                {slot}
              </button>
            ))}
          </div>
        )}
      </div>

      <label>
        Reason
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={MAX_REASON}
          placeholder="General consultation"
        />
        <span className="muted counter">
          {reason.length}/{MAX_REASON} characters
        </span>
      </label>

      <button type="submit" disabled={confirming || !time || !date}>
        {confirming ? "Booking…" : "Confirm booking"}
      </button>
    </form>
  );
}
