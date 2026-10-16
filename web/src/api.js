const TOKEN_KEY = "aurawell_token";
const USER_KEY = "aurawell_user";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function setSession(token, user) {
  if (token && user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  login: async (email, password) => {
    const data = await request("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    setSession(data.token, data.user);
    return data.user;
  },
  logout: () => setSession(null, null),
  getDoctors: () => request("/api/doctors"),
  getAvailability: (doctorId, date) =>
    request(`/api/doctors/${doctorId}/availability?date=${encodeURIComponent(date)}`),
  getAppointments: () => request("/api/appointments"),
  bookAppointment: (doctorId, date, time, reason) =>
    request("/api/appointments", { method: "POST", body: JSON.stringify({ doctorId, date, time, reason }) }),
  cancelAppointment: (id) => request(`/api/appointments/${id}/cancel`, { method: "PATCH" }),
  updateAppointmentStatus: (id, status) =>
    request(`/api/appointments/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
};
