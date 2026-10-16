import { useState } from "react";
import { AppointmentList } from "./AppointmentList.jsx";
import { CancelModal } from "./CancelModal.jsx";

export function DoctorConsole({ appointments, pendingId, updateStatus }) {
  const [cancelTarget, setCancelTarget] = useState(null);

  const counts = {
    upcoming: appointments.filter((a) => a.status === "upcoming").length,
    completed: appointments.filter((a) => a.status === "completed").length,
    cancelled: appointments.filter((a) => a.status === "cancelled").length,
  };

  const confirmCancel = async () => {
    const id = cancelTarget?.id;
    setCancelTarget(null);
    if (id) await updateStatus(id, "cancelled");
  };

  return (
    <>
      <div className="summary">
        <div className="stat stat-upcoming">
          <span className="stat-num">{counts.upcoming}</span>
          <span className="stat-label">Upcoming</span>
        </div>
        <div className="stat stat-completed">
          <span className="stat-num">{counts.completed}</span>
          <span className="stat-label">Completed</span>
        </div>
        <div className="stat stat-cancelled">
          <span className="stat-num">{counts.cancelled}</span>
          <span className="stat-label">Cancelled</span>
        </div>
      </div>

      <AppointmentList
        title="Your appointments"
        appointments={appointments}
        isDoctor={true}
        renderActions={(a) =>
          a.status === "upcoming" ? (
            <div className="appt-actions">
              <button className="ghost" disabled={pendingId === a.id} onClick={() => updateStatus(a.id, "completed")}>
                Complete
              </button>
              <button className="ghost danger" disabled={pendingId === a.id} onClick={() => setCancelTarget(a)}>
                Cancel
              </button>
            </div>
          ) : null
        }
      />

      <CancelModal
        open={Boolean(cancelTarget)}
        appointment={cancelTarget}
        busy={Boolean(cancelTarget) && pendingId === cancelTarget?.id}
        onCancel={() => setCancelTarget(null)}
        onConfirm={confirmCancel}
      />
    </>
  );
}
