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
    const verificationLink = `${process.env.FRONTEND_URL}/verify?token=${verificationToken}`;
    
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
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

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
