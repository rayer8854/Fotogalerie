const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { dbAsync } = require('./database');

// Hash Password
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

// Vergleiche Password
const comparePassword = async (password, hashedPassword) => {
  return bcrypt.compare(password, hashedPassword);
};

// Erstelle JWT Token
const createToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

// Erstelle Verifizierungs-Token (kurz gültig)
const createVerificationToken = () => {
  return uuidv4();
};

// Überprüfe JWT Token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Benutzer registrieren
const registerUser = async (username, email, password) => {
  try {
    // Überprüfe ob Benutzer bereits existiert
    const existing = await dbAsync.get(
      'SELECT id FROM users WHERE email = ? OR username = ?',
      [email, username]
    );
    
    if (existing) {
      return { success: false, message: 'E-Mail oder Benutzername existiert bereits' };
    }

    const hashedPassword = await hashPassword(password);
    const verificationToken = createVerificationToken();
    const tokenExpiry = Date.now() + (24 * 60 * 60 * 1000); // 24 Stunden

    const result = await dbAsync.run(
      `INSERT INTO users (username, email, password, verification_token, verification_token_expiry) 
       VALUES (?, ?, ?, ?, ?)`,
      [username, email, hashedPassword, verificationToken, tokenExpiry]
    );

    return { 
      success: true, 
      userId: result.lastID,
      verificationToken,
      message: 'Benutzer erfolgreich registriert' 
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

// Benutzer verifizieren
const verifyUserEmail = async (verificationToken) => {
  try {
    const user = await dbAsync.get(
      'SELECT id FROM users WHERE verification_token = ? AND verification_token_expiry > ?',
      [verificationToken, Date.now()]
    );

    if (!user) {
      return { success: false, message: 'Ungültiger oder abgelaufener Token' };
    }

    await dbAsync.run(
      'UPDATE users SET verified = 1, verification_token = NULL, verification_token_expiry = NULL WHERE id = ?',
      [user.id]
    );

    return { success: true, message: 'E-Mail erfolgreich verifiziert' };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

// Benutzer Login
const loginUser = async (email, password) => {
  try {
    const user = await dbAsync.get(
      'SELECT id, username, email, verified, password FROM users WHERE email = ?',
      [email]
    );

    if (!user) {
      return { success: false, message: 'Benutzer nicht gefunden' };
    }

    if (!user.verified) {
      return { success: false, message: 'Bitte verifizieren Sie Ihre E-Mail zuerst' };
    }

    const passwordMatch = await comparePassword(password, user.password);
    if (!passwordMatch) {
      return { success: false, message: 'Falsches Passwort' };
    }

    const token = createToken(user.id);
    return { 
      success: true, 
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      },
      message: 'Erfolgreich angemeldet'
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

// Benutzer abrufen
const getUserById = async (userId) => {
  return dbAsync.get(
    'SELECT id, username, email, created_at FROM users WHERE id = ?',
    [userId]
  );
};

module.exports = {
  hashPassword,
  comparePassword,
  createToken,
  createVerificationToken,
  verifyToken,
  registerUser,
  verifyUserEmail,
  loginUser,
  getUserById
};
