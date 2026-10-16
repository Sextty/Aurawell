import { AppointmentList } from "./AppointmentList.jsx";

export function DoctorConsole({ appointments }) {
  return (
    <AppointmentList title="Your appointments" appointments={appointments} isDoctor={true} />
  );
}
