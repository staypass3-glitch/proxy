// api/proxy.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  const SUPABASE_URL = 'https://japrxgqsdstohjbujbxw.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphcHJ4Z3FzZHN0b2hqYnVqYnh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDExMTA1MjAsImV4cCI6MjA1NjY4NjUyMH0.ScS0IJkn3s5fwMQMSK1O_AFriEBkxAcIVjzvCjTZBh4';

  const response = await fetch(`${SUPABASE_URL}${req.url.replace('/api','')}`, {
    method: req.method,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
  });

  const data = await response.json();
  res.status(response.status).json(data);
}