const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
require('dotenv').config();

const app = express();

// Cấu hình session
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));

// Khởi tạo Passport
app.use(passport.initialize());
app.use(passport.session());

// Cấu hình Google Strategy
passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: 'http://localhost:3000/auth/google/callback'
    },
    (accessToken, refreshToken, profile, done) => {
        // Lưu thông tin người dùng vào cơ sở dữ liệu hoặc xử lý tại đây
        return done(null, profile);
    }
));

// Serialize và deserialize user
passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});

app.set('view engine', 'ejs');
app.set('views', './views');

// Cấu hình middleware
app.use(express.static('public'));

// Route cho trang chủ
app.get(['/'], (req, res) => {
    if(req.isAuthenticated()) {
        res.redirect('/dashboard');
    } else {
        res.redirect('/login');
    }
});


app.get(['/login'], (req, res) => {
    if(req.isAuthenticated()) {
        res.redirect('/dashboard');
    } else {
        res.sendFile(__dirname + '/public/login.html');
    }
});

// Route đăng nhập Google
app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Route callback sau khi đăng nhập
app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/' }),
    (req, res) => {
        res.redirect('/dashboard');
    }
);

// Route hiển thị thông tin người dùng
app.get('/dashboard', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/login');
    }

    res.render('dashboard', { displayName: req.user.displayName, email: req.user.emails[0].value });
});

// Route đăng xuất
app.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) { return next(err); }
        res.redirect('/');
    });
});

// Khởi động server
app.listen(3000, () => {
    console.log('Server chạy tại http://localhost:3000');
});