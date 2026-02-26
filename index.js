import express from "express";
import { fetch } from "undici";
import cors from "cors";

const app = express();

// Enhanced CORS configuration
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'apikey', 'x-client-info', 'x-supabase-auth', 'X-Client-Info']
}));

app.use(express.json());

// Your Supabase project URL
const SUPABASE_URL = "https://japrxgqsdstohjbujbxw.supabase.co";

// Debug endpoint to check headers
app.get("/debug-headers", (req, res) => {
  res.json({
    headers: req.headers,
    hasAuthorization: !!req.headers.authorization,
    hasApikey: !!req.headers.apikey,
    authHeaderPresent: req.headers.authorization ? 'Yes' : 'No',
    apikeyPresent: req.headers.apikey ? 'Yes' : 'No',
    authHeaderStart: req.headers.authorization ? req.headers.authorization.substring(0, 20) + '...' : null,
    method: req.method,
    url: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ 
    status: "OK", 
    message: "Supabase proxy is running",
    timestamp: new Date().toISOString()
  });
});

// Handle all requests
app.use("*", async (req, res) => {
  // Set CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey, x-client-info, x-supabase-auth');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Construct the full Supabase URL
    const url = SUPABASE_URL + req.originalUrl;
    console.log(`\n[${new Date().toISOString()}] Proxying ${req.method} request to: ${url}`);
    
    // Log headers for debugging
    console.log('Request Headers:', {
      authorization: req.headers.authorization ? 'Present' : 'Missing',
      apikey: req.headers.apikey ? 'Present' : 'Missing',
      contentType: req.headers['content-type']
    });

    // Prepare headers to forward - THIS IS CRITICAL FOR RLS
    const headers = {};
    
    // Forward authentication headers (these make RLS work)
    if (req.headers.authorization) {
      headers.authorization = req.headers.authorization;
      headers.Authorization = req.headers.authorization; // Send both cases
      console.log('✅ Forwarding Authorization header');
    } else {
      console.log('⚠️ No Authorization header received from client');
    }
    
    if (req.headers.apikey) {
      headers.apikey = req.headers.apikey;
      headers.apikey = req.headers.apikey;
      console.log('✅ Forwarding apikey header');
    }
    
    // Always set content type
    headers['content-type'] = req.headers['content-type'] || 'application/json';
    
    // Forward Supabase specific headers
    if (req.headers['x-client-info']) {
      headers['x-client-info'] = req.headers['x-client-info'];
    }
    
    if (req.headers['x-supabase-auth']) {
      headers['x-supabase-auth'] = req.headers['x-supabase-auth'];
    }

    // Prepare request options
    const requestOptions = {
      method: req.method,
      headers: headers
    };

    // Add body for non-GET requests
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      if (req.body && Object.keys(req.body).length > 0) {
        requestOptions.body = JSON.stringify(req.body);
        console.log('Request body:', JSON.stringify(req.body).substring(0, 200));
      }
    }

    // Make the request to Supabase
    console.log('Forwarding to Supabase...');
    const response = await fetch(url, requestOptions);

    // Get response data
    const data = await response.text();
    
    console.log(`Supabase response status: ${response.status}`);

    // Set response status
    res.status(response.status);

    // Forward important headers from Supabase
    const headersToForward = [
      'content-type',
      'content-range',
      'range',
      'cache-control',
      'x-ratelimit-limit',
      'x-ratelimit-remaining',
      'x-ratelimit-reset'
    ];
    
    headersToForward.forEach(headerName => {
      const headerValue = response.headers.get(headerName);
      if (headerValue) {
        res.setHeader(headerName, headerValue);
      }
    });

    // Send response
    res.send(data);
    
    console.log(`✅ Request completed with status ${response.status}`);
    
  } catch (error) {
    console.error("❌ Proxy error:", error);
    res.status(500).json({ 
      error: "Proxy failed", 
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('\n=================================');
  console.log('🚀 Supabase Proxy Server Started');
  console.log('=================================');
  console.log(`📡 Port: ${PORT}`);
  console.log(`🔗 Proxy URL: http://localhost:${PORT}`);
  console.log(`🎯 Target Supabase: ${SUPABASE_URL}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`🔍 Debug endpoint: http://localhost:${PORT}/debug-headers`);
  console.log('=================================\n');
});