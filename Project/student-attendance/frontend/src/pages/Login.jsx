import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, setToken } from "../api";

export default function Login() {
  const [username, setUsername] = useState("Huy");
  const [password, setPassword] = useState("Huy123");
  const [error, setError] = useState("");
  const nav = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      const data = await api.login(username, password);
      const token = data?.access_token ?? data?.token;
      if (!token) throw new Error("Phản hồi đăng nhập không hợp lệ");
      setToken(token);
      nav("/diem-danh");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="login-wrap">
      <form className="card login-card" onSubmit={onSubmit}>
        <h1>Điểm danh học viên</h1>
        <p className="muted">Đăng nhập để quản lý lớp và nhận diện khuôn mặt.</p>
        <label>
          Tài khoản
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
        </label>
        <label>
          Mật khẩu
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit">Vào hệ thống</button>
      </form>
    </div>
  );
}
