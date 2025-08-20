# 🚀 Production Deployment Guide

## Overview
Your ebook reader consists of 3 parts:
1. **Frontend** (React app) - User interface
2. **Books API Server** - Handles book storage and sync
3. **Main TTS Server** - Text-to-speech functionality

## 📋 Prerequisites

### 1. Clerk Production Setup
```bash
# Get your production keys from https://clerk.com
VITE_CLERK_PUBLISHABLE_KEY=pk_live_your_production_key
```

### 2. Domain/Hosting Accounts
- **Frontend**: Vercel/Netlify account
- **Backend**: Railway/Render account (or VPS)

## 🔧 Step-by-Step Deployment

### Step 1: Deploy Books API Server

#### Option A: Railway (Recommended)
```bash
# In your books-api directory
npm install railway
railway login
railway init
railway up
```

#### Option B: Render
1. Connect your GitHub repo to Render
2. Create new Web Service
3. Set build command: `cd books-api && npm install`
4. Set start command: `npm start`
5. Set environment: `PORT=3001`

#### Option C: DigitalOcean/VPS
```bash
# On your server
git clone your-repo
cd your-repo/books-api
npm install --production
pm2 start server.js --name "books-api"
pm2 startup
pm2 save
```

### Step 2: Deploy Frontend

#### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# In your project root
vercel

# Set environment variables in Vercel dashboard:
# VITE_CLERK_PUBLISHABLE_KEY=pk_live_your_key
# VITE_BOOKS_API_URL=https://your-books-api.railway.app
```

#### Netlify
```bash
# Build the project
npm run build

# Deploy to Netlify
# Set environment variables:
# VITE_CLERK_PUBLISHABLE_KEY=pk_live_your_key
# VITE_BOOKS_API_URL=https://your-books-api.railway.app
```

### Step 3: Configure Clerk for Production

1. Go to [Clerk Dashboard](https://clerk.com)
2. Add your production domain to allowed origins
3. Update JWT settings if needed
4. Get your production publishable key

### Step 4: Update Environment Variables

Create `.env.production`:
```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_live_your_production_key
VITE_BOOKS_API_URL=https://your-books-api.railway.app
```

## 🔒 Security Considerations

### 1. CORS Configuration
Update `books-api/server.js`:
```javascript
app.use(cors({
  origin: [
    'https://your-frontend-domain.vercel.app',
    'http://localhost:5173' // Keep for development
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### 2. Rate Limiting
Add to `books-api/server.js`:
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### 3. File Size Limits
Already configured in `books-api/server.js`:
```javascript
app.use(express.json({ limit: '50mb' }));
```

## 📊 Monitoring & Analytics

### 1. Server Health Monitoring
```bash
# Check if Books API is running
curl https://your-books-api.railway.app/health
```

### 2. Clerk Analytics
- User sign-ups tracked automatically
- View in Clerk Dashboard

### 3. Error Logging
Add to `books-api/server.js`:
```javascript
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});
```

## 🧪 Testing Production Setup

### 1. Test Books API
```bash
curl -X POST https://your-books-api.railway.app/api/books \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","action":"get"}'
```

### 2. Test Frontend
1. Visit your deployed app
2. Sign up/login with Clerk
3. Upload a book
4. Verify it syncs across devices

## 🔄 CI/CD Pipeline (Optional)

### GitHub Actions Example
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production
on:
  push:
    branches: [main]
jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run build
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
```

## 🚨 Troubleshooting

### Common Issues

1. **CORS Errors**
   - Update allowed origins in books-api
   - Check environment variables

2. **Book Sync Not Working**
   - Verify VITE_BOOKS_API_URL is correct
   - Check network requests in browser dev tools

3. **Authentication Issues**
   - Verify Clerk production keys
   - Check allowed domains in Clerk dashboard

### Debug Commands
```bash
# Check server logs
railway logs # for Railway
heroku logs --tail # for Heroku

# Test API endpoint
curl https://your-books-api.railway.app/health
```

## 💰 Cost Estimation

### Monthly Costs (Approximate)
- **Vercel**: Free tier (good for most usage)
- **Railway**: $5-20/month (depending on usage)
- **Clerk**: Free up to 10k MAU, then $25/month
- **Total**: ~$5-45/month depending on scale

## 📈 Scaling Considerations

### Database Migration (Future)
When you outgrow file-based storage:
```javascript
// Consider migrating to:
// - PostgreSQL (Railway provides this)
// - MongoDB Atlas
// - Supabase
```

### CDN for Books (Future)
```javascript
// For large-scale deployment:
// - AWS S3 + CloudFront
// - Cloudinary for images
```

---

**🎉 Your ebook reader is now production-ready!** Users can sign up, save books, and access them from any device. 




### login to ssh
ssh -i C:\Users\Rajveer\.ssh\id_ed25519 root@161.35.186.252


### go to vite read

cd Vite-reader

### check git branch

git status

git pull

### build the app

yarn build


remove th older verision of distroy from yoread

sudo rm -rf /var/www/yoread.com/*


### Copy directory from vite to yoread

sudo cp -r ~/Vite-project/dist/* /var/www/yoread.com/ 

### copy cover from the vite to yoread

sudo cp -r ~/Vite-project/public/sample-book-covers /var/www/yoread.com/


### permission

sudo chown -R www-data:www-data /var/www/yoread.com 