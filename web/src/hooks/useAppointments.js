import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";

export function useAppointments(user) {
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [pendingId, setPendingId] = useState(null);

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

  // Optimistic status change with rollback: the update is applied immediately
  // and reverted (plus a visible error shown) if the API call fails.
  const changeStatus = async (id, status) => {
    const snapshot = appointments.find((a) => a.id === id);
    setActionError("");
    setPendingId(id);
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    try {
      await api.updateAppointmentStatus(id, status);
      return true;
    } catch (err) {
      if (snapshot) {
        setAppointments((prev) => prev.map((a) => (a.id === id ? snapshot : a)));
      }
      setActionError(err.message);
      return false;
    } finally {
      setPendingId(null);
    }
  };

  const cancel = (id) => changeStatus(id, "cancelled");

  return {
    doctors,
    appointments,
    loading,
    loadError,
    actionError,
    pendingId,
    reload,
    book,
    cancel,
  };
}
