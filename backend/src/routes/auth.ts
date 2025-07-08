import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { createUser, findUserByEmail } from '../models/user';
import bcrypt from 'bcryptjs';
import { AuthenticatedRequest } from '../middleware/auth';
import { getDatabase } from '../config/database';
import crypto from 'crypto';
import { sendEmail } from '../utils/email';

const router = Router();

const JWT_SECRET = process.env['JWT_SECRET'] || 'dev-secret';

// In-memory store for reset tokens (for demo; use DB in production)
const resetTokens: Record<string, string> = {};

// Example: /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  try {
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
    res.status(200).json({
      message: 'Login successful',
      token,
      user: { id: user.id, email: user.email, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Example: /api/auth/register
router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  try {
    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'User already exists.' });
    }
    const user = await createUser(email, password);
    res.status(201).json({ message: 'User registered successfully', user: { id: user.id, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// /api/auth/profile
router.get('/profile', require('../middleware/auth').authMiddleware, (req: AuthenticatedRequest, res) => {
  // req.user is set by authMiddleware
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  res.json({ user: req.user });
});

// /api/auth/change-password
router.post('/change-password', require('../middleware/auth').authMiddleware, async (req: AuthenticatedRequest, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'Old and new password are required.' });
  }
  try {
    const db = getDatabase();
    const userRes = await db.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const user = userRes.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });
    const match = await bcrypt.compare(oldPassword, user.password);
    if (!match) return res.status(401).json({ error: 'Old password is incorrect' });
    const hashed = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password = $1 WHERE id = $2', [hashed, req.user.id]);
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Request password reset
router.post('/request-reset', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  try {
    const user = await findUserByEmail(email);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const token = crypto.randomBytes(32).toString('hex');
    resetTokens[token] = user.id;
    const resetLink = `http://localhost:3000/reset-password?token=${token}`;
    await sendEmail(email, 'Password Reset', `Reset your password: ${resetLink}`, `<a href="${resetLink}">Reset Password</a>`);
    res.json({ message: 'Password reset link sent (check your email)', token });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ error: 'Token and new password required' });
  const userId = resetTokens[token];
  if (!userId) return res.status(400).json({ error: 'Invalid or expired token' });
  try {
    const db = getDatabase();
    const hashed = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password = $1 WHERE id = $2', [hashed, userId]);
    delete resetTokens[token];
    res.json({ message: 'Password reset successful' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router; 