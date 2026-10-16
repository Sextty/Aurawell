import { useState } from "react";

const MAX_REASON = 250;

export function BookingCard({ doctors, onBook }) {
  const [doctorId, setDoctorId] = useState(doctors[0]?.id || "");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00 AM");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await onBook(doctorId, date, time, reason);
      setReason("");
    } catch (err) {
      setError(err.message.includes("409") ? "Could not book appointment" : err.message.replace(/^Request failed: \d+$/, "Could not book appointment"));
    }
  };

  return (
    <form className="booking" onSubmit={submit}>
      <h2>Book an appointment</h2>
      <div className="row">
        <label>
          Doctor
          <select value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} — {d.specialty}
              </option>
            ))}
          </select>
        </label>
        <label>
          Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <label>
          Time
          <input value={time} onChange={(e) => setTime(e.target.value)} placeholder="10:00 AM" required />
        </label>
      </div>
      <label>
        Reason
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={MAX_REASON}
          placeholder="What's this visit about?"
        />
      </label>
      <span className="muted counter">{reason.length}/{MAX_REASON}</span>
      {error && <div className="error">{error}</div>}
      <button type="submit">Confirm booking</button>
    </form>
  );
}
