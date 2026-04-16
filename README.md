# 📷 Fotogalerie - Anwendung

Eine moderne Fotogalerie-Anwendung mit Benutzerregistrierung, E-Mail-Verifizierung, Authentifizierung und Bild-Management.

## Features

✅ **Benutzerregistrierung** - Neue Benutzer können sich registrieren  
✅ **E-Mail-Verifizierung** - Bestätigungslink wird per E-Mail versendet  
✅ **Benutzer-Authentifizierung** - Sichere Login mit JWT-Tokens  
✅ **Bild-Upload** - Hochladen von Bildern mit Metadaten  
✅ **Bild-Verwaltung** - Eigene Bilder ansehen und löschen  
✅ **Galerie-Ansicht** - Alle hochgeladenen Bilder in einer Galerie ansehen  
✅ **Filterung** - Nach Ort und Aufnahmejahr filtern  
✅ **Datenbank** - SQLite für einfache und robuste Datenspeicherung  

## Technologie-Stack

- **Backend:** Node.js mit Express.js
- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Datenbank:** SQLite3
- **Authentifizierung:** JWT (JSON Web Tokens)
- **Datei-Upload:** Multer
- **E-Mail:** Nodemailer
- **Verschlüsselung:** bcryptjs

## Installation

### Voraussetzungen
- Node.js (v14 oder höher)
- npm oder yarn

### Schritt 1: Abhängigkeiten installieren

```bash
npm install
```

### Schritt 2: Umgebungsvariablen konfigurieren

Kopieren Sie `.env.example` zu `.env` und bearbeiten Sie die Werte:

```bash
cp .env.example .env
```

**Wichtige Konfigurationen:**
- `JWT_SECRET` - Ändern Sie dies zu einem sicheren Passwort
- `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS` - E-Mail-Konfiguration
- `FRONTEND_URL` - URL wo die Anwendung erreichbar ist (für E-Mail-Links)

### E-Mail-Konfiguration

#### Mit Gmail:
1. Aktivieren Sie die "2-Faktor-Authentifizierung" in Ihrem Gmail-Konto
2. Generieren Sie ein "App Password" unter https://myaccount.google.com/apppasswords
3. Verwenden Sie dieses Passwort in der `.env` Datei:

```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=ihre_email@gmail.com
EMAIL_PASS=ihr_app_password
FRONTEND_URL=http://localhost:3000
```

#### Mit anderen E-Mail-Diensten:
- **Outlook/Hotmail:** `smtp.outlook.com`, Port: `587`
- **Yahoo:** `smtp.mail.yahoo.com`, Port: `587`
- **SendGrid:** Siehe SendGrid-Dokumentation

### Schritt 3: Server starten

**Entwicklungsmodus (mit Auto-Reload):**
```bash
npm run dev
```

**Produktions-Modus:**
```bash
npm start
```

Der Server läuft dann auf: **http://localhost:5000**

## Verwendung

### 1. Benutzer-Registrierung

1. Öffnen Sie die Anwendung im Browser
2. Klicken Sie auf "Registrierung"
3. Füllen Sie die Registrierungsformular aus:
   - Benutzername
   - E-Mail-Adresse
   - Passwort (2x eingeben)
4. Klicken Sie "Registrieren"
5. Überprüfen Sie Ihre E-Mail auf den Verifizierungslink
6. Klicken Sie auf den Link in der E-Mail
7. Ihre E-Mail ist nun verifiziert!

### 2. Login

1. Geben Sie Ihre E-Mail und Passwort ein
2. Klicken Sie "Anmelden"
3. Sie werden zur Galerie weitergeleitet

### 3. Bild hochladen

1. Klicken Sie auf "Hochladen" in der Navigation
2. Wählen Sie ein Bild aus (JPEG, PNG, GIF oder WebP, max. 5MB)
3. Füllen Sie die Felder aus:
   - **Ihr Name** (erforderlich) - Name des Uploaders
   - **Beschreibung** - Optionale Beschreibung des Bildes
   - **Aufnahmejahr** - Jahr, in dem das Foto gemacht wurde
   - **Aufnahmeort** - Ort, wo das Foto gemacht wurde
4. Klicken Sie "Hochladen"
5. Das Bild wird in der Galerie angezeigt

### 4. Galerie durchsuchen

1. In der **Galerie-Ansicht** können Sie:
   - Alle hochgeladenen Bilder sehen
   - Nach Ort suchen
   - Nach Aufnahmejahr filtern
   - Auf ein Bild klicken für mehr Details

### 5. Meine Bilder anzeigen

1. Klicken Sie auf "Meine Bilder" in der Navigation
2. Sehen Sie alle von Ihnen hochgeladenen Bilder
3. Klicken Sie auf ein Bild um es zu löschen

## Projektstruktur

```
Fotogalerie/
├── config/
│   ├── database.js          # Datenbank-Konfiguration
│   ├── auth.js              # Authentifizierung & JWT
│   └── mailer.js            # E-Mail-Service
├── routes/
│   ├── auth.js              # Auth-Endpoints (Register, Login, Verify)
│   └── images.js            # Image-Endpoints (Upload, Delete, Get)
├── public/
│   ├── index.html           # Frontend HTML
│   ├── styles.css           # Styling
│   └── app.js               # Frontend JavaScript
├── uploads/                 # Hochgeladene Bilder (wird erstellt)
├── server.js                # Hauptserver
├── package.json             # NPM-Dependencies
├── .env                     # Umgebungsvariablen (nicht versionieren!)
├── .env.example             # Beispiel-Konfiguration
├── .gitignore              # Git ignore-Datei
└── database.sqlite3        # SQLite-Datenbank (wird erstellt)
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Benutzer registrieren
- `POST /api/auth/login` - Benutzer anmelden
- `POST /api/auth/verify-email` - E-Mail verifizieren

### Images
- `POST /api/upload` - Bild hochladen (erfordert Token)
- `GET /api/images` - Alle Bilder abrufen
- `GET /api/my-images` - Eigene Bilder abrufen (erfordert Token)
- `DELETE /api/image/:id` - Bild löschen (erfordert Token)
- `GET /api/image/:filename` - Bild-Datei abrufen

## Troubleshooting

### E-Mails werden nicht versendet

1. **Überprüfen Sie die `.env` Konfiguration**
   - EMAIL_HOST, EMAIL_USER, EMAIL_PASS müssen korrekt sein
   - Für Gmail: Stellen Sie sicher, dass Sie ein "App Password" verwenden

2. **Überprüfen Sie die Logs im Terminal**
   - Suchen Sie nach Fehlermeldungen beim Server-Start

3. **Testen Sie die Netzwerkverbindung zum Mail-Server**
   - Der Port 587 muss erreichbar sein

### Datenbank-Fehler

1. **Löschen Sie die alte Datenbank:**
   ```bash
   rm database.sqlite3
   ```

2. **Starten Sie den Server neu** - Die Datenbank wird automatisch neu erstellt

### Bilder werden nicht hochgeladen

1. Überprüfen Sie die Dateiformat - nur JPEG, PNG, GIF, WebP sind erlaubt
2. Überprüfen Sie die Dateigröße - max. 5MB
3. Stellen Sie sicher, dass das `uploads/` Verzeichnis Schreibberechtigungen hat

## Render Persistent Disk

Wenn die Anwendung auf Render mit SQLite betrieben wird, sollten Datenbank und Uploads auf eine Persistent Disk gelegt werden. Sonst können Benutzerkonten, Reset-Tokens und hochgeladene Bilder nach Deploys oder Neustarts verloren gehen.

### Empfohlene Render-Einstellungen

1. Fügen Sie Ihrem Web Service eine Persistent Disk hinzu.
2. Wählen Sie als Mount Path zum Beispiel `/var/data/fotogalerie`.
3. Setzen Sie in den Environment Variables diese Werte:

```env
DATABASE_PATH=/var/data/fotogalerie/database.sqlite3
UPLOAD_DIR=/var/data/fotogalerie/uploads
```

### Verhalten der Anwendung

1. `DATABASE_PATH` wird für die SQLite-Datei verwendet.
2. `UPLOAD_DIR` wird für hochgeladene Bilder verwendet.
3. Relative Pfade funktionieren lokal weiter, absolute Pfade eignen sich für Render.

### Wichtig

1. Nach dem Anlegen der Disk und dem Setzen der Variablen muss der Service neu deployt werden.
2. Bestehende lokale SQLite-Daten werden dadurch nicht automatisch nach Render kopiert.
3. Ohne Persistent Disk bleibt SQLite auf Render nur eine temporäre Lösung.

## Sicherheitshinweise

⚠️ **Für Produktion wichtig:**

1. **JWT_SECRET ändern** - Verwenden Sie ein starkes, zufälliges Passwort
2. **HTTPS verwenden** - In Produktion immer HTTPS einsetzen
3. **CORS konfigurieren** - Nur erlaubte Domains zulassen
4. **Eingabe-Validierung** - Alle Eingaben werden validiert
5. **Rate Limiting** - Sollte für APIs implementiert werden
6. **Datei-Upload** - MIME-Type und Größe werden überprüft

## Lizenz

MIT License

## Unterstützung

Falls Sie Probleme haben, überprüfen Sie bitte:
1. Alle Abhängigkeiten sind installiert (`npm install`)
2. Die `.env` Datei ist korrekt konfiguriert
3. Der Server läuft auf Port 5000
4. Die E-Mail-Konfiguration ist richtig

Viel Spaß mit Ihrer Fotogalerie! 📸
