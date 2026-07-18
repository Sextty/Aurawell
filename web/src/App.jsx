import { useEffect, useState } from "react";
import { api, getToken, getStoredUser } from "./api.js";

function Login({ onLoggedIn }) {
  const [email, setEmail] = useState("patient@aurawell.app");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const user = await api.login(email, password);
      onLoggedIn(user);
    } catch (err) {
      setError(err.message === "401" ? "Invalid credentials" : "Could not sign in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={submit}>
        <h1>Aurawell</h1>
        <p className="muted">Sign in as the seeded patient or doctor.</p>
        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        </label>
        <label>
          Password
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
        </label>
        {error && <div className="error">{error}</div>}
        <button type="submit" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
        <p className="hint">
          patient@aurawell.app or doctor@aurawell.app — both use demo1234
        </p>
      </form>
    </div>
  );
}

function BookingForm({ doctors, onBook }) {
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
      setError(err.message.includes("409") ? "That slot is already booked — pick another time." : "Could not book appointment");
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
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="What's this visit about?" />
      </label>
      {error && <div className="error">{error}</div>}
      <button type="submit">Confirm booking</button>
    </form>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [booted, setBooted] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);

  const loadAll = async () => {
    const [d, a] = await Promise.all([api.getDoctors(), api.getAppointments()]);
    setDoctors(d);
    setAppointments(a);
  };

  useEffect(() => {
    if (getToken()) {
      loadAll()
        .then(() => setUser(getStoredUser()))
        .catch(() => api.logout())
        .finally(() => setBooted(true));
    } else {
      setBooted(true);
    }
  }, []);

  const onLoggedIn = async (u) => {
    setUser(u);
    await loadAll();
  };

  const book = async (doctorId, date, time, reason) => {
    const appt = await api.bookAppointment(doctorId, date, time, reason);
    setAppointments((prev) => [...prev, appt]);
  };

  const cancel = async (id) => {
    await api.cancelAppointment(id);
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status: "cancelled" } : a)));
  };

  if (!booted) return null;
  if (!user) return <Login onLoggedIn={onLoggedIn} />;

  const isDoctor = user.role === "doctor";

  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">Aurawell</span>
        <span className="muted">{isDoctor ? "Doctor console" : "Patient portal"}</span>
        <button
          className="ghost"
          onClick={() => {
            api.logout();
            setUser(null);
          }}
        >
          Sign out
        </button>
      </header>
      <main>
        {!isDoctor && doctors.length > 0 && <BookingForm doctors={doctors} onBook={book} />}

        <h2>{isDoctor ? "Your appointments" : "Your visits"}</h2>
        <div className="appointments">
          {appointments.map((a) => (
            <div className="appointment" key={a.id}>
              <div>
                <div className="appt-title">{isDoctor ? a.patient?.name : a.doctor?.name}</div>
                <div className="muted">
                  {new Date(a.date).toLocaleDateString()} · {a.time} · {a.reason}
                </div>
              </div>
              <div className="appt-right">
                <span className={`status status-${a.status}`}>{a.status}</span>
                {!isDoctor && a.status === "upcoming" && (
                  <button className="ghost" onClick={() => cancel(a.id)}>
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
          {appointments.length === 0 && <p className="muted">Nothing scheduled yet.</p>}
        </div>
      </main>
    </div>
  );
}
