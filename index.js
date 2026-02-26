import express from "express";
import { fetch } from "undici";
import cors from "cors";

const app = express();

// CORS configuration
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'apikey']
}));

app.use(express.json());

// Your Supabase project URL
const SUPABASE_URL = "https://japrxgqsdstohjbujbxw.supabase.co";

// Debug endpoint to check headers
app.get("/debug-headers", (req, res) => {
  res.json({
    headers: {
      authorization: req.headers.authoruration ? 'Present' : 'Missing',
      authorization_length: req.headers.authorization ? req.headers.authorization.length : 0,
      apikey: req.headers.apikey ? 'Present' : 'Missing',
      authorization_preview: req.headers.authorization ? req.headers.authorization.substring(0, 30) + '...' : null
    },
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "Proxy is running" });
});

// Handle all requests
app.use("*", async (req, res) => {
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    return res.status(200).end();
  }

  try {
    const url = SUPABASE_URL + req.originalUrl;
    
    // CRITICAL: Forward headers EXACTLY as received - NO MODIFICATION
    const headers = {};
    
    // Forward apikey exactly as received
    if (req.headers.apikey) {
      headers.apikey = req.headers.apikey;
    }
    
    // CRITICAL FIX: Forward Authorization header EXACTLY as received
    // Do NOT modify it, do NOT add "Bearer" if not present, do NOT change case
    if (req.headers.authorization) {
      // Use exactly what the client sent - this is crucial
      headers.authorization = req.headers.authorization;
      
      // Log for debugging (but don't log full token)
      console.log('Authorization header present, length:', req.headers.authorization.length);
      console.log('Starts with:', req.headers.authorization.substring(0, 15) + '...');
    } else {
      console.log('No Authorization header received');
    }
    
    // Always set content type
    headers['content-type'] = req.headers['content-type'] || 'application/json';

    // Prepare request options
    const requestOptions = {
      method: req.method,
      headers: headers
    };

    // Add body for non-GET requests
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      if (req.body && Object.keys(req.body).length > 0) {
        requestOptions.body = JSON.stringify(req.body);
      }
    }

    // Make the request to Supabase
    const response = await fetch(url, requestOptions);

    // Get response data
    const data = await response.text();
    
    // Set response status
    res.status(response.status);

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('content-type', response.headers.get('content-type') || 'application/json');

    // Send response
    res.send(data);
    
  } catch (error) {
    console.error("Proxy error:", error);
    res.status(500).json({ 
      error: "Proxy failed", 
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Proxy running on port ${PORT}`);
});