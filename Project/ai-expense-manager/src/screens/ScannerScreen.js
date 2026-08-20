import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { Camera, CameraType } from 'expo-camera/legacy'; // Fix for newer expo SDK
import * as ImagePicker from 'expo-image-picker';
import { analyzeReceipt } from '../services/gemini';
import { db, auth } from '../config/firebase'; // We'll save to DB later
import { collection, addDoc } from 'firebase/firestore';

export default function ScannerScreen({ navigation }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [cameraType, setCameraType] = useState(CameraType.back);
  const [isProcessing, setIsProcessing] = useState(false);
  const cameraRef = useRef(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const processImage = async (base64Image) => {
    setIsProcessing(true);
    try {
      const result = await analyzeReceipt(base64Image);
      console.log('Gemini Result:', result);
      Alert.alert(
        "Kết quả phân tích",
        `Tổng tiền: ${result.totalAmount}\nNgày: ${result.date}\nCửa hàng: ${result.merchantName}`,
        [
          {
            text: "Lưu lại", 
            onPress: () => saveExpense(result)
          },
          {
            text: "Hủy",
            style: "cancel"
          }
        ]
      );
    } catch (error) {
      Alert.alert("Lỗi", "Không thể phân tích hóa đơn. Vui lòng thử lại.");
    } finally {
      setIsProcessing(false);
    }
  };

  const saveExpense = async (data) => {
    try {
      // Temporarily saving without auth since it's not setup yet
      await addDoc(collection(db, "expenses"), {
        ...data,
        createdAt: new Date().toISOString()
      });
      Alert.alert("Thành công", "Đã lưu chi tiêu!");
      navigation.goBack();
    } catch (e) {
      console.error("Lỗi khi lưu:", e);
      Alert.alert("Lỗi", "Không thể lưu dữ liệu vào Firebase.");
    }
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      const options = { quality: 0.5, base64: true };
      const data = await cameraRef.current.takePictureAsync(options);
      processImage(data.base64);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      processImage(result.assets[0].base64);
    }
  };

  if (hasPermission === null) {
    return <View />;
  }
  if (hasPermission === false) {
    return <Text>No access to camera</Text>;
  }

  return (
    <View style={styles.container}>
      {isProcessing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>AI đang phân tích hóa đơn...</Text>
        </View>
      ) : (
        <Camera style={styles.camera} type={cameraType} ref={cameraRef}>
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.iconButton} onPress={pickImage}>
              <Text style={styles.text}>Thư viện</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
              <View style={styles.captureInner} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.iconButton} onPress={() => {
              setCameraType(
                cameraType === CameraType.back
                  ? CameraType.front
                  : CameraType.back
              );
            }}>
              <Text style={styles.text}>Đổi Cam</Text>
            </TouchableOpacity>
          </View>
        </Camera>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  buttonContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    marginBottom: 40,
  },
  iconButton: {
    padding: 15,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'white',
  },
  text: {
    fontSize: 16,
    color: 'white',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#333',
  }
});
