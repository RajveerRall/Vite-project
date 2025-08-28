# Strapi Integration for Topic-Based Blog Structure

This document outlines the implementation of a flexible and SEO-friendly URL structure for the YoRead blog system using Strapi as the headless CMS backend.

## Overview

The new system implements a topic-based blog structure with URLs like:
- `/topics` - List all topics
- `/topics/:topic_slug` - List articles within a specific topic
- `/topics/:topic_slug/:article_slug` - Individual article within a topic

This structure provides better SEO, content organization, and user navigation while maintaining backward compatibility with the existing `/blog` routes.

## Frontend Implementation

### New Components Created

1. **TopicListPage** (`src/pages/blog/TopicListPage.tsx`)
   - Displays all available topics with previews of their articles
   - Shows topic descriptions and article counts
   - Provides navigation to individual topics

2. **TopicPage** (`src/pages/blog/TopicPage.tsx`)
   - Lists all articles within a specific topic
   - Shows topic information and description
   - Provides navigation back to topics list

3. **TopicArticlePage** (`src/pages/blog/TopicArticlePage.tsx`)
   - Displays individual articles within topics
   - Includes breadcrumb navigation
   - Maintains all existing article features (reading time, word count, etc.)

### Updated Components

1. **BlogListPage** - Added "Browse by Topics" button
2. **Header** - Added "Topics" navigation link
3. **App.tsx** - Added new routing for topic-based structure

### New Strapi Service Functions

```typescript
// Get all topics with their articles
export async function getTopics()

// Get a specific topic by slug
export async function getTopicBySlug(topicSlug: string)

// Get an article by topic and article slugs
export async function getArticleByTopicAndSlug(topicSlug: string, articleSlug: string)

// Get all articles with their topic information
export async function getAllArticles()
```

## Strapi Backend Requirements

### Content Types

#### Topic Collection Type
- **name** (Text): The topic title
- **slug** (UID): Auto-generated from name, creates URL-friendly slugs
- **description** (Text): Optional description of the topic
- **articles** (Relation): One-to-many relationship with articles

#### Article Collection Type
- **title** (Text): Article title
- **slug** (UID): Auto-generated from title
- **content** (Rich Text): Article body content
- **excerpt** (Text): Short description/summary
- **author** (Text): Author name
- **publishedAt** (DateTime): Publication date
- **topic** (Relation): Belongs to one topic

### GraphQL Schema

The system expects the following GraphQL schema in Strapi:

```graphql
type Topic {
  id: ID!
  name: String!
  slug: String!
  description: String
  articles: [Article!]
}

type Article {
  id: ID!
  title: String!
  slug: String!
  content: String!
  excerpt: String
  author: String!
  publishedAt: DateTime!
  topic: Topic!
}
```

### Custom API Endpoint

Create a custom API in Strapi to handle the topic-based routing:

```bash
# Generate the custom API
yarn strapi generate:api custom-article
# or
npm run strapi generate:api custom-article
```

#### Route Configuration
```javascript
// src/api/custom-article/routes/custom-article.js
module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/topics/:topic_slug/:article_slug',
      handler: 'custom-article.findOne',
    },
  ],
};
```

#### Controller Implementation
```javascript
// src/api/custom-article/controllers/custom-article.js
'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::custom-article.custom-article', ({ strapi }) => ({
  async findOne(ctx) {
    const { topic_slug, article_slug } = ctx.params;

    const entity = await strapi.db.query('api::article.article').findOne({
      where: {
        slug: article_slug,
        topic: {
          slug: topic_slug,
        },
      },
      populate: ['topic'],
    });

    if (!entity) {
      return ctx.notFound('Article not found');
    }

    const sanitizedEntity = await this.sanitizeOutput(entity, ctx);
    return this.transformResponse(sanitizedEntity);
  },
}));
```

### Permissions

1. Go to Strapi Admin Panel → Settings → Roles → Public
2. Find "Custom-article" in the permissions list
3. Check the box for the `findOne` action
4. Save the changes

## URL Structure Examples

### Current Structure (Maintained for Backward Compatibility)
- `/blog` - Blog listing page
- `/blog/:slug` - Individual blog post

### New Topic-Based Structure
- `/topics` - Topics overview page
- `/topics/dyslexia` - Articles about dyslexia
- `/topics/dyslexia/how-to-read` - Specific article about reading with dyslexia
- `/topics/technology` - Articles about technology
- `/topics/technology/ai-writing` - Specific article about AI writing

## SEO Benefits

1. **Hierarchical URLs**: Clear content structure for search engines
2. **Topic Clustering**: Related content is grouped together
3. **Breadcrumb Navigation**: Improves user experience and SEO
4. **Structured Data**: Better content organization for search engines
5. **Internal Linking**: Natural linking between related content

## Migration Strategy

1. **Phase 1**: Implement new topic-based structure alongside existing blog
2. **Phase 2**: Gradually migrate existing blog posts to appropriate topics
3. **Phase 3**: Update internal links to use new structure
4. **Phase 4**: Set up 301 redirects from old URLs to new ones (if needed)

## Testing

### Frontend Testing
1. Navigate to `/topics` - Should display topics list
2. Click on a topic - Should navigate to `/topics/:topic_slug`
3. Click on an article - Should navigate to `/topics/:topic_slug/:article_slug`
4. Test breadcrumb navigation
5. Verify SEO metadata is properly set

### Backend Testing
1. Test GraphQL queries in Strapi GraphQL playground
2. Verify custom API endpoint returns correct data
3. Check permissions are properly set
4. Test with sample content

## Environment Variables

Ensure these environment variables are set in your `.env` file:

```env
VITE_STRAPI_API_URL=https://your-strapi-instance.com
VITE_STRAPI_API_TOKEN=your-api-token
```

## Troubleshooting

### Common Issues

1. **GraphQL Errors**: Check that the content types exist in Strapi
2. **Permission Errors**: Verify public role has access to custom-article API
3. **404 Errors**: Ensure slugs are properly generated and unique
4. **CORS Issues**: Check Strapi CORS configuration

### Debug Steps

1. Check browser console for GraphQL errors
2. Verify Strapi API responses in Network tab
3. Test GraphQL queries directly in Strapi admin
4. Check content type relationships are properly configured

## Future Enhancements

1. **Topic Categories**: Add sub-categories for better organization
2. **Related Articles**: Show related content within topics
3. **Topic Analytics**: Track topic popularity and engagement
4. **Content Syndication**: RSS feeds per topic
5. **Search Integration**: Topic-based search functionality

## Support

For issues or questions about this implementation:
1. Check the Strapi documentation
2. Review the GraphQL schema in Strapi admin
3. Verify content type configurations
4. Test API endpoints directly

---

*This implementation provides a solid foundation for a scalable, SEO-friendly blog system while maintaining backward compatibility with existing content.*
