import dotenv from 'dotenv'
dotenv.config()

import { connectDB } from './lib/db'
import User from './models/User'
import StatCard from './models/StatCard'
import StatEntry from './models/StatEntry'
import CoachAthlete from './models/CoachAthlete'
import mongoose from 'mongoose'

const seed = async () => {
  await connectDB()
  console.log('Seeding database...')

  await User.deleteMany({})
  await StatCard.deleteMany({})
  await StatEntry.deleteMany({})
  await CoachAthlete.deleteMany({})

  // Create users
  const athlete = await User.create({
    name: 'Alex Müller',
    email: 'athlete@demo.com',
    password: 'password123',
    role: 'athlete',
  })

  const coach = await User.create({
    name: 'Coach Sarah',
    email: 'coach@demo.com',
    password: 'password123',
    role: 'coach',
  })

  console.log('Created users')

  // Create cards
  const heartrateCard = await StatCard.create({
    athleteId: athlete._id,
    type: 'heartrate',
    label: 'Heart Rate',
    unit: 'bpm',
    order: 0,
  })

  const caloriesCard = await StatCard.create({
    athleteId: athlete._id,
    type: 'calories',
    label: 'Calories',
    unit: 'kcal',
    order: 1,
  })

  const weightCard = await StatCard.create({
    athleteId: athlete._id,
    type: 'weight',
    label: 'Weight',
    unit: 'kg',
    order: 2,
  })

  const runningCard = await StatCard.create({
    athleteId: athlete._id,
    type: 'custom',
    label: 'Running',
    unit: 'min/km',
    order: 3,
  })

  const cyclingCard = await StatCard.create({
    athleteId: athlete._id,
    type: 'custom',
    label: 'Cycling',
    unit: 'km/h',
    order: 4,
  })

  console.log('Created cards')

  // Generate 30 days of fictional data
  const now = new Date()
  const entries = []

  for (let i = 29; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)

    entries.push(
      { cardId: heartrateCard._id, athleteId: athlete._id, value: 58 + Math.floor(Math.random() * 20), recordedAt: date },
      { cardId: caloriesCard._id, athleteId: athlete._id, value: 1800 + Math.floor(Math.random() * 600), recordedAt: date },
      { cardId: weightCard._id, athleteId: athlete._id, value: +(76.5 - i * 0.05 + (Math.random() - 0.5) * 0.4).toFixed(1), recordedAt: date },
    )

    // Running 4x per week
    if (i % 2 === 0) {
      const distance = 5 + Math.random() * 5           // km
      const time = distance * (5.2 - i * 0.01)        // minutes (improving pace)
      entries.push({
        cardId: runningCard._id,
        athleteId: athlete._id,
        value: +(time / distance).toFixed(2),          // pace in min/km
        secondaryValue: +distance.toFixed(2),
        recordedAt: date,
      })
    }

    // Cycling 2x per week
    if (i % 4 === 0) {
      entries.push({
        cardId: cyclingCard._id,
        athleteId: athlete._id,
        value: +(22 + Math.random() * 8).toFixed(1),   // avg speed km/h
        secondaryValue: +(20 + Math.random() * 30).toFixed(1),
        recordedAt: date,
      })
    }
  }

  await StatEntry.insertMany(entries)
  console.log(`Created ${entries.length} stat entries`)

  // Link coach to athlete with running, weight, heartrate access
  await CoachAthlete.create({
    coachId: coach._id,
    athleteId: athlete._id,
    status: 'active',
    allowedMetrics: [heartrateCard._id, weightCard._id, runningCard._id],
  })

  console.log('Created coach-athlete relationship')
  console.log('\n✅ Seed complete!')
  console.log('  Athlete — email: athlete@demo.com  password: password123')
  console.log('  Coach   — email: coach@demo.com    password: password123')

  await mongoose.disconnect()
}

seed().catch(console.error)
