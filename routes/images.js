const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { verifyToken } = require('../config/auth');
const { dbAsync } = require('../config/database');

// Stelle sicher, dass Upload-Verzeichnis existiert
const configuredUploadDir = process.env.UPLOAD_DIR || './uploads';
const fallbackUploadDir = path.join(__dirname, '..', 'uploads');
let uploadDir = configuredUploadDir;

try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (error) {
  console.warn(`⚠️ Upload-Verzeichnis '${configuredUploadDir}' nicht nutzbar (${error.code || error.message}). Verwende Fallback '${fallbackUploadDir}'.`);
  uploadDir = fallbackUploadDir;
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
}

// Konfiguriere Multer für Datei-Upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Erstelle eindeutigen Dateinamen
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, name + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Nur Bilder erlauben
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Nur Bilddateien sind erlaubt (JPEG, PNG, GIF, WebP)'));
    }
  },
  limits: {
    fileSize: parseInt(process.env.MAX_IMAGE_SIZE) || 5242880 // 5MB
  }
});

// Middleware zur Token-Überprüfung
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Authentifizierung erforderlich' 
    });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ 
      success: false, 
      message: 'Ungültiger oder abgelaufener Token' 
    });
  }

  req.userId = decoded.userId;
  next();
};

// Bild hochladen
router.post('/upload', authenticate, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'Keine Datei hochgeladen' 
      });
    }

    const { description, year, yearLabel, location, category } = req.body;

    // Hole den Benutzernamen aus der Datenbank
    const user = await dbAsync.get(
      'SELECT username FROM users WHERE id = ?',
      [req.userId]
    );

    if (!user) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ 
        success: false, 
        message: 'Benutzer nicht gefunden' 
      });
    }

    const uploaderName = user.username;

    // Speichere Bild-Metadaten in Datenbank
    const result = await dbAsync.run(
      `INSERT INTO images (user_id, filename, original_filename, description, year, year_label, location, category, uploader_name, file_size, mime_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.userId,
        req.file.filename,
        req.file.originalname,
        description || '',
        year ? parseInt(year) : null,
        yearLabel || '',
        location || '',
        category || '',
        uploaderName,
        req.file.size,
        req.file.mimetype
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Bild erfolgreich hochgeladen',
      image: {
        id: result.lastID,
        filename: req.file.filename,
        originalName: req.file.originalname
      }
    });
  } catch (error) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ 
      success: false, 
      message: 'Fehler beim Hochladen des Bildes', 
      error: error.message 
    });
  }
});

// Alle Bilder abrufen (öffentlich)
router.get('/images', async (req, res) => {
  try {
    const images = await dbAsync.all(
      `SELECT id, filename, original_filename, description, year, year_label, location, category, uploader_name, uploaded_at, user_id
       FROM images
       ORDER BY uploaded_at DESC`
    );

    res.json({
      success: true,
      images: images || []
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Fehler beim Abrufen der Bilder', 
      error: error.message 
    });
  }
});

// Bilder des aktuellen Benutzers abrufen
router.get('/my-images', authenticate, async (req, res) => {
  try {
    const images = await dbAsync.all(
      `SELECT id, filename, original_filename, description, year, year_label, location, category, uploader_name, uploaded_at
       FROM images
       WHERE user_id = ?
       ORDER BY uploaded_at DESC`,
      [req.userId]
    );

    res.json({
      success: true,
      images: images || []
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Fehler beim Abrufen Ihrer Bilder', 
      error: error.message 
    });
  }
});

// Bild löschen
router.delete('/image/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Überprüfe ob Bild dem aktuellen Benutzer gehört
    const image = await dbAsync.get(
      'SELECT id, filename, user_id FROM images WHERE id = ?',
      [id]
    );

    if (!image) {
      return res.status(404).json({ 
        success: false, 
        message: 'Bild nicht gefunden' 
      });
    }

    if (image.user_id !== req.userId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Sie haben keine Berechtigung, dieses Bild zu löschen' 
      });
    }

    // Lösche Datei vom Dateisystem
    const filePath = path.join(uploadDir, image.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Lösche aus Datenbank
    await dbAsync.run(
      'DELETE FROM images WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'Bild erfolgreich gelöscht'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Fehler beim Löschen des Bildes', 
      error: error.message 
    });
  }
});

// Bild bearbeiten (Metadaten aktualisieren)
router.put('/image/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { description, year, yearLabel, category } = req.body;

    // Überprüfe ob Bild dem aktuellen Benutzer gehört
    const image = await dbAsync.get(
      'SELECT id, user_id FROM images WHERE id = ?',
      [id]
    );

    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Bild nicht gefunden'
      });
    }

    if (image.user_id !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'Sie haben keine Berechtigung, dieses Bild zu bearbeiten'
      });
    }

    await dbAsync.run(
      `UPDATE images
       SET description = ?, year = ?, year_label = ?, category = ?
       WHERE id = ?`,
      [
        description || '',
        year ? parseInt(year) : null,
        yearLabel || '',
        category || '',
        id
      ]
    );

    res.json({
      success: true,
      message: 'Bild erfolgreich aktualisiert'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Bildes',
      error: error.message
    });
  }
});

// Bild-Datei abrufen (für Frontend)
router.get('/image/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    
    // Sicherheitscheck: verhindere Directory Traversal
    const safePath = path.join(uploadDir, path.basename(filename));
    
    if (!fs.existsSync(safePath)) {
      return res.status(404).json({ 
        success: false, 
        message: 'Bild nicht gefunden' 
      });
    }

    res.sendFile(safePath);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Fehler beim Abrufen des Bildes', 
      error: error.message 
    });
  }
});

// Error Handler für Multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'Datei zu groß. Maximal 5MB erlaubt.'
      });
    }
  }
  if (error.message) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  next();
});

module.exports = router;
