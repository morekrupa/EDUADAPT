const express = require('express');
const router = express.Router();
const passport = require('../config/passport');

// Step 1 — redirect to Google
router.get('/google', passport.authenticate('google', { 
  scope: ['profile', 'email'] 
}));

// Step 2 — Google redirects back here
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login-student.html', session: false }),
  (req, res) => {
    const user = req.user;

    if (user.needsSchool) {
      // New Google user — redirect to complete registration
      const query = `?name=${encodeURIComponent(user.name)}&email=${encodeURIComponent(user.email)}`;
      return res.redirect(`http://127.0.0.1:5173/signup-student.html${query}`);
    }

    // Existing user — redirect to dashboard with token
    const query = `?token=${user.accessToken}&role=${user.role}`;
    return res.redirect(`http://127.0.0.1:5173/dashboard.html${query}`);
  }
);

// Complete Google registration — called when new Google user submits school ID
router.post('/google/complete', async (req, res) => {
  try {
    const { name, email, schoolId, role } = req.body;
    const bcrypt = require('bcrypt');
    const jwt = require('jsonwebtoken');
    const prisma = require('../prismaClient');

    if (!name || !email || !schoolId) {
      return res.status(400).json({ error: 'name, email and schoolId are required.' });
    }

    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) {
      return res.status(404).json({ error: 'School not found.' });
    }

    // Create user without password (Google users don't need one)
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: await bcrypt.hash(Math.random().toString(36), 10),
        role: role || 'STUDENT',
        schoolId
      }
    });

    const accessToken = jwt.sign(
      { userId: user.id, role: user.role, schoolId: user.schoolId },
      process.env.JWT_SECRET,
      { expiresIn: '30m' }
    );

    return res.status(201).json({ 
      message: 'Registration complete.',
      accessToken,
      token: accessToken,
      role: user.role
    });

  } catch (error) {
    console.error(error);
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Email already registered.' });
    }
    return res.status(500).json({ error: 'Registration failed.' });
  }
});

module.exports = router;