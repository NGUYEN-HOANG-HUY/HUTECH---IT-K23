import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { setToken } from "../api";

const links = [
  { to: "/diem-danh", label: "Điểm danh" },
  { to: "/lop", label: "Lớp học" },
  { to: "/hoc-vien", label: "Học viên" },
  { to: "/thoi-khoa-bieu", label: "Thời khóa biểu" },
  { to: "/lich-su", label: "Lịch sử" },
  { to: "/bao-cao", label: "Báo cáo" },
];

export default function Layout() {
  const nav = useNavigate();
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <strong>Điểm danh</strong>
          <span>Nhận diện khuôn mặt</span>
        </div>
        <nav>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => (isActive ? "active" : "")}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <button
          className="ghost"
          onClick={() => {
            setToken(null);
            nav("/login");
          }}
        >
          Đăng xuất
        </button>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
