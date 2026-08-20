import { useEffect, useState } from "react";
import { api } from "../api";

export default function Reports() {
  const [classes, setClasses] = useState([]);
  const [params, setParams] = useState({ class_id: "", from: "", to: "" });
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.classes().then((cs) => {
      setClasses(cs);
      if (cs[0]) setParams((p) => ({ ...p, class_id: String(cs[0].id) }));
    });
  }, []);

  async function load(e) {
    e?.preventDefault();
    setError("");
    try {
      setReport(await api.report(params));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    if (params.class_id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.class_id]);

  return (
    <section>
      <header className="page-head">
        <h1>Báo cáo tỷ lệ hiện diện</h1>
      </header>
      <form className="card filters" onSubmit={load}>
        <label>
          Lớp
          <select value={params.class_id} onChange={(e) => setParams({ ...params, class_id: e.target.value })}>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Từ ngày
          <input type="date" value={params.from} onChange={(e) => setParams({ ...params, from: e.target.value })} />
        </label>
        <label>
          Đến ngày
          <input type="date" value={params.to} onChange={(e) => setParams({ ...params, to: e.target.value })} />
        </label>
        <button type="submit">Xem</button>
        <a className="button ghost" href={api.reportCsvUrl(params)} target="_blank" rel="noreferrer">
          Xuất CSV
        </a>
      </form>
      {error && <p className="error">{error}</p>}
      {report && (
        <>
          <div className="stats">
            <div className="stat">
              <span>Số phiên (đã đóng)</span>
              <strong>{report.sessions_count}</strong>
            </div>
            <div className="stat">
              <span>Tỷ lệ hiện diện</span>
              <strong>{report.overall_rate}%</strong>
            </div>
            <div className="stat">
              <span>Có mặt / muộn / vắng</span>
              <strong>
                {report.present} / {report.late} / {report.absent}
              </strong>
            </div>
          </div>
          <div className="card">
            <table>
              <thead>
                <tr>
                  <th>Mã</th>
                  <th>Họ tên</th>
                  <th>Có mặt</th>
                  <th>Muộn</th>
                  <th>Vắng</th>
                  <th>Tỷ lệ</th>
                </tr>
              </thead>
              <tbody>
                {report.students.map((s) => (
                  <tr key={s.student_id}>
                    <td>{s.code}</td>
                    <td>{s.full_name}</td>
                    <td>{s.present}</td>
                    <td>{s.late}</td>
                    <td>{s.absent}</td>
                    <td>{s.rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
