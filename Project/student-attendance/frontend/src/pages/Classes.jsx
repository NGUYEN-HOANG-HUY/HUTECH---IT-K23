import { useEffect, useState } from "react";
import { api } from "../api";

export default function Classes() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ code: "", name: "", description: "" });
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState("");

  async function load() {
    setRows(await api.classes());
  }
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function save(e) {
    e.preventDefault();
    setError("");
    try {
      if (editId) await api.updateClass(editId, form);
      else await api.createClass(form);
      setForm({ code: "", name: "", description: "" });
      setEditId(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section>
      <header className="page-head">
        <h1>Lớp học</h1>
      </header>
      <div className="grid-2">
        <form className="card" onSubmit={save}>
          <h2>{editId ? "Sửa lớp" : "Thêm lớp"}</h2>
          <label>
            Mã lớp
            <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
          </label>
          <label>
            Tên lớp
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <label>
            Mô tả
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </label>
          {error && <p className="error">{error}</p>}
          <div className="row">
            <button type="submit">Lưu</button>
            {editId && (
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  setEditId(null);
                  setForm({ code: "", name: "", description: "" });
                }}
              >
                Hủy
              </button>
            )}
          </div>
        </form>
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Mã</th>
                <th>Tên</th>
                <th>HV</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td>{c.code}</td>
                  <td>
                    {c.name}
                    {c.description ? <div className="muted small">{c.description}</div> : null}
                  </td>
                  <td>{c.student_count}</td>
                  <td className="actions">
                    <button
                      type="button"
                      className="link"
                      onClick={() => {
                        setEditId(c.id);
                        setForm({ code: c.code, name: c.name, description: c.description || "" });
                      }}
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      className="link danger"
                      onClick={async () => {
                        if (!confirm("Xóa lớp này?")) return;
                        await api.deleteClass(c.id);
                        await load();
                      }}
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={4} className="muted">
                    Chưa có lớp
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
