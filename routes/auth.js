const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { registerUser, verifyUserEmail, loginUser, hashPassword } = require('../config/auth');
const { sendVerificationEmail, sendWelcomeEmail, sendPasswordResetEmail } = require('../config/mailer');
const { dbAsync } = require('../config/database');

const maskEmail = (email) => {
  if (!email || !email.includes('@')) {
    return email || 'unbekannt';
  }

  const [localPart, domain] = email.split('@');

  if (localPart.length <= 2) {
    return `${localPart[0] || '*'}***@${domain}`;
  }

  return `${localPart.slice(0, 2)}***@${domain}`;
};

// Registrierung
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, passwordConfirm } = req.body;

    if (!username || !email || !password || !passwordConfirm) {
      return res.status(400).json({ 
        success: false, 
        message: 'Bitte füllen Sie alle Felder aus' 
      });
    }

    if (password !== passwordConfirm) {
      return res.status(400).json({ 
        success: false, 
        message: 'Passwörter stimmen nicht überein' 
      });
    }

    // Einfache E-Mail-Validierung
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Ungültige E-Mail-Adresse' 
      });
    }

    const result = await registerUser(username, email, password);

    if (!result.success) {
      return res.status(400).json(result);
    }

    // Sende Verifizierungs-E-Mail
    const emailResult = await sendVerificationEmail(email, result.verificationToken);

    if (!emailResult.success) {
      // Fallback: Zeige Token für manuelle Verifizierung
      console.warn('⚠️ E-Mail konnte nicht versendet werden. Token:', result.verificationToken);
      return res.status(201).json({
        success: true,
        message: 'Registrierung erfolgreich! E-Mail konnte nicht versendet werden. Nutzen Sie den Token zum Verifizieren.',
        verificationToken: result.verificationToken,
        verificationUrl: `${process.env.FRONTEND_URL}/verify?token=${result.verificationToken}`
      });
    }

    res.status(201).json({
      success: true,
      message: 'Registrierung erfolgreich! Bitte überprüfen Sie Ihre E-Mail zur Verifizierung.'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Fehler bei der Registrierung', 
      error: error.message 
    });
  }
});

// E-Mail verifizieren
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ 
        success: false, 
        message: 'Verifizierungs-Token erforderlich' 
      });
    }

    const result = await verifyUserEmail(token);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      message: 'E-Mail erfolgreich verifiziert! Sie können sich jetzt anmelden.'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Fehler bei der E-Mail-Verifizierung', 
      error: error.message 
    });
  }
});

// DEBUG: Alle Benutzer mit ihren Verifizierungs-Tokens (nur für Entwicklung!)
router.get('/debug/users', async (req, res) => {
  try {
    const users = await dbAsync.all(
      'SELECT id, username, email, verified, verification_token FROM users'
    );
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'E-Mail und Passwort erforderlich' 
      });
    }

    const result = await loginUser(email, password);

    if (!result.success) {
      return res.status(401).json(result);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Fehler beim Login', 
      error: error.message 
    });
  }
});

// Passwort vergessen
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    console.log('🔐 Passwort-Reset angefordert für', maskEmail(email));

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'E-Mail erforderlich'
      });
    }

    const user = await dbAsync.get('SELECT id, email FROM users WHERE email = ?', [email]);

    // Aus Sicherheitsgründen immer dieselbe Antwort zurückgeben
    if (!user) {
      console.log('ℹ️ Passwort-Reset: Kein Benutzer gefunden für', maskEmail(email));
      return res.json({
        success: true,
        message: 'Falls ein Konto mit dieser E-Mail existiert, wurde ein Reset-Link gesendet.'
      });
    }

    console.log('✅ Passwort-Reset: Benutzer gefunden für', maskEmail(user.email));

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpiry = Date.now() + (60 * 60 * 1000); // 1 Stunde

    await dbAsync.run(
      'UPDATE users SET reset_password_token = ?, reset_password_expiry = ? WHERE id = ?',
      [resetToken, resetExpiry, user.id]
    );

    const emailResult = await sendPasswordResetEmail(user.email, resetToken);

    if (!emailResult.success) {
      console.warn('⚠️ Passwort-Reset E-Mail konnte nicht versendet werden:', emailResult.error || emailResult.message);

      await dbAsync.run(
        'UPDATE users SET reset_password_token = NULL, reset_password_expiry = NULL WHERE id = ?',
        [user.id]
      );

      // In Entwicklung einen Fallback-Link ausgeben, in Produktion keine Details leaken
      if (process.env.NODE_ENV !== 'production') {
        return res.json({
          success: true,
          message: 'Reset-E-Mail konnte nicht versendet werden. Nutzen Sie den Fallback-Link.',
          resetToken,
          resetUrl: `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`
        });
      }

      return res.status(502).json({
        success: false,
        message: 'Die Reset-E-Mail konnte derzeit nicht versendet werden. Bitte versuchen Sie es in einigen Minuten erneut.'
      });
    }

    console.log('✅ Passwort-Reset: Antwort erfolgreich für', maskEmail(user.email));

    return res.json({
      success: true,
      message: 'Falls ein Konto mit dieser E-Mail existiert, wurde ein Reset-Link gesendet.'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Fehler beim Anfordern des Passwort-Resets',
      error: error.message
    });
  }
});

// Passwort zurücksetzen
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password, passwordConfirm } = req.body;

    if (!token || !password || !passwordConfirm) {
      return res.status(400).json({
        success: false,
        message: 'Token und beide Passwortfelder sind erforderlich'
      });
    }

    if (password !== passwordConfirm) {
      return res.status(400).json({
        success: false,
        message: 'Passwörter stimmen nicht überein'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Passwort muss mindestens 6 Zeichen haben'
      });
    }

    const user = await dbAsync.get(
      'SELECT id FROM users WHERE reset_password_token = ? AND reset_password_expiry > ?',
      [token, Date.now()]
    );

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Ungültiger oder abgelaufener Reset-Link'
      });
    }

    const hashedPassword = await hashPassword(password);

    await dbAsync.run(
      `UPDATE users
       SET password = ?, reset_password_token = NULL, reset_password_expiry = NULL
       WHERE id = ?`,
      [hashedPassword, user.id]
    );

    return res.json({
      success: true,
      message: 'Passwort erfolgreich zurückgesetzt. Sie können sich jetzt anmelden.'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Fehler beim Zurücksetzen des Passworts',
      error: error.message
    });
  }
});

module.exports = router;
