import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Dimensions } from 'react-native';
import { io } from 'socket.io-client';
import { BarChart } from 'react-native-chart-kit';
import { AlertTriangle, Activity } from 'lucide-react-native';

const socket = io('http://192.168.0.101:3001');

export default function App() {
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
    if (status === 'Heavy') return '#ef4444';
    if (status === 'Moderate') return '#f59e0b';
    return '#22c55e';
  };

  const getStatusLabel = (status) => {
    if (status === 'Heavy') return 'Kẹt xe';
    if (status === 'Moderate') return 'Đông đúc';
    return 'Thông thoáng';
  };

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(15, 23, 42, ${opacity})`,
    barPercentage: 0.8,
    fillShadowGradientOpacity: 1,
  };

  const dataForChart = {
    labels: trafficData.length > 0 ? trafficData.map(item => item.name.replace('Ngã tư ', '')) : [''],
    datasets: [
      {
        data: trafficData.length > 0 ? trafficData.map(item => item.vehicleCount) : [0],
        colors: trafficData.length > 0 ? trafficData.map(item => () => getStatusColor(item.status)) : [() => '#ccc']
      }
    ]
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Activity color="#2563eb" size={32} />
        <Text style={styles.headerTitle}>Hệ thống IoT Giao thông</Text>
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.cardTitle}>Mật độ giao thông</Text>
        {trafficData.length > 0 ? (
          <BarChart
            data={dataForChart}
            width={Dimensions.get('window').width - 80}
            height={220}
            yAxisSuffix=""
            chartConfig={chartConfig}
            withCustomBarColorFromData={true}
            flatColor={true}
            style={styles.chart}
          />
        ) : (
          <Text style={styles.emptyState}>Đang tải biểu đồ...</Text>
        )}
      </View>

      <View style={styles.listCard}>
        <View style={styles.listHeader}>
          <AlertTriangle color="#64748b" size={24} />
          <Text style={styles.cardTitle}>Trạng thái trực tiếp</Text>
        </View>

        {trafficData.length === 0 ? (
          <Text style={styles.emptyState}>Đang chờ dữ liệu từ thiết bị IoT...</Text>
        ) : (
          trafficData.map((item) => (
            <View key={item.intersectionId} style={styles.statusItem}>
              <View>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemTime}>Cập nhật: {new Date(item.timestamp).toLocaleTimeString()}</Text>
              </View>
              <View style={styles.itemMetrics}>
                <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) }]}>
                  <Text style={styles.badgeText}>{getStatusLabel(item.status)}</Text>
                </View>
                <Text style={styles.vehicleCount}>{item.vehicleCount} xe/p</Text>
              </View>
            </View>
          ))
        )}
      </View>
      <View style={{height: 40}} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 24,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginLeft: 12,
    color: '#1e293b',
  },
  chartCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 16,
  },
  chart: {
    borderRadius: 8,
    marginLeft: -10,
  },
  listCard: {
    marginBottom: 40,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  itemTime: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  itemMetrics: {
    alignItems: 'flex-end',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    marginBottom: 8,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  vehicleCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#334155',
  },
  emptyState: {
    color: '#64748b',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
});
