import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../config/firebase';

export default function DashboardScreen({ navigation }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to real-time updates from Firestore
    const q = query(collection(db, "expenses"), orderBy("createdAt", "desc"), limit(10));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const exps = [];
      querySnapshot.forEach((doc) => {
        exps.push({ id: doc.id, ...doc.data() });
      });
      setExpenses(exps);
      setLoading(false);
    }, (error) => {
      console.log("Error fetching expenses: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const renderItem = ({ item }) => (
    <View style={styles.expenseItem}>
      <View style={styles.expenseInfo}>
        <Text style={styles.merchantText}>{item.merchantName || 'Cửa hàng không rõ'}</Text>
        <Text style={styles.dateText}>{item.date || 'Không có ngày'}</Text>
        <Text style={styles.categoryText}>{item.category || 'Khác'}</Text>
      </View>
      <Text style={styles.amountText}>{item.totalAmount ? item.totalAmount.toLocaleString() + ' đ' : '0 đ'}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quản lý Chi tiêu AI</Text>
      
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color="#007AFF" style={{marginTop: 50}}/>
        ) : expenses.length === 0 ? (
          <Text style={styles.subtitle}>Chưa có dữ liệu. Hãy quét hóa đơn của bạn!</Text>
        ) : (
          <FlatList
            data={expenses}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <TouchableOpacity 
        style={styles.button}
        onPress={() => navigation.navigate('Scanner')}
      >
        <Text style={styles.buttonText}>📸 Quét Hóa Đơn Mới</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    marginTop: 20,
    color: '#333'
  },
  content: {
    flex: 1,
    width: '100%',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 50,
  },
  listContainer: {
    paddingBottom: 20,
  },
  expenseItem: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  expenseInfo: {
    flex: 1,
  },
  merchantText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  dateText: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  categoryText: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 4,
  },
  amountText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E02020',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 30,
    position: 'absolute',
    bottom: 30,
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
