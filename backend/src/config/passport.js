const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const prisma = require('../prismaClient');
const jwt = require('jsonwebtoken');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/api/auth/google/callback'
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists with this email
      let user = await prisma.user.findUnique({
        where: { email: profile.emails[0].value }
      });

      if (!user) {
        // Google users don't have a schoolId yet —
        // they need to complete registration with a school code
        // For now we return the Google profile so frontend
        // can show a "complete registration" step
        return done(null, { 
          googleProfile: true,
          name: profile.displayName,
          email: profile.emails[0].value,
          needsSchool: true
        });
      }

      // User exists — generate JWT same as normal login
      const jwtToken = jwt.sign(
        { userId: user.id, role: user.role, schoolId: user.schoolId },
        process.env.JWT_SECRET,
        { expiresIn: '30m' }
      );

      const jwtRefreshToken = jwt.sign(
        { userId: user.id },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
      );

      return done(null, { 
        accessToken: jwtToken, 
        token: jwtToken,
        refreshToken: jwtRefreshToken,
        role: user.role,
        needsSchool: false
      });

    } catch (error) {
      return done(error, null);
    }
  }
));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

module.exports = passport;