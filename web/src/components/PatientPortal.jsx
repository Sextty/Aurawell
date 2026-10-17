import { useState } from "react";
import { BookingCard } from "./BookingCard.jsx";
import { AppointmentList } from "./AppointmentList.jsx";
import { CancelModal } from "./CancelModal.jsx";
import { isPast } from "../lib/datetime.js";

export function PatientPortal({ doctors, appointments, pendingId, book, cancel }) {
  const [cancelTarget, setCancelTarget] = useState(null);

  const upcoming = appointments.filter((a) => a.status === "upcoming" && !isPast(a));
  const past = appointments.filter((a) => a.status !== "upcoming" || isPast(a));

  const confirmCancel = async () => {
    const id = cancelTarget?.id;
    setCancelTarget(null);
    if (id) await cancel(id);
  };

  return (
    <>
      <BookingCard doctors={doctors} onBook={book} />
      <AppointmentList
        title="Upcoming visits"
        appointments={upcoming}
        isDoctor={false}
        renderActions={(a) =>
          a.status === "upcoming" ? (
            <button className="ghost" disabled={pendingId === a.id} onClick={() => setCancelTarget(a)}>
              Cancel
            </button>
          ) : null
        }
      />
      <AppointmentList title="Past & cancelled" appointments={past} isDoctor={false} />
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
