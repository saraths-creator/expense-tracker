# Expense Tracker

## One-time setup

### 1. Install Git
Download from https://git-scm.com/downloads/win — install with default options.

### 2. Push to GitHub
Open **PowerShell** (or Git Bash) and run these commands one by one:

```powershell
cd C:\Users\shara\OneDrive\Desktop\expense-tracker

# Initialize repo and commit
git init
git add .
git commit -m "Initial commit"

# Create repo on GitHub (using browser)
# Go to https://github.com/new
# Repository name: expense-tracker
# Click "Create repository"
# Then run the two commands GitHub shows you:
git remote add origin https://github.com/YOUR_USERNAME/expense-tracker.git
git branch -M main
git push -u origin main
```

### 3. Deploy on Render (free, no credit card)
1. Go to https://render.com and sign up with **GitHub** (click "Continue with GitHub")
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub account and select the `expense-tracker` repo
4. Render auto-detects Node.js. Set these:
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
5. Click **"Advanced"** → **"Add Environment Variable"**:
   - `APP_PASSWORD` = `your-secret-password` (set whatever you want)
   - `SESSION_SECRET` = `your-random-secret` (any random string)
6. Click **"Create Web Service"**

Render will build and deploy in ~2 minutes. You'll get a URL like:
```
https://expense-tracker-xxxx.onrender.com
```

### 4. Start using it
Open that URL, enter your password, and you're in. Access it from any device, anywhere.

---

## Local development
```powershell
cd C:\Users\shara\OneDrive\Desktop\expense-tracker
$env:APP_PASSWORD="test123"
node server.js
```
Then open http://localhost:3000
