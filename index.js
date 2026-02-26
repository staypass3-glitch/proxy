import express from "express"
import fetch from "node-fetch"
import cors from "cors"

const app = express()

app.use(cors())
app.use(express.json())

const SUPABASE_URL = "https://japrxgqsdstohjbujbxw.supabase.co"

app.use("*", async (req, res) => {
  try {
    const url = SUPABASE_URL + req.originalUrl

    const response = await fetch(url, {
      method: req.method,
      headers: {
        "apikey": req.headers.apikey,
        "authorization": req.headers.authorization,
        "content-type": "application/json"
      },
      body: ["GET", "HEAD"].includes(req.method)
        ? undefined
        : JSON.stringify(req.body)
    })

    const data = await response.text()

    res.status(response.status).send(data)

  } catch (error) {
    console.error("Proxy error:", error)
    res.status(500).json({ error: "Proxy failed", details: error.message })
  }
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Proxy running on port ${PORT}`)
})