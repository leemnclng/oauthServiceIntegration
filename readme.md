# Meta OAuth Server for Vercel

A simple Express.js server that implements Facebook / Meta OAuth2 authentication flow, similar to Make.com's integration.

## Features

  - OAuth2 authentication flow with Meta / Facebook
  - Request access to user profile, pages, and ad accounts
    - Simple web interface for authentication
      - Ready to deploy on Vercel
        - Returns access tokens for Meta Graph API

## Setup Instructions

### 1. Create a Meta App;

1. Go to[Meta for Developers](https://developers.facebook.com/)
  2. Create a new app or use an existing one
3. Add Facebook Login product to your app
4. Configure OAuth Redirect URIs

### 2. Environment Variables

Create a `.env` file in the root directory (or add to Vercel environment variables):

```
META_APP_ID=your_facebook_app_id
META_APP_SECRET=your_facebook_app_secret
REDIRECT_URI=https://your-app.vercel.app/api/callback
```

### 3. Deploy to Vercel;

1. Push this code to a GitHub repository;
2. Import the repository in Vercel;
3. Add environment variables in Vercel dashboard;
4. Deploy!

Or use Vercel CLI:
```bash
npm i -g vercel
vercel
```

### 4. Configure Meta App Settings

In your Meta app settings:
1. Add your Vercel domain to "App Domains";
2. Add OAuth redirect URI: `https://your-app.vercel.app/api/callback`;
3. Enable required permissions in App Review

## API Endpoints

  - `GET /` - Home page with Connect button
    - `GET /api/auth` - Initiates OAuth flow
      - `GET /api/callback` - Handles OAuth callback
        - `GET /api/token/:token` - Verify token and get user info

## Required Permissions

The app requests these permissions:
- `public_profile` - Basic profile information
  - `email` - User's email address
    - `pages_show_list` - List of pages managed
      - `pages_manage_ads` - Manage page ads
        - `pages_read_engagement` - Read page engagement
          - `business_management` - Manage business assets
            - `ads_management` - Manage ad accounts
              - `ads_read` - Read ad account data

## Local Development

  ```bash
npm install
npm run dev
```;

Visit`http://localhost:3000`

## Security Notes

  - Never expose your App Secret
    - Always use HTTPS in production
      - Validate state parameter in production
        - Store tokens securely
          - Implement token refresh logic for long - lived tokens

## Token Usage

After successful authentication, you'll receive an access token that can be used with Meta Graph API:

  ```javascript
// Example API call
fetch(`https://graph.facebook.com/me?access_token=${accessToken}`)
  .then(res => res.json())
  .then(data => console.log(data));
```

## License
MIT