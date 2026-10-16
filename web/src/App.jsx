import { useAuth } from "./hooks/useAuth.js";
import { useAppointments } from "./hooks/useAppointments.js";
import { Navbar } from "./components/Navbar.jsx";
import { LoginCard } from "./components/LoginCard.jsx";
import { PatientPortal } from "./components/PatientPortal.jsx";
import { DoctorConsole } from "./components/DoctorConsole.jsx";

export default function App() {
  const { user, booted, login, logout } = useAuth();
  const {
    doctors,
    appointments,
    loading,
    loadError,
    actionError,
    pendingId,
    reload,
    book,
    cancel,
  } = useAppointments(user);

  if (!booted) return null;
  if (!user) return <LoginCard onLogin={login} />;

  const isDoctor = user.role === "doctor";

  return (
    <>
      <Navbar user={user} onSignOut={logout} />
      <main>
        {loadError && (
          <div className="error">
            {loadError}{" "}
            <button className="ghost compact" onClick={reload}>
              Retry
            </button>
          </div>
        )}
        {loading && <p className="muted">Loading…</p>}
        {actionError && (
          <div className="error" role="status">
            {actionError}
          </div>
        )}
        {!isDoctor ? (
          <PatientPortal
            doctors={doctors}
            appointments={appointments}
            pendingId={pendingId}
            book={book}
            cancel={cancel}
          />
        ) : (
          <DoctorConsole appointments={appointments} pendingId={pendingId} updateStatus={cancel} />
        )}
      </main>
    </>
  );
}
