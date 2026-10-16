import { AppointmentCard } from "./AppointmentCard.jsx";

export function AppointmentList({ title, appointments, isDoctor, renderActions }) {
  return (
    <>
      {title && <h2>{title}</h2>}
      <div className="appointments">
        {appointments.map((a) => (
          <AppointmentCard key={a.id} appointment={a} isDoctor={isDoctor} actions={renderActions?.(a)} />
        ))}
        {appointments.length === 0 && <p className="muted">Nothing scheduled yet.</p>}
      </div>
    </>
  );
}
