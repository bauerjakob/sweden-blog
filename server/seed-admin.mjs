#!/usr/bin/env node
/*
 * Create or update the single admin user.
 *
 *   node server/seed-admin.mjs <username> <password>
 *   ADMIN_USERNAME=me ADMIN_PASSWORD=secret npm run seed:admin
 */
import bcrypt from 'bcryptjs'
import { db } from './db.mjs'

const username = process.argv[2] || process.env.ADMIN_USERNAME
const password = process.argv[3] || process.env.ADMIN_PASSWORD

if (!username || !password) {
  console.error('Usage: node server/seed-admin.mjs <username> <password>')
  console.error('   or: ADMIN_USERNAME=… ADMIN_PASSWORD=… npm run seed:admin')
  process.exit(1)
}
if (String(password).length < 8) {
  console.error('Password must be at least 8 characters.')
  process.exit(1)
}

const hash = bcrypt.hashSync(String(password), 12)
const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
if (existing) {
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, existing.id)
  console.log(`Updated password for admin "${username}".`)
} else {
  db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, hash)
  console.log(`Created admin "${username}".`)
}
process.exit(0)
