export function AppointmentCard({ appointment, isDoctor, actions }) {
  const a = appointment;
  const otherName = isDoctor ? a.patient?.name : a.doctor?.name;
  const otherDetail = isDoctor ? a.patient?.email : a.doctor?.specialty;

  return (
    <div className="appointment">
      <div>
        <div className="appt-title">{otherName}</div>
        <div className="muted">
          {new Date(a.date).toLocaleDateString()} · {a.time} · {a.reason}
          {otherDetail && <span> · {otherDetail}</span>}
        </div>
      </div>
      <div className="appt-right">
        <span className={`status status-${a.status}`}>{a.status}</span>
        {actions}
      </div>
    </div>
  );
}
