const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();

/* ================= Helpers lưu user local (demo JSON) ================= */
const USERS_FILE = path.join(__dirname, 'data', 'users.json');
function ensureUsersFile() {
    const dir = path.dirname(USERS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '[]', 'utf8');
}
function loadUsers() {
    ensureUsersFile();
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
}
function saveUsers(list) {
    ensureUsersFile();
    fs.writeFileSync(USERS_FILE, JSON.stringify(list, null, 2), 'utf8');
}
function isLoggedIn(req) {
    return (req.isAuthenticated && req.isAuthenticated()) || !!(req.session && req.session.localUser);
}

/* ================= Helpers Forgot/Reset (OTP) ================= */
const RESETS_FILE = path.join(__dirname, 'data', 'reset.json');
function ensureResetsFile() {
    const dir = path.dirname(RESETS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(RESETS_FILE)) fs.writeFileSync(RESETS_FILE, '[]', 'utf8');
}
function loadResets() {
    ensureResetsFile();
    return JSON.parse(fs.readFileSync(RESETS_FILE, 'utf8'));
}
function saveResets(list) {
    ensureResetsFile();
    fs.writeFileSync(RESETS_FILE, JSON.stringify(list, null, 2), 'utf8');
}
function genOTP6() {
    return '' + Math.floor(100000 + Math.random() * 900000);
}

/* ================= Mailer đa nhà cung cấp ================= */
function createMailer() {
    const driver = (process.env.MAIL_DRIVER || 'console').toLowerCase();

    // Dev: in email ra terminal, không gửi thật
    if (driver === 'console') {
        return {
            sendMail: async (opts) => {
                console.log('--- EMAIL (console) ---');
                console.log('To:', opts.to);
                console.log('Subject:', opts.subject);
                console.log('Text:', opts.text);
                console.log('HTML:', opts.html);
                console.log('-----------------------');
                return { messageId: 'console-' + Date.now() };
            }
        };
    }

    if (driver === 'gmail') {
        return nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        });
    }

    // SMTP chung
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 465),
        secure: String(process.env.SMTP_SECURE || 'true') === 'true',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
}
const mailer = createMailer();
const APP_NAME = process.env.APP_NAME || 'POWERAGRISIM';
const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000';
const MAIL_FROM =
    process.env.MAIL_FROM || `"${APP_NAME}" <${process.env.SMTP_USER || 'no-reply@example.com'}>`;

/* ================= Middleware ================= */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

app.set('view engine', 'ejs');
app.set('views', './views');
app.use(express.static('public'));

/* ================= Google OAuth ================= */
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || 'GOOGLE_ID',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'GOOGLE_SECRET',
    callbackURL: 'http://localhost:3000/auth/google/callback'
}, (accessToken, refreshToken, profile, done) => done(null, profile)));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

/* ================= Routes ================= */
app.get('/', (req, res) => {
    if (isLoggedIn(req)) return res.redirect('/dashboard');
    return res.redirect('/login');
});

/* Login (no-store) */
app.get('/login', (req, res) => {
    if (isLoggedIn(req)) return res.redirect('/dashboard');
    res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
    });
    return res.sendFile(__dirname + '/public/login.html');
});

/* Register (no-store) */
app.get('/register', (req, res) => {
    res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
    });
    return res.sendFile(__dirname + '/public/register.html');
});

/* Forgot & Reset pages (no-store) */
app.get('/forgot', (req, res) => {
    res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
    });
    return res.sendFile(__dirname + '/public/forgot.html');
});
app.get('/reset', (req, res) => {
    res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
    });
    return res.sendFile(__dirname + '/public/reset.html');
});

/* Đăng ký local (lưu users.json, không auto-login) */
app.post('/register', async (req, res) => {
    try {
        const { email, username, password } = req.body;
        if (!email || !username || !password) {
            return res.status(400).json({ success: false, message: 'Thiếu trường bắt buộc' });
        }
        const users = loadUsers();
        const uname = String(username).trim().toLowerCase();
        const em = String(email).trim().toLowerCase();

        if (users.find(u => u.username === uname)) {
            return res.status(409).json({ success: false, message: 'Username đã tồn tại' });
        }
        if (users.find(u => u.email === em)) {
            return res.status(409).json({ success: false, message: 'Email đã tồn tại' });
        }

        const hash = await bcrypt.hash(password, 10);
        const newUser = { id: 'u_' + Date.now(), email: em, username: uname, passwordHash: hash, provider: 'local' };
        users.push(newUser);
        saveUsers(users);

        return res.json({ success: true, username: newUser.username });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
});

/* Đăng nhập local (username HOẶC email) */
app.post('/login', async (req, res) => {
    try {
        if (isLoggedIn(req)) {
            const username = req.session?.localUser?.username || req.user?.displayName || '';
            return res.json({ success: true, alreadyLoggedIn: true, username });
        }

        const { username, password } = req.body;
        const users = loadUsers();
        const id = String(username || '').trim().toLowerCase();

        const user = id.includes('@')
            ? users.find(u => u.email === id)
            : users.find(u => u.username === id);

        if (!user) return res.status(401).json({ success: false, message: 'Sai username/email hoặc mật khẩu' });

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return res.status(401).json({ success: false, message: 'Sai username/email hoặc mật khẩu' });

        req.session.localUser = { id: user.id, email: user.email, username: user.username };
        return res.json({ success: true, username: user.username, token: 'local-session' });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
});

/* API kiểm tra phiên cho client auto-redirect */
app.get('/session', (req, res) => {
    if (isLoggedIn(req)) {
        const username = req.session?.localUser?.username || req.user?.displayName || '';
        return res.json({ loggedIn: true, username });
    }
    return res.json({ loggedIn: false });
});

/* Forgot: gửi OTP */
app.post('/forgot', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ success: false, message: 'Thiếu email' });

        const users = loadUsers();
        const em = String(email).trim().toLowerCase();
        const user = users.find(u => u.email === em);

        // Không tiết lộ email có tồn tại hay không
        if (!user) return res.json({ success: true, message: 'Nếu email tồn tại, mã đã được gửi' });

        const code = genOTP6();
        const expiresAt = Date.now() + 15 * 60 * 1000;
        let resets = loadResets().filter(r => r.email !== em);
        resets.push({ email: em, code, expiresAt });
        saveResets(resets);

        await mailer.sendMail({
            from: MAIL_FROM,
            to: em,
            subject: `Mã đặt lại mật khẩu (OTP) - ${APP_NAME}`,
            text: `Mã OTP của bạn là: ${code} (hiệu lực 15 phút)\nĐặt lại mật khẩu tại: ${APP_BASE_URL}/reset?email=${encodeURIComponent(em)}`,
            html: `
        <p>Xin chào,</p>
        <p>Mã OTP đặt lại mật khẩu của bạn là: <b style="font-size:16px">${code}</b></p>
        <p>Có hiệu lực trong <b>15 phút</b>.</p>
        <p>Trang đặt lại: <a href="${APP_BASE_URL}/reset?email=${encodeURIComponent(em)}">${APP_BASE_URL}/reset</a></p>
      `
        });

        return res.json({ success: true, message: 'Nếu email tồn tại, mã đã được gửi' });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
});

/* Reset: xác thực OTP và đổi mật khẩu */
app.post('/reset', async (req, res) => {
    try {
        const { email, code, newPassword } = req.body;
        const em = String(email || '').trim().toLowerCase();
        const cd = String(code || '').trim();

        if (!em || !cd || !newPassword) {
            return res.status(400).json({ success: false, message: 'Thiếu dữ liệu' });
        }

        let resets = loadResets();
        const rec = resets.find(r => r.email === em && r.code === cd);
        if (!rec) return res.status(400).json({ success: false, message: 'Mã không đúng' });
        if (Date.now() > rec.expiresAt) {
            resets = resets.filter(r => !(r.email === em && r.code === cd));
            saveResets(resets);
            return res.status(400).json({ success: false, message: 'Mã đã hết hạn' });
        }

        const users = loadUsers();
        const idx = users.findIndex(u => u.email === em);
        if (idx === -1) return res.status(400).json({ success: false, message: 'Email không tồn tại' });

        const hash = await bcrypt.hash(newPassword, 10);
        users[idx].passwordHash = hash;
        saveUsers(users);

        resets = resets.filter(r => !(r.email === em && r.code === cd));
        saveResets(resets);

        return res.json({ success: true, message: 'Đổi mật khẩu thành công' });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
});

/* Google OAuth */
app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);
app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/' }),
    (req, res) => res.redirect('/dashboard')
);

/* Dashboard */
app.get('/dashboard', (req, res) => {
    if (req.isAuthenticated && req.isAuthenticated()) {
        return res.render('dashboard', {
            displayName: req.user.displayName,
            email: req.user.emails?.[0]?.value || ''
        });
    }
    if (req.session?.localUser) {
        return res.render('dashboard', {
            displayName: req.session.localUser.username,
            email: req.session.localUser.email
        });
    }
    return res.redirect('/login');
});

/* Logout */
app.get('/logout', (req, res, next) => {
    try {
        req.session.localUser = null;
        if (req.logout) {
            req.logout(err => {
                if (err) return next(err);
                return res.redirect('/');
            });
        } else {
            return res.redirect('/');
        }
    } catch (e) {
        return res.redirect('/');
    }
});

app.listen(3000, () => console.log('Server chạy tại https://happyfarm.dev'));