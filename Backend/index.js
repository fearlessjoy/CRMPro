const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const facebookOAuth = require('./facebookOAuth');
const cors = require('cors');
const { getFirebaseApp, getFirestoreDb, testFirestoreConnection } = require('./firebaseConfig');

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3002;

// Configure CORS with specific origins
app.use(cors({
  origin: [
    'http://localhost:3002', // Vite dev server
    'http://localhost:8080', // React default
    process.env.FRONTEND_URL, // From env
    // Add any additional domains needed
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic route testing page to help with debugging
app.get('/test-tracking', (req, res) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Email Tracking Test</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1 { color: #333; }
        .box { border: 1px solid #ddd; padding: 15px; margin: 15px 0; border-radius: 5px; }
        .success { color: green; }
        .error { color: red; }
        button { padding: 8px 15px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; }
        button:hover { background: #45a049; }
        pre { background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; }
      </style>
    </head>
    <body>
      <h1>Email Tracking Test Page</h1>
      <div class="box">
        <h2>Test Tracking Pixel</h2>
        <p>This will simulate an email being opened by loading the tracking pixel:</p>
        <button id="loadPixel">Load Tracking Pixel</button>
        <div id="pixelResult"></div>
        <div id="pixelImage" style="margin-top: 10px;"></div>
      </div>
      
      <div class="box">
        <h2>Environment Check</h2>
        <pre id="envCheck"></pre>
      </div>
      
      <div class="box">
        <h2>Firebase Connection Test</h2>
        <button id="testFirebase">Test Firebase Connection</button>
        <div id="firebaseResult"></div>
      </div>
      
      <script>
        // Test loading the tracking pixel
        document.getElementById('loadPixel').addEventListener('click', function() {
          const campaignId = prompt('Enter a campaign ID to test:', 'test-campaign-123');
          if (!campaignId) return;
          
          const resultDiv = document.getElementById('pixelResult');
          const pixelDiv = document.getElementById('pixelImage');
          
          resultDiv.innerHTML = 'Loading tracking pixel...';
          pixelDiv.innerHTML = '';
          
          // Create the pixel image and add it to the page
          const img = document.createElement('img');
          img.src = '/api/track-email-open?campaignId=' + campaignId;
          img.alt = '';
          img.onload = function() {
            resultDiv.innerHTML = '<p class="success">Tracking pixel loaded successfully!</p>';
          };
          img.onerror = function() {
            resultDiv.innerHTML = '<p class="error">Error loading tracking pixel. Check console for details.</p>';
          };
          pixelDiv.appendChild(img);
        });
        
        // Check environment config
        fetch('/env-check')
          .then(response => response.json())
          .then(data => {
            document.getElementById('envCheck').textContent = JSON.stringify(data, null, 2);
          })
          .catch(error => {
            document.getElementById('envCheck').innerHTML = '<span class="error">Error fetching environment info: ' + error.message + '</span>';
          });
          
        // Test Firebase connection
        document.getElementById('testFirebase').addEventListener('click', function() {
          const resultDiv = document.getElementById('firebaseResult');
          resultDiv.innerHTML = 'Testing Firebase connection...';
          
          fetch('/test-firebase')
            .then(response => response.json())
            .then(data => {
              if (data.success) {
                resultDiv.innerHTML = '<p class="success">Firebase connection successful!</p><pre>' + JSON.stringify(data.result, null, 2) + '</pre>';
              } else {
                resultDiv.innerHTML = '<p class="error">Firebase connection failed: ' + data.error + '</p>';
              }
            })
            .catch(error => {
              resultDiv.innerHTML = '<p class="error">Error testing Firebase: ' + error.message + '</p>';
            });
        });
      </script>
    </body>
    </html>
  `;
  res.send(html);
});

// Endpoint to check environment variables (safe version)
app.get('/env-check', (req, res) => {
  res.json({
    NODE_ENV: process.env.NODE_ENV || 'not set',
    PORT: process.env.PORT || 'not set',
    FRONTEND_URL: process.env.FRONTEND_URL || 'not set',
    FIREBASE_CONFIG: {
      projectId: process.env.FIREBASE_PROJECT_ID || 'not set',
      apiKeySet: !!process.env.FIREBASE_API_KEY,
      authDomainSet: !!process.env.FIREBASE_AUTH_DOMAIN,
      appIdSet: !!process.env.FIREBASE_APP_ID,
    }
  });
});

// Endpoint to test Firebase connection
app.get('/test-firebase', async (req, res) => {
  try {
    // Use our centralized Firebase configuration 
    const { getFirestoreDb } = require('./firebaseConfig');
    const { collection, getDocs, query, limit } = require('firebase/firestore');
    
    // Log Firebase config (safe version)
    console.log('[TEST] Firebase config check:', {
      apiKeySet: process.env.FIREBASE_API_KEY ? 'Yes' : 'No',
      authDomainSet: process.env.FIREBASE_AUTH_DOMAIN ? 'Yes' : 'No',
      projectIdSet: process.env.FIREBASE_PROJECT_ID ? 'Yes' : 'No',
      appIdSet: process.env.FIREBASE_APP_ID ? 'Yes' : 'No',
    });
    
    // Get Firestore database
    console.log('[TEST] Getting Firestore DB');
    const db = getFirestoreDb();
    
    // Try to get a document from the campaigns collection
    console.log('[TEST] Querying emailCampaigns collection');
    const campaignsRef = collection(db, 'emailCampaigns');
    const q = query(campaignsRef, limit(1));
    const snapshot = await getDocs(q);
    
    const result = {
      connected: true,
      campaignsCollection: {
        exists: !snapshot.empty,
        documentCount: snapshot.size
      }
    };
    
    if (!snapshot.empty) {
      const firstDoc = snapshot.docs[0];
      console.log('[TEST] Sample document found:', firstDoc.id);
      result.sampleDocumentId = firstDoc.id;
      result.sampleDocumentData = {
        id: firstDoc.id,
        // Include only safe fields to display
        name: firstDoc.data().name || 'N/A',
        status: firstDoc.data().status || 'N/A',
        recipientCount: firstDoc.data().recipients ? firstDoc.data().recipients.length : 0,
        openCount: firstDoc.data().openCount || 0
      };
    }
    
    console.log('[TEST] Firebase connection test successful');
    res.json({ success: true, result });
  } catch (error) {
    console.error('[TEST] Firebase connection test failed:', error);
    res.json({ 
      success: false, 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Routes
app.use('/api', facebookOAuth);

// Email tracking endpoint with improved Firefox handling
app.get('/api/track-email-open', async (req, res) => {
  try {
    const { campaignId } = req.query;
    
    // Set headers first to ensure they're always sent
    // Use permissive CORS settings for tracking pixels
    res.set({
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': '*'
    });
    
    // Log request details for debugging
    console.log(`[TRACK] Email open request received:`, {
      campaignId: campaignId || 'MISSING',
      timestamp: new Date().toISOString(),
      headers: {
        origin: req.headers.origin || 'N/A',
        referer: req.headers.referer || 'N/A',
        userAgent: req.headers['user-agent'] || 'N/A'
      },
      ip: req.ip || req.connection.remoteAddress || 'unknown'
    });
    
    // Return the pixel immediately, then process the tracking asynchronously
    // This is a transparent 1x1 GIF
    const transparentPixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    res.send(transparentPixel);
    
    // If no campaign ID, just log and return (already sent pixel)
    if (!campaignId) {
      console.log('[TRACK] No campaignId provided, returning transparent pixel only');
      return;
    }
    
    // After sending the response, update the campaign stats
    try {
      // Import Firebase modules using the centralized configuration
      const { getFirestoreDb } = require('./firebaseConfig');
      const { doc, getDoc, updateDoc, increment, collection, setDoc } = require('firebase/firestore');
      
      // Get Firestore database
      const db = getFirestoreDb();
      
      // Update the campaign's open count
      console.log(`[TRACK] Getting campaign document: ${campaignId}`);
      const campaignRef = doc(db, 'emailCampaigns', campaignId);
      const campaignDoc = await getDoc(campaignRef);
      
      if (campaignDoc.exists()) {
        console.log(`[TRACK] Campaign found, current data:`, {
          name: campaignDoc.data().name || 'N/A',
          status: campaignDoc.data().status || 'N/A',
          openCount: campaignDoc.data().openCount || 0,
          sentCount: campaignDoc.data().sentCount || 0,
          trackingEnabled: campaignDoc.data().trackingEnabled || false
        });
        
        // If openCount field doesn't exist in the document, create it
        const currentOpenCount = campaignDoc.data().openCount || 0;
        
        await updateDoc(campaignRef, {
          openCount: increment(1),
          lastOpened: new Date().toISOString()
        });
        console.log(`[TRACK] Updated open count for campaign ${campaignId}. Previous count: ${currentOpenCount}, new count: ${currentOpenCount + 1}`);
        
        // Also log the tracking event separately (useful for detailed analytics)
        try {
          const trackingRef = doc(collection(db, 'emailCampaigns', campaignId, 'trackingEvents'));
          await setDoc(trackingRef, {
            type: 'open',
            timestamp: new Date().toISOString(),
            userAgent: req.headers['user-agent'] || 'N/A',
            ip: req.ip || 'N/A' // Be careful with PII data
          });
          console.log(`[TRACK] Created tracking event document for campaign ${campaignId}`);
        } catch (trackingEventError) {
          console.error('[TRACK] Error creating tracking event:', trackingEventError);
        }
      } else {
        console.log(`[TRACK] Campaign ${campaignId} not found in database. Creating a dummy record.`);
        
        // If campaign doesn't exist (might be a test or deleted campaign), create a placeholder
        try {
          await setDoc(campaignRef, {
            name: `Auto-created: ${campaignId}`,
            status: 'auto-created',
            openCount: 1,
            sentCount: 1,
            trackingEnabled: true,
            createdAt: new Date().toISOString(),
            lastOpened: new Date().toISOString()
          });
          console.log(`[TRACK] Created placeholder campaign record for ${campaignId}`);
        } catch (createError) {
          console.error('[TRACK] Error creating placeholder campaign:', createError);
        }
      }
    } catch (error) {
      console.error('[TRACK] Error updating campaign open count:', error);
      console.error('[TRACK] Error details:', error.stack);
    }
  } catch (error) {
    console.error('[TRACK] Error tracking email open:', error);
    console.error('[TRACK] Error stack:', error.stack);
    
    // Try to return a pixel even if there's an error, if we haven't sent the response yet
    if (!res.headersSent) {
      res.set('Content-Type', 'image/gif');
      res.set('Access-Control-Allow-Origin', '*');
      res.send(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
    }
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Default route
app.get('/', (req, res) => {
  res.send('CRM Pro API Server');
});

// Admin endpoint for direct tracking testing and diagnostics
app.get('/admin/test-tracking/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    if (!campaignId) {
      return res.status(400).json({
        success: false,
        error: 'Campaign ID is required'
      });
    }
    
    console.log(`[ADMIN] Manual tracking request for campaign: ${campaignId}`);
    
    // Import Firebase modules using the centralized configuration
    const { getFirestoreDb } = require('./firebaseConfig');
    const { doc, getDoc, updateDoc, increment, setDoc } = require('firebase/firestore');
    
    // Get Firestore database
    const db = getFirestoreDb();
    
    // Check campaign document
    const campaignRef = doc(db, 'emailCampaigns', campaignId);
    const campaignDoc = await getDoc(campaignRef);
    
    const campaignData = campaignDoc.exists() 
      ? campaignDoc.data() 
      : null;
    
    // Create an update operation regardless of whether document exists
    try {
      if (campaignDoc.exists()) {
        // Update existing campaign
        const currentOpenCount = campaignData.openCount || 0;
        
        await updateDoc(campaignRef, {
          openCount: increment(1),
          lastOpened: new Date().toISOString(),
          lastManualUpdate: new Date().toISOString()
        });
        
        console.log(`[ADMIN] Updated tracking for existing campaign ${campaignId}. New count: ${currentOpenCount + 1}`);
        
        return res.json({
          success: true,
          message: `Successfully updated campaign open count from ${currentOpenCount} to ${currentOpenCount + 1}`,
          previousData: {
            openCount: currentOpenCount,
            status: campaignData.status || 'unknown',
            name: campaignData.name || 'N/A',
            sentCount: campaignData.sentCount || 0
          }
        });
      } else {
        // Create new campaign document 
        await setDoc(campaignRef, {
          name: `Admin created: ${campaignId}`,
          status: 'admin-created',
          openCount: 1,
          sentCount: 1,
          trackingEnabled: true,
          createdAt: new Date().toISOString(),
          lastOpened: new Date().toISOString(),
          lastManualUpdate: new Date().toISOString()
        });
        
        console.log(`[ADMIN] Created new campaign document for ${campaignId}`);
        
        return res.json({
          success: true,
          message: `Created new campaign document with initial open count of 1`,
          newDocument: true
        });
      }
    } catch (error) {
      console.error(`[ADMIN] Error updating campaign: ${error.message}`);
      
      return res.status(500).json({
        success: false,
        error: `Failed to update campaign: ${error.message}`,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  } catch (error) {
    console.error(`[ADMIN] Error in test endpoint: ${error.message}`);
    
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Start the server
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Test page available at: http://localhost:${PORT}/test-tracking`);
  
  // Test Firebase connection on startup
  try {
    console.log('Testing Firebase connection...');
    await testFirestoreConnection();
    console.log('Firebase connection successful!');
  } catch (error) {
    console.error('Firebase connection failed on startup:', error.message);
    console.log('\n');
    console.log('='.repeat(80));
    console.log('IMPORTANT: Tracking features will not work until Firebase is properly configured.');
    console.log('Please check your .env file and ensure you have set the correct Firebase credentials.');
    console.log('You need to:');
    console.log('1. Create a Firebase project at https://console.firebase.google.com/');
    console.log('2. Enable Firestore Database in your Firebase project');
    console.log('3. Update your Backend/.env file with the correct Firebase credentials');
    console.log('='.repeat(80));
    console.log('\n');
  }
});

// Export for potential serverless deployment
module.exports = app; 