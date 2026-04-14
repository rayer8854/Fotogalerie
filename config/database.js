const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'database.sqlite3');

// Stelle sicher, dass das Verzeichnis existiert
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Fehler beim Öffnen der Datenbank:', err);
  } else {
    console.log('Verbunden mit SQLite Datenbank');
    initializeDatabase();
  }
});

// Datenbank Schema initialisieren
function initializeDatabase() {
  db.serialize(() => {
    // Benutzer-Tabelle
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        verified INTEGER DEFAULT 0,
        verification_token TEXT,
        verification_token_expiry INTEGER,
        reset_password_token TEXT,
        reset_password_expiry INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Bilder-Tabelle
    db.run(`
      CREATE TABLE IF NOT EXISTS images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        filename TEXT NOT NULL,
        original_filename TEXT NOT NULL,
        description TEXT,
        year INTEGER,
        year_label TEXT,
        location TEXT,
        category TEXT,
        uploader_name TEXT NOT NULL,
        file_size INTEGER,
        mime_type TEXT,
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Migration: category-Spalte nachtragen, falls DB bereits existiert
    db.all(`PRAGMA table_info(images)`, (err, rows) => {
      if (err || !rows) return;
      const hasCategory = rows.some((row) => row.name === 'category');
      const hasYearLabel = rows.some((row) => row.name === 'year_label');
      if (!hasCategory) {
        db.run(`ALTER TABLE images ADD COLUMN category TEXT`);
      }
      if (!hasYearLabel) {
        db.run(`ALTER TABLE images ADD COLUMN year_label TEXT`);
      }
    });

    // Migration: Reset-Passwort-Spalten in users nachtragen
    db.all(`PRAGMA table_info(users)`, (err, rows) => {
      if (err || !rows) return;
      const hasResetToken = rows.some((row) => row.name === 'reset_password_token');
      const hasResetExpiry = rows.some((row) => row.name === 'reset_password_expiry');
      if (!hasResetToken) {
        db.run(`ALTER TABLE users ADD COLUMN reset_password_token TEXT`);
      }
      if (!hasResetExpiry) {
        db.run(`ALTER TABLE users ADD COLUMN reset_password_expiry INTEGER`);
      }
    });
  });
}

// Hilfsfunktionen für Datenbank-Operationen
const dbAsync = {
  run: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  },
  
  get: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },
  
  all: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
};

module.exports = { db, dbAsync };
