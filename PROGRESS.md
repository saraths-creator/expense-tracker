# Expense Tracker — Progress Summary

## Completed

### 1. Multi-User Auth
- User registration (username + password) with hashed passwords (`crypto.scryptSync`)
- Login/logout with session cookies (7-day expiry)
- Data isolation — each user sees only their own transactions + categories

### 2. MongoDB Atlas (Cloud Storage)
- Replaced ephemeral `data.json` with MongoDB Atlas (free tier)
- Auto-migration from legacy `data.json` on first run
- Collections: `users`, `transactions`, `customCategories`

### 3. PWA (Installable on Phone)
- `manifest.json` with icons (192x512, 512x512)
- Service worker (`sw.js`) for offline cache
- Add to Home Screen on Android Chrome

### 4. Bug Fix — Edit Not Saving
- Stripped immutable `_id` from MongoDB `$set` payload

### 5. Deployment
- GitHub repo: `github.com/saraths-creator/expense-tracker`
- Hosted on Render (auto-deploys on push to `master`)
- Env var required: `MONGODB_URI`
- No `APP_PASSWORD` needed — uses user accounts instead

## Key Details
- **MongoDB URI:** stored as `MONGODB_URI` on Render
- **DB password:** Bluemetal@753 (URL-encoded: `Bluemetal%40753`)
- **Cluster:** cluster0.nra5mhe.mongodb.net
- **Database:** expenses
- **Collections:** users, transactions, customCategories

## To Continue Next Session
Start a new opencode session in this project and run:
```
node server.js
```
Or deploy changes via: `git push origin master` → Render auto-deploys.
