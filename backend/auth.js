const passport = require('passport');
const session = require('express-session');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
require('dotenv').config();

function setupAuth(app) {
    app.set('trust proxy', 1);
    
    // 세션 설정
    app.use(session({
        secret: process.env.SESSION_SECRET || 'default_secret',
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: true,
            sameSite: 'lax'
        },
    }));

    app.use(passport.initialize());
    app.use(passport.session());

    passport.serializeUser((user, done) => {
        done(null, user);
    });

    passport.deserializeUser((obj, done) => {
        done(null, obj);
    });

    // Google Strategy 설정
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/auth/google/callback",
    }, (accessToken, refreshToken, profile, done) => {
        return done(null, {
            id: profile.id,
            displayName: profile.displayName,
            email: profile.emails?.[0]?.value
        });
    }));

    // 로그인 라우트
    app.get('/auth/google',
        passport.authenticate('google', { scope: ['profile', 'email'] })
    );

    // 콜백 라우트
    app.get('/auth/google/callback',
        passport.authenticate('google', { failureRedirect: '/' }),
        (req, res) => {
            res.redirect('/'); // 로그인 후 홈으로 리디렉션
        });

    // 로그인 여부 확인 API
    app.get('/auth/user', (req, res) => {
        if (req.isAuthenticated()) {
            res.json({ user: req.user });
        } else {
            res.status(401).json({ error: 'Not authenticated' });
        }
    });

    // 로그아웃
    app.get('/auth/logout', (req, res) => {
        req.logout(() => {
            res.redirect('/');
        });
    });
}

module.exports = { setupAuth };
