import { BookingCard } from "./BookingCard.jsx";
import { AppointmentList } from "./AppointmentList.jsx";

export function PatientPortal({ doctors, appointments, book, cancel }) {
  return (
    <>
      {doctors.length > 0 && <BookingCard doctors={doctors} onBook={book} />}
      <AppointmentList
        title="Your visits"
        appointments={appointments}
        isDoctor={false}
        renderActions={(a) =>
          a.status === "upcoming" ? (
            <button className="ghost" onClick={() => cancel(a.id)}>
              Cancel
            </button>
          ) : null
        }
      />
    </>
  );
}
