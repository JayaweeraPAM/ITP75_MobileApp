import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { store } from '../data/store-mongo.js';
import { organizeUsersByRole } from '../data/organize-by-role.js';
import { signToken } from '../middleware/auth.js';

export const authRouter = Router();

authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    console.log(`[Auth/Login] Incoming email: ${normalizedEmail}`);

    const user = await store.users.getByEmail(normalizedEmail);
    console.log(`[Auth/Login] User found: ${Boolean(user)}`);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.passwordHash) {
      console.log('[Auth/Login] Missing passwordHash on user record');
      return res.status(500).json({ error: 'Account password is not configured correctly' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    console.log(`[Auth/Login] bcrypt match: ${valid}`);
    if (!valid) {
      return res.status(401).json({ error: 'Wrong password' });
    }

    const normalizedRole = String(user.role || '').trim().toLowerCase();
    if (!normalizedRole) {
      return res.status(403).json({ error: 'User role is missing' });
    }

    const token = signToken(
      { id: user.id || user._id, email: user.email, role: normalizedRole },
      '7d'
    );

    const { passwordHash: _pw, ...safeUser } = user;
    res.json({
      token,
      user: {
        ...safeUser,
        id: safeUser.id || safeUser._id,
        role: normalizedRole,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

authRouter.post('/register', async (req, res) => {
  try {
    const { email, password, fullName, role, contactNumber, grade, age, parentName, parentContact } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail || !password || !fullName || !role) {
      return res.status(400).json({ error: 'Email, password, fullName, and role required' });
    }
    if (role.toLowerCase() !== 'student') {
      return res.status(400).json({ error: 'Use the tutor signup flow for tutor registration (requires admin approval)' });
    }

    const existing = await store.users.getByEmail(normalizedEmail);
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const id = uuidv4();
    const newUser = {
      id,
      email: normalizedEmail,
      passwordHash,
      fullName,
      role,
      contactNumber: contactNumber || '',
      grade: grade || '',
      age: age ? parseInt(age) : null,
      parentName: parentName || '',
      parentContact: parentContact || '',
      createdAt: new Date().toISOString(),
    };
    const savedUser = await store.users.insertOne(newUser);

    // Organize users by role after new registration
    const allUsers = await store.users.get();
    await organizeUsersByRole(allUsers).catch((err) =>
      console.error('Failed to organize users:', err.message)
    );

    const token = signToken({ id, email: newUser.email, role }, '7d');
    const { passwordHash: _pw2, ...safeNewUser } = newUser;
    res.status(201).json({
      token,
      user: safeNewUser,
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});
