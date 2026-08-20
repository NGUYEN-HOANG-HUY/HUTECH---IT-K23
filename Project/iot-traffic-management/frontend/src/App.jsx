import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Activity, Car, AlertTriangle } from 'lucide-react';
import './App.css';

const socket = io('http://localhost:3001');

function App() {
  const [trafficData, setTrafficData] = useState([]);

  useEffect(() => {
    socket.on('initialData', (data) => {
      setTrafficData(data);
    });

    socket.on('trafficData', (newData) => {
      setTrafficData((prevData) => {
        const index = prevData.findIndex(item => item.intersectionId === newData.intersectionId);
        if (index !== -1) {
          const updated = [...prevData];
          updated[index] = newData;
          return updated;
        } else {
          return [...prevData, newData];
        }
      });
    });

    return () => {
      socket.off('initialData');
      socket.off('trafficData');
    };
  }, []);

  const getStatusColor = (status) => {
    if (status === 'Heavy') return '#ef4444'; // Red
    if (status === 'Moderate') return '#f59e0b'; // Yellow
    return '#22c55e'; // Green
  };

  const getStatusLabel = (status) => {
    if (status === 'Heavy') return 'Kẹt xe';
    if (status === 'Moderate') return 'Đông đúc';
    return 'Thông thoáng';
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>
          <Activity className="icon-primary" size={32} />
          Hệ thống Quản lý Giao thông Thông minh (IoT)
        </h1>
        <p>Giám sát lưu lượng xe và điều khiển tín hiệu theo thời gian thực</p>
      </header>

      <main className="main-grid">
        <div className="card">
          <h2 className="card-title">
            <Car size={24} />
            Mật độ giao thông tại các nút giao
          </h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trafficData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="vehicleCount" radius={[4, 4, 0, 0]}>
                  {
                    trafficData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getStatusColor(entry.status)} />
                    ))
                  }
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h2 className="card-title">
            <AlertTriangle size={24} />
            Trạng thái trực tiếp
          </h2>
          <div className="status-list">
            {trafficData.length === 0 ? (
              <p className="empty-state">Đang chờ dữ liệu từ thiết bị IoT...</p>
            ) : (
              trafficData.map((item) => (
                <div key={item.intersectionId} className="status-item">
                  <div className="status-info">
                    <h3>{item.name}</h3>
                    <p>Cập nhật lúc: {new Date(item.timestamp).toLocaleTimeString()}</p>
                  </div>
                  <div className="status-metrics">
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(item.status) }}
                    >
                      {getStatusLabel(item.status)}
                    </span>
                    <span className="vehicle-count">{item.vehicleCount} xe/phút</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
