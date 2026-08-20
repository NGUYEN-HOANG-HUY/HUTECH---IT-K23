import { useEffect, useRef, useState } from "react";
import { api } from "../api";

function statusLabel(s) {
  if (s === "present") return "Có mặt";
  if (s === "late") return "Muộn";
  if (s === "absent") return "Vắng";
  return s || "";
}

export default function Attendance() {
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState("");
  const [session, setSession] = useState(null);
  const [error, setError] = useState("");
  const [hint, setHint] = useState("Chọn lớp và mở phiên điểm danh.");
  const videoRef = useRef();
  const canvasRef = useRef();
  const streamRef = useRef(null);
  const loopRef = useRef(null);
  const rafRef = useRef(null);
  const sessionRef = useRef(null);
  const busyRef = useRef(false);
  const matchesRef = useRef([]);

  useEffect(() => {
    api.classes().then((cs) => {
      setClasses(cs);
      if (cs[0]) setClassId(String(cs[0].id));
    });
    return () => stopAll();
  }, []);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  function stopAll() {
    if (loopRef.current) {
      clearInterval(loopRef.current);
      loopRef.current = null;
    }
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    matchesRef.current = [];
  }

  function drawFrame() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas && video.readyState >= 2) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0);
      ctx.lineWidth = 3;
      ctx.font = "16px sans-serif";
      for (const m of matchesRef.current) {
        const [x1, y1, x2, y2] = m.bbox || [];
        if (x1 == null) continue;
        ctx.strokeStyle = "#2f9e6b";
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
        const label = `${m.name} (${m.score.toFixed(2)})`;
        ctx.fillStyle = "rgba(15, 42, 32, 0.85)";
        ctx.fillRect(x1, Math.max(0, y1 - 24), ctx.measureText(label).width + 12, 22);
        ctx.fillStyle = "#fff";
        ctx.fillText(label, x1 + 6, Math.max(16, y1 - 8));
      }
    }
    rafRef.current = requestAnimationFrame(drawFrame);
  }

  async function openSession() {
    setError("");
    try {
      const s = await api.openSession(Number(classId));
      setSession(s);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 960, height: 540, facingMode: "user" } });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setHint("Đưa mặt vào khung. Hệ thống gửi ~4 khung/giây tới máy chủ.");
      drawFrame();
      loopRef.current = setInterval(tick, 280);
    } catch (err) {
      setError(err.message);
    }
  }

  async function tick() {
    const sess = sessionRef.current;
    const video = videoRef.current;
    if (!sess || busyRef.current || !video || video.readyState < 2) return;
    busyRef.current = true;
    try {
      const off = document.createElement("canvas");
      off.width = video.videoWidth;
      off.height = video.videoHeight;
      off.getContext("2d").drawImage(video, 0, 0);
      const blob = await new Promise((resolve) => off.toBlob(resolve, "image/jpeg", 0.7));
      const result = await api.recognize(sess.id, blob);
      const facesDetected = result.faces_detected ?? result.faces ?? result.matches?.length ?? 0;
      matchesRef.current = result.matches || [];
      setHint(`Phát hiện ${facesDetected} khuôn mặt · khớp ${matchesRef.current.length}`);
      if ((result.matches || []).some((m) => m.newly_marked)) {
        setSession(await api.getSession(sess.id));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      busyRef.current = false;
    }
  }

  async function closeSession() {
    if (!session) return;
    stopAll();
    const s = await api.closeSession(session.id);
    setSession(s);
    setHint("Đã đóng phiên. Học viên chưa khớp được ghi vắng.");
  }

  const records = session?.records || [];

  return (
    <section>
      <header className="page-head">
        <h1>Điểm danh camera</h1>
        <div className="row">
          <select value={classId} onChange={(e) => setClassId(e.target.value)} disabled={!!session && session.status === "open"}>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>
          {(!session || session.status !== "open") && (
            <button type="button" onClick={openSession}>
              Mở phiên
            </button>
          )}
          {session?.status === "open" && (
            <button type="button" className="danger-btn" onClick={closeSession}>
              Đóng phiên
            </button>
          )}
        </div>
      </header>
      {error && <p className="error">{error}</p>}
      <p className="muted">{hint}</p>
      <div className="grid-2 attend">
        <div className="card camera-card">
          <video ref={videoRef} className="hidden" playsInline muted />
          <canvas ref={canvasRef} className="preview" />
        </div>
        <div className="card">
          <h2>Đã điểm danh {records.filter((r) => r.status !== "absent").length}</h2>
          <ul className="roll">
            {records.map((r) => (
              <li key={r.id}>
                <span>
                  <strong>{r.student_name || r.full_name || r.student_code || "Học viên"}</strong>
                  <em>{r.student_code || r.code || "—"}</em>
                </span>
                <span className={`badge ${r.status}`}>{statusLabel(r.status)}</span>
              </li>
            ))}
            {!records.length && <li className="muted">Chưa có lượt khớp</li>}
          </ul>
        </div>
      </div>
    </section>
  );
}
