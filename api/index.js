// api/index.js
const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Configuration
const CONFIG = {
  CLIENT_ID: process.env.META_APP_ID,
  CLIENT_SECRET: process.env.META_APP_SECRET,
  REDIRECT_URI: process.env.REDIRECT_URI || 'https://your-app.vercel.app/api/callback',
  SCOPES: [
    'public_profile',
    'email',
    'pages_show_list',
    'pages_manage_ads',
    'pages_read_engagement',
    'business_management',
    'ads_management',
    'ads_read'
  ]
};

// Home route with simple UI
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Meta OAuth Integration</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          margin: 0;
          background: #f0f2f5;
        }
        .container {
          background: white;
          padding: 40px;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          max-width: 500px;
          width: 100%;
        }
        h1 {
          color: #1877f2;
          margin-bottom: 10px;
        }
        .permissions {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .permissions h3 {
          margin-top: 0;
          color: #333;
        }
        .permissions ul {
          margin: 10px 0;
          padding-left: 20px;
        }
        .permissions li {
          margin: 8px 0;
          color: #555;
        }
        .btn {
          display: inline-block;
          padding: 12px 24px;
          background: #1877f2;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          transition: background 0.2s;
        }
        .btn:hover {
          background: #166fe5;
        }
        .status {
          padding: 15px;
          border-radius: 6px;
          margin: 20px 0;
        }
        .success {
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }
        .error {
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }
        code {
          background: #f4f4f4;
          padding: 2px 6px;
          border-radius: 3px;
          font-family: 'Courier New', monospace;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>📘 Meta OAuth Integration</h1>
        <p>Connect your Meta/Facebook account to grant access to your business assets.</p>
        
        <div class="permissions">
          <h3>This app will request access to:</h3>
          <ul>
            <li>Your name and profile picture</li>
            <li>Manage ads for ad accounts you have access to</li>
            <li>Manage your business pages</li>
            <li>Show a list of the Pages you manage</li>
            <li>Read engagement data from your pages</li>
          </ul>
        </div>
        
        <a href="/api/auth" class="btn">Connect with Facebook</a>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
          <p style="color: #666; font-size: 14px;">
            <strong>API Endpoints:</strong><br>
            <code>GET /api/auth</code> - Start OAuth flow<br>
            <code>GET /api/callback</code> - OAuth callback<br>
            <code>GET /api/token/:token</code> - Get user info
          </p>
        </div>
      </div>
    </body>
    </html>
  `);
});

// Start OAuth flow
app.get('/api/auth', (req, res) => {
  const params = new URLSearchParams({
    client_id: CONFIG.CLIENT_ID,
    redirect_uri: CONFIG.REDIRECT_URI,
    scope: CONFIG.SCOPES.join(','),
    response_type: 'code',
    state: generateRandomState()
  });

  const authUrl = `https://www.facebook.com/v23.0/dialog/oauth?${params}`;
  res.redirect(authUrl);
});

// OAuth callback
app.get('/api/callback', async (req, res) => {
  const { code, error, error_description } = req.query;

  if (error) {
    return res.send(errorPage(error_description || error));
  }
  console.log("doing the callback already");

  try {
    // Exchange code for access token
    const tokenResponse = await axios.get('https://graph.facebook.com/v23.0/oauth/access_token', {
      params: {
        client_id: CONFIG.CLIENT_ID,
        client_secret: CONFIG.CLIENT_SECRET,
        redirect_uri: CONFIG.REDIRECT_URI,
        code
      }
    });

    const { access_token, token_type, expires_in } = tokenResponse.data;
    console.log("TokenData");

    // Get user info
    const userResponse = await axios.get('https://graph.facebook.com/me', {
      params: {
        fields: 'id,name,email,picture',
        access_token
      }
    });

    // Get pages
    const pagesResponse = await axios.get('https://graph.facebook.com/me/accounts', {
      params: {
        access_token
      }
    });

    // Get ad accounts
    let adAccounts = [];
    try {
      const adAccountsResponse = await axios.get('https://graph.facebook.com/me/adaccounts', {
        params: {
          fields: 'id,name,account_status',
          access_token
        }
      });
      adAccounts = adAccountsResponse.data.data || [];
    } catch (e) {
      console.log('Could not fetch ad accounts:', e.message);
    }

    const result = {
      access_token,
      token_type,
      expires_in,
      user: userResponse.data,
      pages: pagesResponse.data.data || [],
      ad_accounts: adAccounts,
      timestamp: new Date().toISOString()
    };

    res.send(successPage(result));

  } catch (error) {
    console.error('OAuth error:', error.response?.data || error.message);
    res.send(errorPage(error.response?.data?.error?.message || error.message));
  }
});

// Get token info endpoint
app.get('/api/token/:token', async (req, res) => {
  const { token } = req.params;

  try {
    // Verify token and get user info
    const userResponse = await axios.get('https://graph.facebook.com/me', {
      params: {
        fields: 'id,name,email,picture',
        access_token: token
      }
    });

    // Get token info
    const debugResponse = await axios.get('https://graph.facebook.com/debug_token', {
      params: {
        input_token: token,
        access_token: `${CONFIG.CLIENT_ID}|${CONFIG.CLIENT_SECRET}`
      }
    });

    res.json({
      success: true,
      user: userResponse.data,
      token_info: debugResponse.data.data,
      scopes: debugResponse.data.data.scopes
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.response?.data?.error?.message || error.message
    });
  }
});

// Helper functions
function generateRandomState() {
  return Math.random().toString(36).substring(2, 15);
}

function successPage(data) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Success - Meta OAuth</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 40px;
          background: #f0f2f5;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
          background: white;
          padding: 30px;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .success {
          background: #d4edda;
          color: #155724;
          padding: 15px;
          border-radius: 6px;
          margin-bottom: 20px;
        }
        .token-box {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 6px;
          margin: 20px 0;
          word-break: break-all;
          font-family: monospace;
        }
        .info-section {
          margin: 20px 0;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 6px;
        }
        h3 {
          color: #333;
          margin-top: 0;
        }
        .btn {
          display: inline-block;
          padding: 10px 20px;
          background: #1877f2;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="success">
          <h2>✅ Successfully Connected!</h2>
        </div>
        
        <div class="info-section">
          <h3>User Information</h3>
          <p><strong>Name:</strong> ${data.user.name}</p>
          <p><strong>ID:</strong> ${data.user.id}</p>
          ${data.user.email ? `<p><strong>Email:</strong> ${data.user.email}</p>` : ''}
        </div>

        <div class="info-section">
          <h3>Access Token</h3>
          <div class="token-box">${data.access_token}</div>
          <p><small>Expires in: ${data.expires_in} seconds</small></p>
        </div>

        ${data.pages.length > 0 ? `
          <div class="info-section">
            <h3>Pages (${data.pages.length})</h3>
            <ul>
              ${data.pages.map(page => `<li>${page.name} (${page.id})</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        ${data.ad_accounts.length > 0 ? `
          <div class="info-section">
            <h3>Ad Accounts (${data.ad_accounts.length})</h3>
            <ul>
              ${data.ad_accounts.map(acc => `<li>${acc.name} (${acc.id})</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        <a href="/" class="btn">Back to Home</a>
      </div>
    </body>
    </html>
  `;
}

function errorPage(error) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Error - Meta OAuth</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 40px;
          background: #f0f2f5;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: white;
          padding: 30px;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .error {
          background: #f8d7da;
          color: #721c24;
          padding: 15px;
          border-radius: 6px;
          margin-bottom: 20px;
        }
        .btn {
          display: inline-block;
          padding: 10px 20px;
          background: #1877f2;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="error">
          <h2>❌ Authentication Failed</h2>
          <p>${error}</p>
        </div>
        <a href="/" class="btn">Try Again</a>
      </div>
    </body>
    </html>
  `;
}

// For Vercel
module.exports = app;

// For local development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
