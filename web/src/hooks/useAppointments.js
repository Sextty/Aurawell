import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";

export function useAppointments(user) {
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  const reload = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setLoadError("");
    try {
      const [d, a] = await Promise.all([api.getDoctors(), api.getAppointments()]);
      setDoctors(d);
      setAppointments(a);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    reload();
  }, [reload]);

  const book = async (doctorId, date, time, reason) => {
    const appt = await api.bookAppointment(doctorId, date, time, reason);
    setAppointments((prev) => [...prev, appt]);
    return appt;
  };

  const cancel = async (id) => {
    await api.cancelAppointment(id);
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status: "cancelled" } : a)));
  };

  return {
    doctors,
    appointments,
    loading,
    loadError,
    reload,
    book,
    cancel,
  };
}
