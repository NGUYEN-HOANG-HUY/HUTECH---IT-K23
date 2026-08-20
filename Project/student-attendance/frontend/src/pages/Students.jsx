import { useEffect, useRef, useState } from "react";
import { api } from "../api";

export default function Students() {
  const [classes, setClasses] = useState([]);
  const [rows, setRows] = useState([]);
  const [classId, setClassId] = useState("");
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ code: "", full_name: "", class_id: "" });
  const [error, setError] = useState("");
  const fileRef = useRef();
  const videoRef = useRef();
  const [camOn, setCamOn] = useState(false);
  const streamRef = useRef(null);

  async function load(cid = classId) {
    const list = await api.students(cid || undefined);
    setRows(list);
  }

  useEffect(() => {
    api.classes().then((cs) => {
      setClasses(cs);
      if (cs[0]) {
        setClassId(String(cs[0].id));
        setForm((f) => ({ ...f, class_id: String(cs[0].id) }));
      }
    });
  }, []);

  useEffect(() => {
    if (classId) load(classId).catch((e) => setError(e.message));
  }, [classId]);

  useEffect(() => {
    return () => stopCam();
  }, []);

  async function startCam() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
    streamRef.current = stream;
    if (videoRef.current) videoRef.current.srcObject = stream;
    setCamOn(true);
  }

  function stopCam() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamOn(false);
  }

  async function captureBlob() {
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
  }

  async function save(e) {
    e.preventDefault();
    setError("");
    const data = new FormData();
    data.append("student_code", form.code);
    data.append("full_name", form.full_name);
    data.append("class_id", form.class_id);
    const file = fileRef.current?.files?.[0];
    if (file) data.append("photo", file);
    try {
      await api.saveStudent(editId, data);
      setEditId(null);
      setForm({ code: "", full_name: "", class_id: form.class_id });
      if (fileRef.current) fileRef.current.value = "";
      await load(classId);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section>
      <header className="page-head">
        <h1>Học viên</h1>
        <select value={classId} onChange={(e) => setClassId(e.target.value)}>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code} — {c.name}
            </option>
          ))}
        </select>
      </header>
      <div className="grid-2">
        <form className="card" onSubmit={save}>
          <h2>{editId ? "Sửa học viên" : "Thêm học viên"}</h2>
          <label>
            Mã HV
            <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
          </label>
          <label>
            Họ tên
            <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
          </label>
          <label>
            Lớp
            <select value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value })}>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code}
                </option>
              ))}
            </select>
          </label>
          <label>
            Ảnh khuôn mặt (đúng 1 mặt)
            <input ref={fileRef} type="file" accept="image/*" />
          </label>
          <div className="cam-box">
            <video ref={videoRef} autoPlay playsInline muted className={camOn ? "" : "hidden"} />
            <div className="row">
              {!camOn ? (
                <button type="button" className="ghost" onClick={startCam}>
                  Mở webcam đăng ký
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={async () => {
                      const blob = await captureBlob();
                      const file = new File([blob], "enroll.jpg", { type: "image/jpeg" });
                      const dt = new DataTransfer();
                      dt.items.add(file);
                      if (fileRef.current) fileRef.current.files = dt.files;
                      stopCam();
                    }}
                  >
                    Chụp ảnh
                  </button>
                  <button type="button" className="ghost" onClick={stopCam}>
                    Tắt
                  </button>
                </>
              )}
            </div>
          </div>
          {error && <p className="error">{error}</p>}
          <div className="row">
            <button type="submit">Lưu & đăng ký khuôn mặt</button>
            {editId && (
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  setEditId(null);
                  setForm({ code: "", full_name: "", class_id: classId });
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
                <th>Ảnh</th>
                <th>Mã</th>
                <th>Họ tên</th>
                <th>Khuôn mặt</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id}>
                  <td>
                    {s.photo_path ? <img className="avatar" src={s.photo_path} alt="" /> : "—"}
                  </td>
                  <td>{s.code}</td>
                  <td>{s.full_name}</td>
                  <td>{s.has_embedding ? "Đã enroll" : "Chưa"}</td>
                  <td className="actions">
                    <button
                      type="button"
                      className="link"
                      onClick={() => {
                        setEditId(s.id);
                        setForm({ code: s.code, full_name: s.full_name, class_id: String(s.class_id) });
                      }}
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      className="link danger"
                      onClick={async () => {
                        if (!confirm("Xóa học viên?")) return;
                        await api.deleteStudent(s.id);
                        await load(classId);
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
