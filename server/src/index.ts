import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { connectDB } from './lib/db'
import authRoutes from './routes/auth'
import athleteRoutes from './routes/athlete'
import coachRoutes from './routes/coach'
import statsRoutes from './routes/stats'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors({ origin: 'http://localhost:5173', credentials: true }))
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/athlete', athleteRoutes)
app.use('/api/coach', coachRoutes)
app.use('/api/stats', statsRoutes)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
  })
})
