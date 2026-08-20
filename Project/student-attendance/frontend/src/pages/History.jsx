import { useEffect, useState } from "react";
import { api } from "../api";

function statusLabel(s) {
  if (s === "present") return "Có mặt";
  if (s === "late") return "Muộn";
  if (s === "absent") return "Vắng";
  return s;
}

export default function History() {
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState("");
  const [sessions, setSessions] = useState([]);
  const [active, setActive] = useState(null);

  useEffect(() => {
    api.classes().then((cs) => {
      setClasses(cs);
      setClassId(cs[0] ? String(cs[0].id) : "");
    });
  }, []);

  useEffect(() => {
    if (!classId) return;
    api.sessions(classId).then((rows) => {
      setSessions(rows);
      if (rows[0]) selectSession(rows[0]);
      else setActive(null);
    });
  }, [classId]);

  async function selectSession(s) {
    setActive(s);
    const detail = await api.getSession(s.id);
    setSessions((rows) => rows.map((r) => (r.id === s.id ? detail : r)));
    setActive(detail);
  }

  return (
    <section>
      <header className="page-head">
        <h1>Lịch sử điểm danh</h1>
        <select value={classId} onChange={(e) => setClassId(e.target.value)}>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code} — {c.name}
            </option>
          ))}
        </select>
      </header>
      <div className="grid-2">
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Thời điểm</th>
                <th>Trạng thái</th>
                <th>Số HV</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id} className={active?.id === s.id ? "selected" : ""} onClick={() => selectSession(s)}>
                  <td>{s.opened_at ? new Date(s.opened_at).toLocaleString("vi-VN") : "—"}</td>
                  <td>{s.status === "open" ? "Đang mở" : "Đã đóng"}</td>
                  <td>{(s.records || []).length || s.present_count + s.late_count + s.absent_count || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h2>Chi tiết phiên</h2>
          {!active && <p className="muted">Chọn một phiên</p>}
          {active && (
            <ul className="roll">
              {(active.records || []).map((r) => (
                <li key={r.id}>
                  <span>
                    <strong>{r.student_name || r.full_name || r.student_code || "Học viên"}</strong>
                    {r.snapshot_path && (
                      <img className="thumb" src={r.snapshot_path} alt="" />
                    )}
                  </span>
                  <span className={`badge ${r.status}`}>{statusLabel(r.status)}</span>
                </li>
              ))}
              {!active.records?.length && <li className="muted">Chưa có bản ghi</li>}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
