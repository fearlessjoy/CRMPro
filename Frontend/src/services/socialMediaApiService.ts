import { addSocialMediaIntegration, updateSocialMediaIntegration } from './socialMediaService';

// This would typically be environment variables in a production app
const FACEBOOK_APP_ID = 'your-facebook-app-id';
const FACEBOOK_APP_SECRET = 'your-facebook-app-secret';
const REDIRECT_URI = window.location.origin + '/settings/social-media/callback';

// Storage keys
const OAUTH_STATE_KEY = 'social_media_oauth_state';
const TEMP_PLATFORM_KEY = 'social_media_temp_platform';

// Flag to determine if we're in mock mode
const USE_MOCK_API = process.env.NODE_ENV === 'development';

interface OAuthConfig {
  authUrl: string;
  tokenUrl: string;
  scope: string;
  apiBaseUrl: string;
}

const OAUTH_CONFIGS: Record<string, OAuthConfig> = {
  facebook: {
    authUrl: 'https://www.facebook.com/v17.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v17.0/oauth/access_token',
    scope: 'pages_show_list,pages_read_engagement,leads_retrieval,pages_manage_metadata',
    apiBaseUrl: 'https://graph.facebook.com/v17.0'
  },
  instagram: {
    authUrl: 'https://api.instagram.com/oauth/authorize',
    tokenUrl: 'https://api.instagram.com/oauth/access_token',
    scope: 'user_profile,user_media',
    apiBaseUrl: 'https://graph.instagram.com'
  }
};

// Generate a random state parameter for OAuth security
const generateOAuthState = (): string => {
  const array = new Uint32Array(8);
  window.crypto.getRandomValues(array);
  return Array.from(array, x => x.toString(16).padStart(8, '0')).join('');
};

// Initiates OAuth flow
export const initiateSocialMediaOAuth = (platform: 'facebook' | 'instagram' | 'linkedin' | 'twitter'): void => {
  if (!OAUTH_CONFIGS[platform]) {
    throw new Error(`OAuth not configured for platform: ${platform}`);
  }

  // In development mode, use the mock OAuth flow
  if (USE_MOCK_API) {
    console.log(`[Mock] Initiating OAuth flow for ${platform}`);
    // Store state and platform for verification
    const state = generateOAuthState();
    localStorage.setItem(OAUTH_STATE_KEY, state);
    localStorage.setItem(TEMP_PLATFORM_KEY, platform);
    
    // Use the simulated callback
    window.location.href = `${window.location.origin}/settings/social-media/callback?code=mock-auth-code-${Math.random().toString(36).substring(2)}&state=${state}`;
    return;
  }
  
  // In production, use the real OAuth flow
  const config = OAUTH_CONFIGS[platform];
  const state = generateOAuthState();
  
  // Store state and platform for verification when the user returns
  localStorage.setItem(OAUTH_STATE_KEY, state);
  localStorage.setItem(TEMP_PLATFORM_KEY, platform);
  
  // Construct the authorization URL
  const authParams = new URLSearchParams({
    client_id: FACEBOOK_APP_ID,
    redirect_uri: REDIRECT_URI,
    state: state,
    scope: config.scope,
    response_type: 'code'
  });
  
  // Redirect the user to the authorization URL
  window.location.href = `${config.authUrl}?${authParams.toString()}`;
};

// Handle the OAuth callback with the authorization code
export const handleOAuthCallback = async (queryParams: URLSearchParams): Promise<boolean> => {
  const code = queryParams.get('code');
  const state = queryParams.get('state');
  const storedState = localStorage.getItem(OAUTH_STATE_KEY);
  const platform = localStorage.getItem(TEMP_PLATFORM_KEY) as 'facebook' | 'instagram' | 'linkedin' | 'twitter';
  
  // Clear storage
  localStorage.removeItem(OAUTH_STATE_KEY);
  localStorage.removeItem(TEMP_PLATFORM_KEY);
  
  // Verify state parameter to prevent CSRF
  if (!code || !state || state !== storedState || !platform) {
    throw new Error('Invalid OAuth callback parameters');
  }
  
  // For mock mode, skip the token exchange and directly simulate successful connection
  if (USE_MOCK_API) {
    console.log(`[Mock] Processing OAuth callback for ${platform}`);
    return await mockConnectFacebookPages();
  }
  
  const config = OAUTH_CONFIGS[platform];
  
  // Exchange the code for an access token
  // Note: In a real app, this should be done on the server to keep app secret secure
  const tokenParams = new URLSearchParams({
    client_id: FACEBOOK_APP_ID,
    client_secret: FACEBOOK_APP_SECRET,
    redirect_uri: REDIRECT_URI,
    code: code
  });
  
  try {
    const tokenResponse = await fetch(`${config.tokenUrl}?${tokenParams.toString()}`, {
      method: 'GET'
    });
    
    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for token');
    }
    
    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    const expiresIn = tokenData.expires_in;
    
    // For Facebook, get list of pages the user manages
    if (platform === 'facebook') {
      return await connectFacebookPages(accessToken, new Date(Date.now() + expiresIn * 1000));
    }
    
    // For other platforms, implement similar page/account connection logic
    return false;
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    throw error;
  }
};

// Get Facebook pages and add them as integrations
const connectFacebookPages = async (userAccessToken: string, tokenExpiresAt: Date): Promise<boolean> => {
  try {
    // Get user's Facebook pages
    const pagesResponse = await fetch(
      `${OAUTH_CONFIGS.facebook.apiBaseUrl}/me/accounts?access_token=${userAccessToken}`
    );
    
    if (!pagesResponse.ok) {
      throw new Error('Failed to fetch Facebook pages');
    }
    
    const pagesData = await pagesResponse.json();
    
    if (!pagesData.data || pagesData.data.length === 0) {
      throw new Error('No Facebook pages found for this user');
    }
    
    // Add each page as a separate integration
    for (const page of pagesData.data) {
      // Get a page-specific access token that doesn't expire
      const pageToken = page.access_token;
      
      // Get additional page details including the profile picture
      const pageDetailsResponse = await fetch(
        `${OAUTH_CONFIGS.facebook.apiBaseUrl}/${page.id}?fields=name,picture&access_token=${pageToken}`
      );
      
      if (!pageDetailsResponse.ok) {
        console.error(`Failed to fetch details for page ${page.id}`);
        continue;
      }
      
      const pageDetails = await pageDetailsResponse.json();
      
      // Create integration record
      await addSocialMediaIntegration({
        platform: 'facebook',
        pageId: page.id,
        pageName: page.name,
        pageImage: pageDetails.picture?.data?.url,
        accessToken: pageToken,
        tokenExpiresAt: new Date(9999, 11, 31), // Page tokens don't expire
        status: 'active',
        connectedBy: 'current-user', // In a real app, use the actual user ID
        connectedAt: new Date(),
        lastUpdated: new Date()
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error connecting Facebook pages:', error);
    return false;
  }
};

// Mock implementation for development
const mockConnectFacebookPages = async (): Promise<boolean> => {
  try {
    console.log('[Mock] Connecting Facebook pages');
    
    // Mock pages data
    const mockPages = [
      {
        id: '12345678901',
        name: 'Business Page 1',
        access_token: 'mock-page-token-' + Math.random().toString(36).substring(2),
        picture: { data: { url: 'https://picsum.photos/id/1/50/50' } }
      },
      {
        id: '12345678902',
        name: 'Business Page 2',
        access_token: 'mock-page-token-' + Math.random().toString(36).substring(2),
        picture: { data: { url: 'https://picsum.photos/id/2/50/50' } }
      }
    ];
    
    // Add each mock page as a separate integration
    for (const page of mockPages) {
      await addSocialMediaIntegration({
        platform: 'facebook',
        pageId: page.id,
        pageName: page.name,
        pageImage: page.picture?.data?.url,
        accessToken: page.access_token,
        tokenExpiresAt: new Date(9999, 11, 31), // Page tokens don't expire
        status: 'active',
        connectedBy: 'current-user', // In a real app, use the actual user ID
        connectedAt: new Date(),
        lastUpdated: new Date()
      });
    }
    
    return true;
  } catch (error) {
    console.error('[Mock] Error connecting Facebook pages:', error);
    return false;
  }
};

// Get lead forms for a Facebook page
export const getFacebookLeadForms = async (pageId: string, accessToken: string): Promise<any[]> => {
  if (USE_MOCK_API) {
    // Use mock data for development
    return mockSocialMediaApi.getLeadForms('facebook', pageId);
  }
  
  try {
    const formsResponse = await fetch(
      `${OAUTH_CONFIGS.facebook.apiBaseUrl}/${pageId}/leadgen_forms?access_token=${accessToken}`
    );
    
    if (!formsResponse.ok) {
      throw new Error(`Failed to fetch lead forms for page ${pageId}`);
    }
    
    const formsData = await formsResponse.json();
    return formsData.data || [];
  } catch (error) {
    console.error('Error getting Facebook lead forms:', error);
    throw error;
  }
};

// Get leads from a Facebook lead form
export const getFacebookLeads = async (formId: string, accessToken: string): Promise<any[]> => {
  if (USE_MOCK_API) {
    // Use mock data for development
    return mockSocialMediaApi.getLeads('facebook', formId);
  }
  
  try {
    const leadsResponse = await fetch(
      `${OAUTH_CONFIGS.facebook.apiBaseUrl}/${formId}/leads?access_token=${accessToken}`
    );
    
    if (!leadsResponse.ok) {
      throw new Error(`Failed to fetch leads for form ${formId}`);
    }
    
    const leadsData = await leadsResponse.json();
    return leadsData.data || [];
  } catch (error) {
    console.error('Error getting Facebook leads:', error);
    throw error;
  }
};

// Mock function to simulate API responses for development
export const mockSocialMediaApi = {
  // Mock function to simulate connecting to Facebook
  connectFacebook: async (apiKey: string, apiSecret: string) => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Validate API key and secret
    if (!apiKey || !apiSecret) {
      throw new Error('API Key and Secret are required');
    }
    
    // Mock successful connection
    return {
      success: true,
      integration: {
        id: 'mock-fb-' + Date.now(),
        platform: 'facebook',
        pageId: '12345678901234',
        pageName: 'My Business Page',
        pageImage: 'https://via.placeholder.com/50',
        accessToken: 'mock-token-' + Math.random().toString(36).substring(2),
        tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
        status: 'active',
        connectedBy: 'current-user',
        connectedAt: new Date(),
        lastUpdated: new Date()
      }
    };
  },
  
  // Mock function to get lead forms
  getLeadForms: async (platform: string, pageId: string) => {
    console.log(`[Mock] Getting lead forms for ${platform} page ${pageId}`);
    await new Promise(resolve => setTimeout(resolve, 800));
    
    return [
      {
        id: 'form-1',
        name: 'Contact Us Form',
        status: 'ACTIVE',
        created_time: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        form_elements: [
          { name: 'full_name', label: 'Full Name', type: 'CUSTOM' },
          { name: 'email', label: 'Email', type: 'EMAIL' },
          { name: 'phone_number', label: 'Phone Number', type: 'PHONE' },
          { name: 'message', label: 'Message', type: 'CUSTOM' }
        ]
      },
      {
        id: 'form-2',
        name: 'Product Inquiry',
        status: 'ACTIVE',
        created_time: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        form_elements: [
          { name: 'full_name', label: 'Full Name', type: 'CUSTOM' },
          { name: 'email', label: 'Email', type: 'EMAIL' },
          { name: 'product_interest', label: 'Product Interest', type: 'CUSTOM' },
          { name: 'budget', label: 'Budget', type: 'CUSTOM' }
        ]
      },
      {
        id: 'form-3',
        name: 'Newsletter Signup',
        status: 'ACTIVE',
        created_time: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        form_elements: [
          { name: 'full_name', label: 'Full Name', type: 'CUSTOM' },
          { name: 'email', label: 'Email', type: 'EMAIL' },
          { name: 'interests', label: 'Interests', type: 'CUSTOM' }
        ]
      }
    ];
  },
  
  // Mock function to get leads from a form
  getLeads: async (platform: string, formId: string) => {
    console.log(`[Mock] Getting leads for ${platform} form ${formId}`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return Array(10).fill(null).map((_, index) => ({
      id: `lead-${formId}-${index}`,
      created_time: new Date(Date.now() - Math.floor(Math.random() * 10) * 24 * 60 * 60 * 1000),
      field_data: [
        { name: 'full_name', values: [`John Doe ${index}`] },
        { name: 'email', values: [`john.doe${index}@example.com`] },
        { name: 'phone_number', values: [`+1 555-123-${1000 + index}`] },
        { name: 'message', values: ['I am interested in your services'] }
      ]
    }));
  }
}; 