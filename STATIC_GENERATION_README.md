# Static Site Generation (SSG) for Topics and Articles

This document explains how to use the Static Site Generation system for your Vite Reader application to improve SEO performance for topics and articles.

## 🚀 Overview

The SSG system automatically generates static HTML files for all your topics and articles from Strapi CMS, providing:

- **Instant page loads** - Static HTML served directly
- **Better SEO** - Search engines see full content immediately
- **Improved Core Web Vitals** scores
- **Automatic sitemap generation**
- **Perfect for analytics and tracking**

## 📁 Files Created

- `scripts/generate-static-pages.mjs` - Main generation script
- `scripts/strapi-webhook.mjs` - Webhook handler for auto-regeneration
- `dist/static-pages/` - Output directory for generated HTML files

## ⚙️ Setup

### 1. Environment Variables

Add these to your `.env` file:

```bash
# Strapi CMS Configuration
VITE_STRAPI_API_URL=http://localhost:1337
VITE_STRAPI_API_TOKEN=your-strapi-api-token-here
```

### 2. Get Strapi API Token

1. Go to your Strapi admin panel
2. Navigate to **Settings** → **API Tokens**
3. Create a new token with **Full access** permissions
4. Copy the token to your `.env` file

## 🛠️ Usage

### Manual Generation

Generate static pages manually:

```bash
npm run generate-static
```

### Build with Static Pages

Build your app and generate static pages in one command:

```bash
npm run build-with-static
```

### Webhook Integration

Regenerate static pages via webhook (for automation):

```bash
node scripts/strapi-webhook.mjs regenerate
```

## 📊 Generated Output

The script generates:

- **Topics list page**: `/topics/index.html`
- **Individual topic pages**: `/topics/{topic-slug}/index.html`
- **Article pages**: `/topics/{topic-slug}/{article-slug}/index.html`
- **Sitemap**: `sitemap-topics.xml`

### Example Structure

```
dist/static-pages/
├── topics/
│   ├── index.html                    # Topics list
│   ├── technology/
│   │   ├── index.html               # Technology topic page
│   │   ├── ai-revolution/
│   │   │   └── index.html          # AI article page
│   │   └── blockchain-basics/
│   │       └── index.html          # Blockchain article page
│   └── science/
│       ├── index.html               # Science topic page
│       └── quantum-physics/
│           └── index.html          # Quantum physics article page
└── sitemap-topics.xml               # XML sitemap
```

## 🔄 Automation with Strapi Webhooks

### 1. Configure Strapi Webhook

In your Strapi admin panel:

1. Go to **Settings** → **Webhooks**
2. Create a new webhook:
   - **Name**: `Static Page Regeneration`
   - **URL**: `https://your-domain.com/webhook/regenerate` (or local endpoint)
   - **Events**: Select all content-related events
   - **HTTP Headers**: Add any authentication if needed

### 2. Set up Webhook Endpoint

You can set up a simple endpoint in your server to handle the webhook:

```javascript
// In your server.cjs or similar
app.post('/webhook/regenerate', async (req, res) => {
  try {
    const { exec } = require('child_process');
    exec('node scripts/strapi-webhook.mjs regenerate', (error, stdout, stderr) => {
      if (error) {
        console.error('Webhook execution error:', error);
        return res.status(500).json({ error: 'Regeneration failed' });
      }
      console.log('Webhook executed successfully:', stdout);
      res.json({ success: true, message: 'Static pages regenerated' });
    });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook failed' });
  }
});
```

## 🎯 SEO Features

Each generated page includes:

- **Meta tags** for title, description, and keywords
- **Open Graph tags** for social media sharing
- **Canonical URLs** to prevent duplicate content
- **Structured data** for search engines including FAQ Schema.org markup
- **XML sitemap** with proper priorities and change frequencies
- **FAQ sections** with proper Schema.org markup for rich snippets

## 🚨 Troubleshooting

### Common Issues

1. **Missing API Token**
   ```
   ❌ VITE_STRAPI_API_TOKEN environment variable is required
   ```
   **Solution**: Add the token to your `.env` file

2. **Strapi Connection Error**
   ```
   ❌ Strapi API error: 401
   ```
   **Solution**: Check your API token and Strapi URL

3. **Permission Denied**
   ```
   ❌ Error: EACCES: permission denied
   ```
   **Solution**: Ensure the script has write permissions to the dist directory

### Debug Mode

Add more verbose logging by modifying the script:

```javascript
// Add this to the fetchFromStrapi function
console.log('GraphQL Query:', query);
console.log('Response:', JSON.stringify(data, null, 2));
```

## 📈 Performance Benefits

- **Page Load Speed**: 2-5x faster than dynamic rendering
- **SEO Score**: Improved search engine rankings
- **User Experience**: Instant content display
- **Server Load**: Reduced backend requests
- **CDN Compatibility**: Perfect for content delivery networks

## 🔮 Future Enhancements

Potential improvements:

- **Incremental generation** - Only regenerate changed content
- **Image optimization** - Automatic WebP conversion
- **CSS inlining** - Critical CSS for above-the-fold content
- **Service worker** - Offline support for static content
- **Analytics integration** - Track static page performance

## 📞 Support

If you encounter issues:

1. Check the console output for error messages
2. Verify your Strapi configuration
3. Ensure all environment variables are set
4. Check file permissions in the dist directory

## 📚 Related Documentation

- [Strapi GraphQL API](https://docs.strapi.io/dev-docs/api/graphql)
- [Static Site Generation Best Practices](https://www.gatsbyjs.com/docs/static-site-generation/)
- [SEO Meta Tags Guide](https://moz.com/blog/meta-tags-101)
- [XML Sitemap Specification](https://www.sitemaps.org/protocol.html)
