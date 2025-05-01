require('dotenv').config();

const express = require('express');
const session = require('express-session');
const { ExpressOIDC } = require('@okta/oidc-middleware');

const app = express();
const port = process.env.PORT || 3000;

// ─── 1) SESSION MIDDLEWARE ──────────────────────────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: true,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
}));

// ─── 2) OKTA OIDC SETUP ──────────────────────────────────────────────────────────
// now reads the full issuer URL from OKTA_ISSUER
const oidc = new ExpressOIDC({
  issuer:        process.env.OKTA_ISSUER,        // e.g. "https://dev-89878318.okta.com/oauth2/default"
  client_id:     process.env.OKTA_CLIENT_ID,     // your Okta Client ID
  client_secret: process.env.OKTA_CLIENT_SECRET, // your Okta Client Secret
  appBaseUrl:    process.env.APP_BASE_URL,       // e.g. "https://my-node-oksample-....azurewebsites.net"
  scope:         'openid profile',
  routes: {
    login: {
      path: '/login',
    },
    callback: {
      path: '/authorization-code/callback',
      defaultRedirect: '/',
    },
  },
});

// mount the OIDC router
app.use(oidc.router);

// ─── 3) UNPROTECTED ROUTE ────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  if (req.userContext) {
    res.send(`Hello ${req.userContext.userinfo.name}!`);
  } else {
    res.send('Please <a href="/login">login</a>');
  }
});

// ─── 4) PROTECTED ROUTE ─────────────────────────────────────────────────────────
app.get(
  '/protected',
  oidc.ensureAuthenticated(),
  (req, res) => {
    res.send('✨ You made it to the protected route! ✨');
  }
);

// ─── 5) START THE SERVER ────────────────────────────────────────────────────────
oidc.on('ready', () => {
  app.listen(port, () => {
    console.log(`Server is up on port ${port}`);
  });
});

oidc.on('error', err => {
  console.error('OIDC ERROR:', err);
});

