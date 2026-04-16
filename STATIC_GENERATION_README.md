# Static Generation for Blog Pages

This document explains how to use the static generation system to pre-build your Strapi blog pages as HTML files during the build process.

## Overview

Instead of fetching blog content dynamically at runtime, the static generation system:
- Fetches all blog content from Strapi during build time
- Generates static HTML files for topics and articles
- Creates a proper sitemap for SEO
- Improves performance and reduces API dependency

## How It Works

### 1. **Build Process Integration**
The static generation is automatically integrated into your build process:
```bash
npm run build
```
This command now runs:
1. `npm run preprocess` - Preprocesses books
2. `npm run generate-static` - Generates static blog pages
3. `tsc` - TypeScript compilation
4. `vite build` - Vite build process

### 2. **Generated File Structure**
After building, you'll have this structure in your `dist` folder:
```
dist/
├── topics/
│   ├── index.html                    # Topics list page
│   ├── topic-1/
│   │   ├── index.html               # Individual topic page
│   │   └── article-1/
│   │       └── index.html           # Individual article page
│   └── topic-2/
│       ├── index.html
│       └── article-2/
│           └── index.html
├── sitemap-topics.xml               # SEO sitemap
└── [other build files...]
```

### 3. **URL Structure**
The generated pages follow this URL pattern:
- `/topics` - List all topics
- `/topics/:topic-slug` - List articles in a topic
- `/topics/:topic-slug/:article-slug` - Individual article

## Configuration

### Environment Variables
Make sure these are set in your `.env` file:
```bash
VITE_STRAPI_API_URL=http://localhost:1337
VITE_STRAPI_API_TOKEN=your-strapi-api-token-here
```

### Strapi Content Types
Your Strapi backend should have these content types:

#### Topic Collection Type
- `name` (Text) - Topic title
- `slug` (UID) - URL-friendly slug
- `description` (Text) - Topic description
- `articles` (Relation) - One-to-many with articles

#### Article Collection Type
- `title` (Text) - Article title
- `slug` (UID) - URL-friendly slug
- `content` (Rich Text) - Article body
- `excerpt` (Text) - Short description
- `author` (Text) - Author name
- `publishedAt` (DateTime) - Publication date
- `topic` (Relation) - Belongs to one topic
- `faqs` (JSON) - Optional FAQ data

## Usage

### Generate Static Pages Only
```bash
npm run generate-static
```

### Build with Static Generation
```bash
npm run build
```

### Test Static Generation
```bash
npm run test-static
```

## Features

### 1. **Responsive Design**
- Uses Tailwind CSS for modern, responsive layouts
- Mobile-friendly design
- Consistent styling across all pages

### 2. **SEO Optimization**
- Proper meta tags and Open Graph data
- Canonical URLs
- Structured data for better search engine understanding
- XML sitemap generation

### 3. **Content Features**
- Reading time estimation
- Word count display
- Author information
- Publication dates
- FAQ sections (if available)
- Breadcrumb navigation

### 4. **Performance**
- Pre-built HTML files
- No runtime API calls
- Fast page loads
- Better Core Web Vitals

## Customization

### Styling
The generated HTML uses Tailwind CSS via CDN. You can customize the styling by:
1. Modifying the HTML templates in `scripts/generate-static-pages.mjs`
2. Adding custom CSS classes
3. Replacing Tailwind with your own CSS framework

### Content Structure
To modify the content structure:
1. Edit the GraphQL queries in the script
2. Update the HTML generation functions
3. Modify the file output structure

### Metadata
Customize SEO metadata by editing the meta tag generation in each HTML template function.

## Troubleshooting

### Common Issues

#### 1. **Missing Environment Variables**
```
❌ VITE_STRAPI_API_TOKEN environment variable is required
```
**Solution**: Set the required environment variables in your `.env` file.

#### 2. **Strapi API Errors**
```
❌ Strapi API error: 401
```
**Solution**: Check your API token and ensure Strapi is running.

#### 3. **Build Failures**
```
❌ Error generating static pages
```
**Solution**: 
- Check Strapi connection
- Verify content types exist
- Check console for specific error messages

### Debugging

#### Test Static Generation
```bash
npm run test-static
```
This will show you exactly what files were generated and help identify issues.

#### Check Generated Files
```bash
ls -la dist/topics/
```
Verify that the expected HTML files exist.

#### View Build Logs
The build process provides detailed logging. Look for:
- ✅ Success messages
- ❌ Error messages
- 📁 File generation counts

## Deployment

### Static Hosting
The generated HTML files can be deployed to any static hosting service:
- Netlify
- Vercel
- GitHub Pages
- AWS S3 + CloudFront
- Any traditional web hosting

### Server Configuration
Ensure your server is configured to:
1. Serve static files from the `dist` directory
2. Handle the `/topics/*` routes properly
3. Serve `index.html` files for directory requests

### URL Rewriting
For clean URLs, configure your server to rewrite:
- `/topics` → `/topics/index.html`
- `/topics/:topic` → `/topics/:topic/index.html`
- `/topics/:topic/:article` → `/topics/:topic/:article/index.html`

## Benefits

### 1. **Performance**
- Instant page loads
- No API latency
- Better Core Web Vitals scores

### 2. **SEO**
- Faster indexing
- Better search engine crawling
- Improved page speed metrics

### 3. **Reliability**
- No dependency on Strapi API at runtime
- Consistent user experience
- Better uptime

### 4. **Scalability**
- Can handle high traffic without API limits
- Reduced server load
- Better caching opportunities

## Future Enhancements

### Potential Improvements
1. **Incremental Generation**: Only regenerate changed content
2. **Image Optimization**: Automatically optimize and resize images
3. **Search Functionality**: Add client-side search to static pages
4. **Comments System**: Integrate with external commenting service
5. **Analytics**: Add analytics tracking to static pages

### Advanced Features
1. **Multi-language Support**: Generate pages in multiple languages
2. **AMP Pages**: Generate AMP versions for mobile
3. **RSS Feeds**: Generate RSS feeds for topics and articles
4. **Social Media Cards**: Enhanced Open Graph and Twitter Card support

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Run `npm run test-static` to diagnose problems
3. Check the build logs for specific error messages
4. Verify your Strapi configuration and content types
