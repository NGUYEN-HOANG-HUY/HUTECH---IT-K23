const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mqtt = require('mqtt');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// MQTT Configuration
const MQTT_BROKER = "mqtt://broker.emqx.io";
const MQTT_TOPIC = "hutech/iot/traffic";
const mqttClient = mqtt.connect(MQTT_BROKER);

// Store the latest data for each intersection
let latestTrafficData = {};

mqttClient.on('connect', () => {
  console.log('Connected to MQTT Broker');
  mqttClient.subscribe(MQTT_TOPIC, (err) => {
    if (!err) {
      console.log(`Subscribed to topic: ${MQTT_TOPIC}`);
    }
  });
});

mqttClient.on('message', (topic, message) => {
  try {
    const data = JSON.parse(message.toString());
    console.log(`Received data from ${data.intersectionId}: ${data.status}`);
    
    // Save latest data
    latestTrafficData[data.intersectionId] = data;
    
    // Broadcast data to all web clients
    io.emit('trafficData', data);
  } catch (err) {
    console.error("Error parsing MQTT message", err);
  }
});

// Send current data when a new client connects
io.on('connection', (socket) => {
  console.log('A client connected');
  socket.emit('initialData', Object.values(latestTrafficData));
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Backend Server running on port ${PORT}`);
});
