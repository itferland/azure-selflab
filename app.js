require('dotenv').config();
const express = require('express');
const session = require('express-session');
const { ExpressOIDC } = require('@okta/oidc-middleware');

const app = express();
const port = process.env.PORT || 3000;

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: true,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Okta OIDC configuration
const oidc = new ExpressOIDC({
  issuer: process.env.OKTA_ISSUER,        // full issuer URL
  client_id: process.env.OKTA_CLIENT_ID,
  client_secret: process.env.OKTA_CLIENT_SECRET,
  appBaseUrl: process.env.APP_BASE_URL,
  scope: 'openid profile',
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

// Mount the OIDC router
app.use(oidc.router);

// Public home page
app.get('/', (req, res) => {
  if (req.userContext) {
    res.send(`Hello ${req.userContext.userinfo.name}!`);
  } else {
    res.send('Please <a href="/login">login</a>');
  }
});

// Protected route
app.get('/protected', oidc.ensureAuthenticated(), (req, res) => {
  res.send('This is a protected route');
});

// Start listening once OIDC is ready
oidc.on('ready', () => {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
});

// Log any OIDC errors
oidc.on('error', err => {
  console.error('OIDC ERROR:', err);
});
