require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Stelle sicher, dass Upload-Verzeichnis existiert
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Statische Dateien servieren
app.use(express.static('public'));
app.use('/uploads', express.static(uploadDir));

// Datenbank initialisieren
require('./config/database');

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/images'));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Server läuft',
    timestamp: new Date().toISOString()
  });
});

// Frontend-Route: Index-Seite servieren
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Verifizierungs-Route: Serviert die index.html damit Frontend den Token verarbeiten kann
app.get('/verify', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Passwort-Reset-Route: Serviert die index.html damit Frontend den Token verarbeiten kann
app.get('/reset-password', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route nicht gefunden' 
  });
});

// Error Handler
app.use((error, req, res, next) => {
  console.error('Fehler:', error);
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Ein Fehler ist aufgetreten'
  });
});

// Server starten
app.listen(PORT, () => {
  console.log(`🚀 Server läuft auf http://localhost:${PORT}`);
  console.log(`📷 Fotogalerie bereit zur Nutzung`);
});
