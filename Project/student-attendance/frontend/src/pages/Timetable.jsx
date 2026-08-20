import { useEffect, useState } from "react";
import { api } from "../api";

const DAYS = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];

export default function Timetable() {
  const [classes, setClasses] = useState([]);
  const [slots, setSlots] = useState([]);
  const [form, setForm] = useState({
    class_id: "",
    weekday: 0,
    start_time: "07:30",
    end_time: "09:30",
    room: "",
  });
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState("");

  async function load() {
    setSlots(await api.timetable());
  }

  useEffect(() => {
    api.classes().then((cs) => {
      setClasses(cs);
      if (cs[0]) setForm((f) => ({ ...f, class_id: String(cs[0].id) }));
    });
    load().catch((e) => setError(e.message));
  }, []);

  async function save(e) {
    e.preventDefault();
    setError("");
    try {
      await api.saveSlot(editId, {
        class_id: Number(form.class_id),
        weekday: Number(form.weekday),
        start_time: form.start_time,
        end_time: form.end_time,
        room: form.room || null,
      });
      setEditId(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section>
      <header className="page-head">
        <h1>Thời khóa biểu</h1>
      </header>
      <div className="grid-2">
        <form className="card" onSubmit={save}>
          <h2>{editId ? "Sửa ca" : "Thêm ca học"}</h2>
          <label>
            Lớp
            <select value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value })}>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Thứ
            <select value={form.weekday} onChange={(e) => setForm({ ...form, weekday: e.target.value })}>
              {DAYS.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <div className="row">
            <label>
              Bắt đầu
              <input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
            </label>
            <label>
              Kết thúc
              <input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
            </label>
          </div>
          <label>
            Phòng
            <input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} />
          </label>
          {error && <p className="error">{error}</p>}
          <button type="submit">Lưu</button>
        </form>
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Lớp</th>
                <th>Thứ</th>
                <th>Giờ</th>
                <th>Phòng</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {slots.map((s) => (
                <tr key={s.id}>
                  <td>{s.class_code}</td>
                  <td>{DAYS[s.weekday]}</td>
                  <td>
                    {String(s.start_time).slice(0, 5)}–{String(s.end_time).slice(0, 5)}
                  </td>
                  <td>{s.room || "—"}</td>
                  <td className="actions">
                    <button
                      type="button"
                      className="link"
                      onClick={() => {
                        setEditId(s.id);
                        setForm({
                          class_id: String(s.class_id),
                          weekday: s.weekday,
                          start_time: String(s.start_time).slice(0, 5),
                          end_time: String(s.end_time).slice(0, 5),
                          room: s.room || "",
                        });
                      }}
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      className="link danger"
                      onClick={async () => {
                        if (!confirm("Xóa ca này?")) return;
                        await api.deleteSlot(s.id);
                        await load();
                      }}
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
