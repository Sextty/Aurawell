import { BookingCard } from "./BookingCard.jsx";
import { AppointmentList } from "./AppointmentList.jsx";

function datePart(value) {
  return typeof value === "string" ? value.slice(0, 10) : new Date(value).toISOString().slice(0, 10);
}
function isPast(appointment) {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return datePart(appointment.date) < todayStr;
}

export function PatientPortal({ doctors, appointments, book, cancel }) {
  const upcoming = appointments.filter((a) => a.status === "upcoming" && !isPast(a));
  const past = appointments.filter((a) => a.status !== "upcoming" || isPast(a));

  return (
    <>
      {doctors.length > 0 && <BookingCard doctors={doctors} onBook={book} />}
      <AppointmentList
        title="Upcoming visits"
        appointments={upcoming}
        isDoctor={false}
        renderActions={(a) =>
          a.status === "upcoming" ? (
            <button className="ghost" onClick={() => cancel(a.id)}>
              Cancel
            </button>
          ) : null
        }
      />
      <AppointmentList
        title="Past & cancelled"
        appointments={past}
        isDoctor={false}
      />
    </>
  );
}
