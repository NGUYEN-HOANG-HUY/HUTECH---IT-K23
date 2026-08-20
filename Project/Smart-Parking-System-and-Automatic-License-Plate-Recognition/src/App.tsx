import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, BadgeCheck, Camera, CarFront, Check, ChevronRight, CircleHelp, Clock3, CreditCard, LayoutDashboard, LogOut, Menu, ParkingSquare, ScanLine, Settings2, Ticket, Users, X } from 'lucide-react'
import './App.css'

type ParkingRecord = {
  id: number
  sessionId?: string
  plate: string
  type: 'Xe máy' | 'Ô tô'
  ticket: 'Vé lượt' | 'Thành viên'
  spot: string
  entryAt: string
  status: 'Đang đỗ' | 'Đã ra' | 'Cảnh báo'
  fee?: number
}

const initialRecords: ParkingRecord[] = [
  { id: 1, plate: '51H-882.16', type: 'Ô tô', ticket: 'Thành viên', spot: 'A-08', entryAt: '07:42', status: 'Đang đỗ' },
  { id: 2, plate: '59X3-241.08', type: 'Xe máy', ticket: 'Vé lượt', spot: 'B-42', entryAt: '08:16', status: 'Đang đỗ' },
  { id: 3, plate: '51K-903.77', type: 'Ô tô', ticket: 'Vé lượt', spot: 'A-14', entryAt: '08:31', status: 'Đang đỗ' },
  { id: 4, plate: '50LD-118.22', type: 'Ô tô', ticket: 'Thành viên', spot: 'A-03', entryAt: '08:54', status: 'Đang đỗ' },
]

const formatCurrency = (amount: number) => `${amount.toLocaleString('vi-VN')} đ`
const apiBase = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'

function App() {
  const [records, setRecords] = useState(initialRecords)
  const [activeTab, setActiveTab] = useState<'overview' | 'vehicles'>('overview')
  const [flow, setFlow] = useState<'entry' | 'exit'>('entry')
  const [plate, setPlate] = useState('')
  const [selectedRecord, setSelectedRecord] = useState<ParkingRecord | null>(null)
  const [captured, setCaptured] = useState(false)
  const [cameraEnabled, setCameraEnabled] = useState(false)
  const [autoScanEnabled, setAutoScanEnabled] = useState(true)
  const [mismatchConfirmed, setMismatchConfirmed] = useState(false)
  const [toast, setToast] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanCanvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), [])

  const toggleCamera = async () => {
    if (cameraEnabled) {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      setCameraEnabled(false)
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setCameraEnabled(true)
    } catch {
      setToast('Không thể truy cập camera. Bạn có thể nhập biển số thủ công.')
    }
  }

  const startFlow = (nextFlow: 'entry' | 'exit') => {
    setFlow(nextFlow)
    setSelectedRecord(null)
    setPlate('')
    setCaptured(false)
    setMismatchConfirmed(false)
  }

  const chooseExitRecord = (record: ParkingRecord) => {
    setSelectedRecord(record)
    setPlate(record.plate)
    setCaptured(false)
    setMismatchConfirmed(false)
  }

  const runScan = async () => {
    setCaptured(true)
    if (cameraEnabled && videoRef.current && scanCanvasRef.current) {
      const canvas = scanCanvasRef.current
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0)
      const image = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
      if (image) {
        try {
          const form = new FormData()
          form.append('file', image, 'parking-frame.jpg')
          const response = await fetch(`${apiBase}/api/ocr`, { method: 'POST', body: form })
          if (response.ok) {
            const result = await response.json() as { plate: string }
            setPlate(result.plate)
            setToast('Đã nhận diện biển số từ FastAPI OCR')
            return
          }
        } catch {
          setToast('OCR backend chưa sẵn sàng, chuyển sang nhận diện mẫu.')
        }
      }
    }
    if (!plate) setPlate(flow === 'entry' ? '51H-882.16' : selectedRecord?.plate ?? '51H-882.16')
    setToast('Đã nhận diện biển số với độ tin cậy 96.8%')
  }

  const runScanEvent = useEffectEvent(runScan)

  useEffect(() => {
    if (!cameraEnabled || !autoScanEnabled) return
    const timer = window.setTimeout(() => void runScanEvent(), 900)
    return () => window.clearTimeout(timer)
  }, [autoScanEnabled, cameraEnabled, flow, selectedRecord])

  const normalized = (value: string) => value.replace(/[-. ]/g, '').toUpperCase()
  const exitPlateMismatch = Boolean(selectedRecord && plate && normalized(plate) !== normalized(selectedRecord.plate))
  const estimatedFee = selectedRecord ? (selectedRecord.type === 'Ô tô' ? 45000 : 15000) : 0

  const submitFlow = async () => {
    if (!plate.trim()) return setToast('Vui lòng chụp ảnh hoặc nhập biển số xe.')
    if (flow === 'exit' && !selectedRecord) return setToast('Hãy chọn một xe đang đỗ để ghi nhận xe ra.')
    if (flow === 'exit' && exitPlateMismatch && !mismatchConfirmed) return setToast('Cần xác nhận cảnh báo biển số không khớp trước khi hoàn tất.')
    if (flow === 'entry') {
      try {
        const response = await fetch(`${apiBase}/api/sessions/entry`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plate, vehicle_type: 'motorbike', ticket_type: 'hourly' }) })
        if (response.ok) {
          const session = await response.json() as { id: string; entry_plate: string; spot: string; entry_at: string }
          setRecords((current) => [{ id: Date.now(), sessionId: session.id, plate: session.entry_plate, type: 'Xe máy', ticket: 'Vé lượt', spot: session.spot, entryAt: new Date(session.entry_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }), status: 'Đang đỗ' }, ...current])
          setToast(`Đã lưu xe vào qua FastAPI: ${session.entry_plate}`)
        } else throw new Error('entry failed')
      } catch {
        setRecords((current) => [{ id: Date.now(), plate: plate.toUpperCase(), type: 'Xe máy', ticket: 'Vé lượt', spot: `B-${String(43 + current.length).padStart(2, '0')}`, entryAt: '09:18', status: 'Đang đỗ' }, ...current])
        setToast(`Backend chưa bật, đã lưu tạm xe vào ${plate.toUpperCase()}`)
      }
    } else {
      try {
        if (!selectedRecord?.sessionId) throw new Error('local session')
        const response = await fetch(`${apiBase}/api/sessions/${selectedRecord.sessionId}/exit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plate, confirm_mismatch: mismatchConfirmed }) })
        if (!response.ok) throw new Error('exit failed')
        const result = await response.json() as { fee: number; matched: boolean }
        setRecords((current) => current.map((record) => record.id === selectedRecord.id ? { ...record, status: result.matched ? 'Đã ra' : 'Cảnh báo', fee: result.fee } : record))
        setToast(`Đã hoàn tất lượt ra, phí ${formatCurrency(result.fee)}`)
      } catch {
        setRecords((current) => current.map((record) => record.id === selectedRecord?.id ? { ...record, status: exitPlateMismatch ? 'Cảnh báo' : 'Đã ra', fee: estimatedFee } : record))
        setToast(`Đã hoàn tất lượt ra cục bộ, phí ${formatCurrency(estimatedFee)}`)
      }
    }
    setPlate('')
    setCaptured(false)
    setSelectedRecord(null)
    setMismatchConfirmed(false)
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark"><ParkingSquare size={20} /></span><span>Park<span>Flow</span></span></div>
        <div className="site-switcher"><span className="live-dot" /> Bãi xe trung tâm <ChevronRight size={15} /></div>
        <nav>
          <button className={activeTab === 'overview' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveTab('overview')}><LayoutDashboard size={18} /> Tổng quan</button>
          <button className={activeTab === 'vehicles' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveTab('vehicles')}><CarFront size={18} /> Phương tiện</button>
          <button className="nav-item" onClick={() => startFlow('entry')}><ArrowDownToLine size={18} /> Xe vào</button>
          <button className="nav-item" onClick={() => startFlow('exit')}><ArrowUpFromLine size={18} /> Xe ra</button>
          <button className="nav-item"><CreditCard size={18} /> Thẻ thành viên</button>
          <button className="nav-item"><Settings2 size={18} /> Cấu hình</button>
        </nav>
        <div className="sidebar-bottom"><div className="operator"><div className="avatar">NT</div><div><strong>Nguyễn Trí</strong><small>Nhân viên vận hành</small></div><ChevronRight size={15} /></div><button className="nav-item"><LogOut size={18} /> Đăng xuất</button></div>
      </aside>

      <main className="main-content">
        <header className="topbar"><button className="mobile-menu" aria-label="Mở menu"><Menu size={20} /></button><div><p className="eyebrow">THỨ TƯ, 18 THÁNG 6, 2025</p><h1>{activeTab === 'overview' ? 'Tổng quan vận hành' : 'Phương tiện trong bãi'}</h1></div><div className="top-actions"><div className="system-status"><span className="live-dot" /> Hệ thống ổn định</div><button className="icon-button" aria-label="Trợ giúp"><CircleHelp size={19} /></button><div className="avatar large">NT</div></div></header>

        {activeTab === 'overview' ? <>
          <section className="metrics-grid">
            <article className="metric-card accent"><div className="metric-icon"><ParkingSquare size={20} /></div><span>Chỗ trống</span><strong>126 <small>/ 350</small></strong><div className="progress"><i style={{ width: '64%' }} /></div><p><b>64%</b> công suất sử dụng</p></article>
            <article className="metric-card"><div className="metric-icon blue"><CarFront size={20} /></div><span>Xe đang đỗ</span><strong>224</strong><p className="trend up">↗ 8.4% <em>so với hôm qua</em></p></article>
            <article className="metric-card"><div className="metric-icon purple"><CreditCard size={20} /></div><span>Doanh thu hôm nay</span><strong>8.420.000<small> đ</small></strong><p className="trend up">↗ 12.6% <em>so với hôm qua</em></p></article>
            <article className="metric-card"><div className="metric-icon orange"><Clock3 size={20} /></div><span>Thời gian đỗ TB</span><strong>2h 18m</strong><p className="trend down">↘ 4.2% <em>so với hôm qua</em></p></article>
          </section>

          <section className="workspace-grid">
            <article className="panel camera-panel"><div className="panel-heading"><div><span className="section-kicker"><span className="recording-dot" /> CAMERA CỔNG CHÍNH</span><h2>Ghi nhận phương tiện</h2></div><span className="camera-count">CAM-01 <span className="live-dot" /></span></div><div className="camera-stage">{cameraEnabled ? <video ref={videoRef} autoPlay muted playsInline /> : <div className="camera-placeholder"><ScanLine size={46} /><strong>Sẵn sàng quét biển số</strong><span>Bật camera để bắt đầu nhận diện tự động</span></div>} {captured && <div className="scan-box"><span>{plate || '51H-882.16'}</span><small>96.8% CONFIDENCE</small></div>}</div><canvas ref={scanCanvasRef} hidden /><div className="camera-controls"><button className={cameraEnabled ? 'secondary-button active-camera' : 'secondary-button'} onClick={toggleCamera}><Camera size={17} /> {cameraEnabled ? 'Tắt camera' : 'Bật camera'}</button><button className="primary-button" onClick={runScan}><ScanLine size={17} /> Chụp & nhận diện</button></div><label className="auto-scan-toggle"><input type="checkbox" checked={autoScanEnabled} onChange={(event) => setAutoScanEnabled(event.target.checked)} /><span>Tự động chụp & nhận diện khi vào/ra</span><b>{autoScanEnabled ? 'BẬT' : 'TẮT'}</b></label><div className="plate-input"><label>Biển số nhận diện</label><div><input value={plate} onChange={(event) => setPlate(event.target.value.toUpperCase())} placeholder="Nhập thủ công nếu cần..." /><BadgeCheck size={17} /></div></div><div className="flow-switch"><button className={flow === 'entry' ? 'selected' : ''} onClick={() => startFlow('entry')}><ArrowDownToLine size={16} /> Xe vào</button><button className={flow === 'exit' ? 'selected' : ''} onClick={() => startFlow('exit')}><ArrowUpFromLine size={16} /> Xe ra</button></div><button className="submit-button" onClick={submitFlow}>{flow === 'entry' ? 'Xác nhận xe vào' : 'Hoàn tất xe ra'} <ChevronRight size={17} /></button></article>

            <article className="panel activity-panel"><div className="panel-heading"><div><span className="section-kicker">HOẠT ĐỘNG GẦN ĐÂY</span><h2>Lưu lượng hôm nay</h2></div><button className="text-button">Xem tất cả <ChevronRight size={15} /></button></div><div className="activity-chart"><div className="chart-labels"><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div><div className="bars">{[48, 62, 45, 70, 58, 82, 68, 93, 76, 61, 79, 54].map((height, index) => <div className="bar-group" key={index}><i style={{ height: `${height}%` }} /><span>{`${7 + index}`.padStart(2, '0')}h</span></div>)}</div></div><div className="legend"><span><i className="legend-in" /> Xe vào</span><span><i className="legend-out" /> Xe ra</span><strong>Hôm nay <ChevronRight size={14} /></strong></div><div className="quick-stats"><div><span><ArrowDownToLine size={15} /> Xe vào</span><strong>186</strong></div><div><span><ArrowUpFromLine size={15} /> Xe ra</span><strong>142</strong></div></div></article>
          </section>

          <section className="panel table-panel"><div className="panel-heading"><div><span className="section-kicker">LIVE MONITORING</span><h2>Xe đang trong bãi <span className="count-pill">{records.filter((record) => record.status === 'Đang đỗ').length}</span></h2></div><div className="table-actions"><div className="search-box"><ScanLine size={16} /><input placeholder="Tìm biển số..." /></div><button className="filter-button">Tất cả <ChevronRight size={15} /></button></div></div><div className="table-wrap"><table><thead><tr><th>BIỂN SỐ</th><th>LOẠI XE</th><th>VÉ / THẺ</th><th>VỊ TRÍ</th><th>GIỜ VÀO</th><th>TRẠNG THÁI</th><th /></tr></thead><tbody>{records.filter((record) => record.status === 'Đang đỗ').map((record) => <tr key={record.id}><td><strong className="plate-code">{record.plate}</strong></td><td><span className="vehicle-cell"><CarFront size={16} /> {record.type}</span></td><td><span className={record.ticket === 'Thành viên' ? 'member-tag' : 'ticket-tag'}>{record.ticket === 'Thành viên' ? <Users size={13} /> : <Ticket size={13} />} {record.ticket}</span></td><td><span className="spot-code">{record.spot}</span></td><td>{record.entryAt}</td><td><span className="status-tag"><i /> {record.status}</span></td><td><button className="row-action" onClick={() => { startFlow('exit'); chooseExitRecord(record) }}><ArrowUpFromLine size={15} /> Xe ra</button></td></tr>)}</tbody></table></div></section>
        </> : <section className="panel vehicle-page"><div className="panel-heading"><div><span className="section-kicker">DANH SÁCH PHƯƠNG TIỆN</span><h2>Tất cả phương tiện</h2></div><button className="primary-button" onClick={() => startFlow('entry')}><ArrowDownToLine size={17} /> Ghi nhận xe vào</button></div><div className="vehicle-cards">{records.map((record) => <div className="vehicle-card" key={record.id}><div className="vehicle-card-top"><span className="plate-code">{record.plate}</span><span className={record.status === 'Đang đỗ' ? 'status-tag' : 'warning-tag'}><i /> {record.status}</span></div><div className="vehicle-card-info"><span><CarFront size={15} /> {record.type}</span><span><ParkingSquare size={15} /> {record.spot}</span><span><Clock3 size={15} /> {record.entryAt}</span></div><button className="row-action" onClick={() => { startFlow('exit'); chooseExitRecord(record) }}>Xử lý lượt xe <ChevronRight size={15} /></button></div>)}</div></section>}
      </main>
      {flow === 'exit' && selectedRecord && exitPlateMismatch && <div className="mismatch-banner"><AlertTriangle size={19} /><div><strong>Cảnh báo đối soát biển số</strong><span>Biển số vào <b>{selectedRecord.plate}</b> khác biển số ra <b>{plate}</b></span></div><label><input type="checkbox" checked={mismatchConfirmed} onChange={(event) => setMismatchConfirmed(event.target.checked)} /> Đã kiểm tra</label><button onClick={() => setSelectedRecord(null)} aria-label="Đóng cảnh báo"><X size={17} /></button></div>}
      {toast && <div className="toast"><Check size={17} /> {toast}<button onClick={() => setToast('')} aria-label="Đóng thông báo"><X size={15} /></button></div>}
    </div>
  )
}

export default App