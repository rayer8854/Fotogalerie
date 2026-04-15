const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  authMethod: process.env.EMAIL_AUTH_METHOD || 'LOGIN',
  logger: true,
  debug: true
});

const normalizeBaseUrl = (value) => {
  if (!value) {
    return null;
  }

  try {
    const parsedUrl = new URL(value);
    return parsedUrl.origin.replace(/\/$/, '');
  } catch (error) {
    console.warn('⚠️ Ungültige Basis-URL in der Mail-Konfiguration:', value);
    return null;
  }
};

const isLocalUrl = (value) => {
  if (!value) {
    return false;
  }

  try {
    const hostname = new URL(value).hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  } catch (error) {
    return false;
  }
};

const getFrontendBaseUrl = () => {
  const configuredUrl = normalizeBaseUrl(process.env.FRONTEND_URL);
  const appUrl = normalizeBaseUrl(process.env.APP_URL);
  const renderExternalUrl = normalizeBaseUrl(process.env.RENDER_EXTERNAL_URL);
  const candidates = [configuredUrl, appUrl, renderExternalUrl].filter(Boolean);

  if (process.env.NODE_ENV === 'production') {
    const publicUrl = candidates.find((candidate) => !isLocalUrl(candidate));

    if (publicUrl) {
      if (configuredUrl && isLocalUrl(configuredUrl)) {
        console.warn('⚠️ FRONTEND_URL zeigt in Produktion auf localhost. Verwende stattdessen:', publicUrl);
      }

      return publicUrl;
    }
  }

  if (candidates.length > 0) {
    return candidates[0];
  }

  return 'http://localhost:5000';
};

// Teste die Verbindung bei Server-Start
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ E-Mail-Konfiguration FEHLER:', error.message);
  } else {
    console.log('✅ E-Mail ist bereit! GMX-Verbindung erfolgreich');
  }
});

// Verifizierungs-E-Mail senden
const sendVerificationEmail = async (email, verificationToken) => {
  try {
    const verificationLink = `${getFrontendBaseUrl()}/verify?token=${verificationToken}`;
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Bestätigen Sie Ihre E-Mail-Adresse - Fotogalerie',
      html: `
        <h2>E-Mail-Verifizierung</h2>
        <p>Bitte klicken Sie auf den Link unten, um Ihre E-Mail-Adresse zu bestätigen:</p>
        <p><a href="${verificationLink}">E-Mail bestätigen</a></p>
        <p>Dieser Link verfällt in 24 Stunden.</p>
        <hr>
        <p>Wenn Sie diese E-Mail nicht angefordert haben, ignorieren Sie sie bitte.</p>
      `
    };

    await transporter.sendMail(mailOptions);
    return { success: true, message: 'Verifizierungs-E-Mail gesendet' };
  } catch (error) {
    console.error('Fehler beim Senden der E-Mail:', error);
    return { success: false, message: 'Fehler beim Senden der Verifizierungs-E-Mail', error: error.message };
  }
};

// Willkommens-E-Mail senden
const sendWelcomeEmail = async (email, username) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Willkommen in der Fotogalerie!',
      html: `
        <h2>Willkommen, ${username}!</h2>
        <p>Vielen Dank für die Registrierung in unserer Fotogalerie.</p>
        <p>Sie können sich jetzt einloggen und Ihre Fotos hochladen.</p>
        <hr>
        <p>Mit freundlichen Grüßen,<br>Das Fotogalerie-Team</p>
      `
    };

    await transporter.sendMail(mailOptions);
    return { success: true, message: 'Willkommens-E-Mail gesendet' };
  } catch (error) {
    console.error('Fehler beim Senden der E-Mail:', error);
    return { success: false, message: 'Fehler beim Senden der Willkommens-E-Mail' };
  }
};

// Passwort-Reset E-Mail senden
const sendPasswordResetEmail = async (email, resetToken) => {
  try {
    const resetLink = `${getFrontendBaseUrl()}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Passwort zurücksetzen - Fotogalerie',
      html: `
        <h2>Passwort zurücksetzen</h2>
        <p>Sie haben eine Zurücksetzung Ihres Passworts angefordert.</p>
        <p><a href="${resetLink}">Neues Passwort setzen</a></p>
        <p>Dieser Link verfällt in 1 Stunde.</p>
        <hr>
        <p>Wenn Sie das nicht waren, ignorieren Sie diese E-Mail.</p>
      `
    };

    await transporter.sendMail(mailOptions);
    return { success: true, message: 'Passwort-Reset E-Mail gesendet' };
  } catch (error) {
    console.error('Fehler beim Senden der Passwort-Reset E-Mail:', error);
    return { success: false, message: 'Fehler beim Senden der Passwort-Reset E-Mail', error: error.message };
  }
};

module.exports = {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail
};
