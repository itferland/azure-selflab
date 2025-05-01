// app.js

require('dotenv').config();

// DEBUG: make sure Azure App Service is picking up your env-vars
console.log('>>> OKTA_ISSUER   =', process.env.OKTA_ISSUER);
console.log('>>> APP_BASE_URL  =', process.env.APP_BASE_URL);

const express       = require('express');
const session       = require('express-session');
const { ExpressOIDC } = require('@okta/oidc-middleware');

const app  = express();
const port = process.env.PORT || 3000;

// ── SESSION SETUP ───────────────────────────────────────────────────────────────
app.use(session({
  secret:            process.env.SESSION_SECRET || 'dev-secret',
  resave:            true,
  saveUninitialized: false,
  cookie: {
    secure:   process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge:   24 * 60 * 60 * 1000 // 24h
  }
}));

// ── OKTA OIDC SETUP ─────────────────────────────────────────────────────────────
const oidc = new ExpressOIDC({
  issuer:       process.env.OKTA_ISSUER,      // e.g. https://dev-89878318.okta.com/oauth2/default
  client_id:    process.env.OKTA_CLIENT_ID,   // from your Okta App Integration
  client_secret:process.env.OKTA_CLIENT_SECRET,
  appBaseUrl:   process.env.APP_BASE_URL,     // e.g. https://my-node-oksample-…azurewebsites.net
  scope:        'openid profile',
  routes: {
    login: {
      path: '/login'
    },
    callback: {
      path: '/authorization-code/callback',
      defaultRedirect: '/'
    }
  }
});

// mount the OIDC router
app.use(oidc.router);

// ── UNPROTECTED ROUTE ──────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  if (req.userContext) {
    res.send(`Hello ${req.userContext.userinfo.name}!`);
  } else {
    res.send('Please <a href="/login">login</a>');
  }
});

// ── PROTECTED ROUTE ─────────────────────────────────────────────────────────────
app.get('/protected', oidc.ensureAuthenticated(), (req, res) => {
  res.send('This is a protected route');
});

// ── START SERVER ────────────────────────────────────────────────────────────────
oidc.on('ready', () => {
  app.listen(port, () => {
    console.log(`Server running on ${process.env.APP_BASE_URL} (port ${port})`);
  });
});

oidc.on('error', err => {
  console.error('OIDC ERROR:', err);
});
