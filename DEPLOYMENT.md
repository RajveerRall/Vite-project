# 🚀 Production Deployment Guide
#  git clone ssh -i C:\Users\Rajveer\.ssh\id_ed25519 root@161.35.186 252         
## Overview

Your ebook reader consists of 4 parts:
1. **Frontend** (React app) - User interface
2. **Supabase Edge Functions** - Subscription and payment APIs
3. **Express Server** - TTS functionality only
4. **Supabase Database** - User data, subscriptions, usage tracking

## 📋 Prerequisites

### 1. Supabase Setup
- Supabase project created
- Edge Functions configured
- Database schema deployed

### 2. Environment Variables

**Frontend (.env):**
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_DODO_API_KEY=your-dodo-api-key
VITE_DODO_BASE_URL=https://test.dodopayments.com
```

**Supabase Edge Functions (set in Dashboard):**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DODO_PAYMENTS_API_KEY`
- `DODO_BASE_URL`
- `DODO_WEBHOOK_SECRET`

---

## 🔧 Step-by-Step Deployment

### Step 1: Deploy Supabase Edge Functions

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Deploy all functions
npm run supabase:functions:deploy

# Or deploy individually
supabase functions deploy subscriptions
supabase functions deploy products
supabase functions deploy dodo-webhook
supabase functions deploy increment-usage
```

**Verify deployment:**
- Go to Supabase Dashboard → Edge Functions
- Check all functions are deployed and active
- Set environment variables in Edge Functions settings

### Step 2: Configure DodoPayments Webhook

1. Go to DodoPayments Dashboard → Webhooks
2. Set webhook URL to: `https://[project-ref].supabase.co/functions/v1/dodo-webhook`
3. Select events:
   - `subscription.created`
   - `subscription.updated`
   - `subscription.cancelled`
   - `payment.succeeded`

### Step 3: Deploy Express Server (TTS)

#### Option A: Railway (Recommended)
```bash
# In your project root
railway login
railway init
railway up
```

#### Option B: Fly.io
```bash
# Using existing fly.toml
fly deploy
```

#### Option C: DigitalOcean/VPS
```bash
# On your server
git clone your-repo
cd your-repo/Vite-project
npm install --production
pm2 start server.cjs --name "yoread-tts"
pm2 startup
pm2 save
```

### Step 4: Deploy Frontend

#### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# In your project root
vercel

# Set environment variables in Vercel dashboard
```

#### Netlify
```bash
# Build the project
npm run build

# Deploy to Netlify
# Set environment variables
```

### Step 5: Verify Deployment

1. **Test Edge Functions:**
```bash
# Test products endpoint (public)
curl https://[project-ref].supabase.co/functions/v1/products

# Test webhook (requires signature)
curl -X POST https://[project-ref].supabase.co/functions/v1/dodo-webhook \
  -H "Content-Type: application/json" \
  -d '{"type":"test","data":{}}'
```

2. **Test Express Server:**
```bash
curl https://your-tts-server.com/health
```

3. **Test Frontend:**
- Visit deployed URL
- Sign up/login
- Verify subscription flow works

---

## 🔒 Security Considerations

### 1. Environment Variables
- Never commit secrets to git
- Use Supabase Dashboard for Edge Function secrets
- Use platform-specific secret management (Vercel, Railway, etc.)

### 2. CORS Configuration
- Edge Functions handle CORS automatically
- Express server CORS configured in `server.cjs`

### 3. Webhook Security
- Webhook signature verification required
- Set `DODO_WEBHOOK_SECRET` in Supabase Dashboard
- Verify signature in Edge Function

---

## 📊 Monitoring

### Edge Functions
- View logs: `supabase functions logs [function-name]`
- Monitor in Supabase Dashboard → Edge Functions
- Set up alerts for function errors

### Express Server
- Monitor server logs via deployment platform
- Check health endpoint: `/health`

### Database
- Monitor in Supabase Dashboard
- Check RLS policies are working correctly
- Monitor usage quotas

---

## 🧪 Testing Production Setup

### 1. Test Subscription Flow
1. Sign up new user
2. Verify customer created in DodoPayments
3. Create checkout session
4. Complete payment
5. Verify webhook updates subscription
6. Check subscription active in dashboard

### 2. Test Usage Tracking
1. Use TTS feature
2. Verify usage incremented
3. Check limit enforcement
4. Verify prepaid consumption (if applicable)

### 3. Test Webhook
- Send test webhook from DodoPayments dashboard
- Verify subscription/payment updates correctly
- Check logs for errors

---

## 🔄 CI/CD Pipeline

### GitHub Actions Example
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy-edge-functions:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: supabase/setup-cli@v1
      - run: supabase functions deploy --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
  
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run build
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
```

---

## 🚨 Troubleshooting

### Edge Functions Not Working

1. **Function Not Found (404)**
   - Verify function is deployed: `supabase functions list`
   - Check function name matches URL
   - Verify project reference is correct

2. **Unauthorized (401)**
   - Check auth token is valid
   - Verify `verify_jwt` setting in config.toml
   - Check token expiration

3. **Webhook Signature Invalid**
   - Verify `DODO_WEBHOOK_SECRET` matches DodoPayments dashboard
   - Check webhook headers are correct
   - Verify DodoPayments SDK version

### Express Server Issues

1. **TTS Not Working**
   - Check server is running
   - Verify `/api/tts` endpoint is accessible
   - Check CORS configuration

2. **Static Files Not Serving**
   - Verify `dist` directory exists
   - Check Express static middleware configuration
   - Verify file permissions

### Database Issues

1. **RLS Policy Errors**
   - Verify service role key is set in Edge Functions
   - Check RLS policies allow service role access
   - Verify user permissions

2. **Missing Data**
   - Check webhook is processing correctly
   - Verify database schema matches migrations
   - Check Edge Function logs for errors

---

## 💰 Cost Estimation

### Monthly Costs (Approximate)

- **Supabase**: Free tier (good for most usage)
  - Edge Functions: Included in plan
  - Database: Included in plan
  - Storage: Included in plan
  
- **Express Server**: $5-20/month (Railway/Fly.io)
  - TTS functionality only
  
- **DodoPayments**: Transaction fees only
  
- **Frontend**: Free (Vercel/Netlify free tier)

**Total**: ~$5-20/month depending on server hosting

---

## 📈 Scaling Considerations

### Edge Functions
- Auto-scales with traffic
- No cold start issues for frequent endpoints
- Monitor execution times in Supabase Dashboard

### Database
- Supabase handles scaling automatically
- Monitor connection pool usage
- Consider read replicas for high traffic

### Express Server
- Scale horizontally if needed
- Consider load balancing for TTS
- Monitor CPU/memory usage

---

## 🔄 Rollback Plan

If issues arise:

1. **Rollback Edge Functions**
   - Deploy previous version: `supabase functions deploy [function-name] --version [version]`
   - Or disable function temporarily in Dashboard

2. **Rollback Webhook**
   - Point DodoPayments webhook back to Express server temporarily
   - Update Express server to handle webhooks again

3. **Rollback Frontend**
   - Deploy previous version from Vercel/Netlify dashboard
   - Or revert git commit and redeploy

---

## 📚 Additional Resources

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [DodoPayments Webhook Docs](https://docs.dodopayments.com)
- [Edge Functions Architecture](./EDGE_FUNCTIONS.md)

---

## 🎉 Deployment Checklist

- [ ] Deploy all Edge Functions to Supabase
- [ ] Set environment variables in Supabase Dashboard
- [ ] Configure DodoPayments webhook URL
- [ ] Deploy Express server (TTS)
- [ ] Deploy frontend
- [ ] Test subscription flow end-to-end
- [ ] Test webhook processing
- [ ] Monitor function logs
- [ ] Set up error alerts
- [ ] Update documentation

---

## 📝 Deployment Commands Summary

```bash
# 1. Deploy Edge Functions
supabase functions deploy subscriptions
supabase functions deploy products
supabase functions deploy dodo-webhook
supabase functions deploy increment-usage

# 2. Deploy Express Server (TTS)
railway up  # or fly deploy, or pm2 start

# 3. Deploy Frontend
vercel --prod  # or netlify deploy --prod

# 4. Verify
curl https://[project-ref].supabase.co/functions/v1/products
curl https://your-tts-server.com/health
```
