import time
import random
import json
import sys
import paho.mqtt.client as mqtt

# Fix cho Windows Terminal không in được tiếng Việt
sys.stdout.reconfigure(encoding='utf-8')

# Cấu hình MQTT Broker (sử dụng public broker cho mục đích thử nghiệm)
BROKER_ADDRESS = "broker.emqx.io"
PORT = 1883
TOPIC = "hutech/iot/traffic"

# Tạo danh sách các nút giao thông
intersections = [
    {"id": "I-01", "name": "Ngã tư Hàng Xanh"},
    {"id": "I-02", "name": "Ngã tư Phú Nhuận"},
    {"id": "I-03", "name": "Ngã tư Bảy Hiền"}
]

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("Đã kết nối thành công tới MQTT Broker!")
    else:
        print(f"Kết nối thất bại với mã lỗi {rc}")

def simulate_traffic_data():
    # Khởi tạo MQTT client
    client = mqtt.Client()
    client.on_connect = on_connect
    
    try:
        print(f"Đang kết nối tới {BROKER_ADDRESS}:{PORT}...")
        client.connect(BROKER_ADDRESS, PORT, 60)
    except Exception as e:
        print(f"Lỗi kết nối: {e}")
        return

    client.loop_start()

    print("Bắt đầu gửi dữ liệu mô phỏng...")
    try:
        while True:
            for intersection in intersections:
                # Giả lập số lượng xe cộ qua lại (0-100)
                vehicle_count = random.randint(0, 100)
                
                # Xác định trạng thái dựa trên mật độ
                if vehicle_count > 75:
                    status = "Heavy"
                elif vehicle_count > 40:
                    status = "Moderate"
                else:
                    status = "Light"
                
                payload = {
                    "intersectionId": intersection["id"],
                    "name": intersection["name"],
                    "vehicleCount": vehicle_count,
                    "status": status,
                    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
                }
                
                # Gửi lên topic chung
                client.publish(TOPIC, json.dumps(payload))
                print(f"Đã gửi: {payload}")
                
            time.sleep(3) # Gửi dữ liệu mỗi 3 giây
    except KeyboardInterrupt:
        print("Dừng mô phỏng.")
    finally:
        client.loop_stop()
        client.disconnect()

if __name__ == "__main__":
    simulate_traffic_data()
