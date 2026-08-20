import { Navigate, Route, Routes } from "react-router-dom";
import { getToken } from "./api";
import Layout from "./components/Layout";
import Attendance from "./pages/Attendance";
import Classes from "./pages/Classes";
import History from "./pages/History";
import Login from "./pages/Login";
import Reports from "./pages/Reports";
import Students from "./pages/Students";
import Timetable from "./pages/Timetable";

function Guard({ children }) {
  if (!getToken()) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <Guard>
            <Layout />
          </Guard>
        }
      >
        <Route index element={<Navigate to="/diem-danh" replace />} />
        <Route path="lop" element={<Classes />} />
        <Route path="hoc-vien" element={<Students />} />
        <Route path="thoi-khoa-bieu" element={<Timetable />} />
        <Route path="diem-danh" element={<Attendance />} />
        <Route path="lich-su" element={<History />} />
        <Route path="bao-cao" element={<Reports />} />
      </Route>
    </Routes>
  );
}
