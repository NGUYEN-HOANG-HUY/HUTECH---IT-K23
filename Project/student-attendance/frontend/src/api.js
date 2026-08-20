const tokenKey = "sa_token";

export function getToken() {
  return localStorage.getItem(tokenKey);
}

export function setToken(token) {
  if (token) localStorage.setItem(tokenKey, token);
  else localStorage.removeItem(tokenKey);
}

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body && !(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(path, { ...options, headers });
  if (res.status === 401) {
    setToken(null);
    if (!path.includes("/auth/login")) window.location.href = "/login";
  }
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const detail = data?.detail;
    const msg = Array.isArray(detail)
      ? detail.map((d) => d.msg).join("; ")
      : detail || res.statusText;
    throw new Error(msg);
  }
  return data;
}

export const api = {
  login: async (username, password) => {
    const data = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    return { ...data, token: data.access_token };
  },
  classes: () => request("/api/classes"),
  createClass: (body) => request("/api/classes", { method: "POST", body: JSON.stringify(body) }),
  updateClass: (id, body) => request(`/api/classes/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteClass: (id) => request(`/api/classes/${id}`, { method: "DELETE" }),
  students: (classId) => request(`/api/students${classId ? `?class_id=${classId}` : ""}`),
  saveStudent: (id, form) =>
    request(id ? `/api/students/${id}` : "/api/students", { method: id ? "PUT" : "POST", body: form }),
  deleteStudent: (id) => request(`/api/students/${id}`, { method: "DELETE" }),
  timetable: (classId) => request(`/api/timetable${classId ? `?class_id=${classId}` : ""}`),
  saveSlot: (id, body) =>
    request(id ? `/api/timetable/${id}` : "/api/timetable", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(body),
    }),
  deleteSlot: (id) => request(`/api/timetable/${id}`, { method: "DELETE" }),
  sessions: (classId) => request(`/api/sessions${classId ? `?class_id=${classId}` : ""}`),
  getSession: (id) => request(`/api/sessions/${id}`),
  openSession: (classId, slotId) =>
    request("/api/sessions", {
      method: "POST",
      body: JSON.stringify({ class_id: classId, slot_id: slotId || null }),
    }),
  closeSession: (id) => request(`/api/sessions/${id}/close`, { method: "POST" }),
  recognize: (sessionId, blob) => {
    const form = new FormData();
    form.append("frame", blob, "frame.jpg");
    return request(`/api/sessions/${sessionId}/recognize`, { method: "POST", body: form });
  },
  report: (params) => {
    const q = new URLSearchParams();
    if (params.class_id) q.set("class_id", params.class_id);
    if (params.from) q.set("from_date", params.from);
    if (params.to) q.set("to_date", params.to);
    return request(`/api/reports/attendance?${q}`);
  },
  reportCsvUrl: (params) => {
    const q = new URLSearchParams();
    if (params.class_id) q.set("class_id", params.class_id);
    if (params.from) q.set("from_date", params.from);
    if (params.to) q.set("to_date", params.to);
    return `/api/reports/attendance.csv?${q}`;
  },
};
