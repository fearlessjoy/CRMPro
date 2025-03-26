const express = require('express');
const axios = require('axios');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const crypto = require('crypto');

dotenv.config();

const router = express.Router();

// Facebook App credentials - should be in .env
const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
const FACEBOOK_REDIRECT_URI = process.env.FACEBOOK_REDIRECT_URI || 'http://localhost:3000/settings/social-media/oauth-callback';
const WEBHOOK_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || crypto.randomBytes(20).toString('hex');

// Middleware
router.use(cors());
router.use(bodyParser.json());

// Auth endpoint to get Facebook login URL
router.get('/auth/facebook', (req, res) => {
  const scopes = [
    'public_profile', 
    'email', 
    'pages_show_list', 
    'pages_read_engagement',
    'leads_retrieval'
  ].join(',');

  const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${FACEBOOK_APP_ID}&redirect_uri=${encodeURIComponent(FACEBOOK_REDIRECT_URI)}&scope=${scopes}&response_type=code&state=${req.query.state || ''}`;
  
  res.json({ authUrl });
});

// OAuth callback handler
router.get('/auth/facebook/callback', async (req, res) => {
  const { code, state } = req.query;
  
  if (!code) {
    return res.status(400).json({ error: 'Authorization code not provided' });
  }
  
  try {
    // Exchange code for access token
    const tokenResponse = await axios.get(`https://graph.facebook.com/v18.0/oauth/access_token`, {
      params: {
        client_id: FACEBOOK_APP_ID,
        client_secret: FACEBOOK_APP_SECRET,
        redirect_uri: FACEBOOK_REDIRECT_URI,
        code
      }
    });
    
    const { access_token, expires_in } = tokenResponse.data;
    
    // Get long-lived access token
    const longLivedTokenResponse = await axios.get(`https://graph.facebook.com/v18.0/oauth/access_token`, {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: FACEBOOK_APP_ID,
        client_secret: FACEBOOK_APP_SECRET,
        fb_exchange_token: access_token
      }
    });
    
    const { access_token: longLivedToken, expires_in: longLivedExpiry } = longLivedTokenResponse.data;
    
    // Get user info
    const userResponse = await axios.get(`https://graph.facebook.com/me`, {
      params: {
        fields: 'id,name,email',
        access_token: longLivedToken
      }
    });
    
    // Get pages
    const pagesResponse = await axios.get(`https://graph.facebook.com/me/accounts`, {
      params: {
        access_token: longLivedToken
      }
    });
    
    // Return tokens and user/page data
    res.json({
      user: userResponse.data,
      pages: pagesResponse.data.data,
      token: {
        value: longLivedToken,
        expiresIn: longLivedExpiry,
        expiresAt: new Date(Date.now() + longLivedExpiry * 1000).toISOString()
      },
      state
    });
  } catch (error) {
    console.error('Error in Facebook OAuth callback:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to authenticate with Facebook' });
  }
});

// Get Facebook page lead forms
router.get('/facebook/pages/:pageId/leadforms', async (req, res) => {
  const { pageId } = req.params;
  const { access_token } = req.query;
  
  if (!access_token) {
    return res.status(400).json({ error: 'Access token not provided' });
  }
  
  try {
    const leadFormsResponse = await axios.get(`https://graph.facebook.com/${pageId}/leadgen_forms`, {
      params: {
        access_token,
        fields: 'id,name,status,page,questions'
      }
    });
    
    res.json(leadFormsResponse.data);
  } catch (error) {
    console.error('Error fetching lead forms:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch Facebook lead forms' });
  }
});

// Webhook endpoint for lead notifications
router.get('/webhook/facebook', (req, res) => {
  // Handle Facebook webhook verification
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
    console.log('Facebook webhook verified');
    return res.status(200).send(challenge);
  } else {
    return res.sendStatus(403);
  }
});

router.post('/webhook/facebook', async (req, res) => {
  const { object, entry } = req.body;
  
  // Quickly acknowledge the request
  res.status(200).send('EVENT_RECEIVED');
  
  // Process leads in the background
  if (object === 'page') {
    for (const pageEntry of entry) {
      for (const change of pageEntry.changes || []) {
        if (change.field === 'leadgen' && change.value) {
          console.log('New lead received:', change.value);
          
          try {
            // Fetch complete lead data
            const leadId = change.value.leadgen_id;
            const pageId = change.value.page_id;
            const formId = change.value.form_id;
            
            // Get page access token from database (requires implementation)
            // const pageAccessToken = await getPageAccessToken(pageId);
            
            // For now, just log the notification
            console.log(`Processing lead ${leadId} from form ${formId} on page ${pageId}`);
            
            // The actual implementation would:
            // 1. Get the lead data from Facebook Graph API
            // 2. Process it according to form field mapping
            // 3. Create a lead in the CRM system
            // 4. Send notifications to relevant users
          } catch (error) {
            console.error('Error processing lead notification:', error);
          }
        }
      }
    }
  }
});

module.exports = router; 