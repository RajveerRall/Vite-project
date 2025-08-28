// src/services/strapi.ts
const STRAPI_API_URL = import.meta.env.VITE_STRAPI_API_URL;
const STRAPI_API_TOKEN = import.meta.env.VITE_STRAPI_API_TOKEN;

if (!STRAPI_API_URL || !STRAPI_API_TOKEN) {
  console.error("Strapi API URL or Token is missing. Please check your .env file.");
}

async function fetchAPI(query: string, { variables }: { variables?: Record<string, any> } = {}) {
  const url = `${STRAPI_API_URL}/graphql`;
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${STRAPI_API_TOKEN}`,
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  };

  try {
    const res = await fetch(url, options);
    const json = await res.json();

    if (json.errors) {
      console.error('Strapi API Error:', JSON.stringify(json.errors, null, 2));
      throw new Error('Failed to fetch API from Strapi');
    }

    // The actual data is always inside the 'data' property of the GraphQL response.
    return json.data;
  } catch (error) {
    console.error('Network error fetching from Strapi:', error);
    throw new Error('Network error fetching API from Strapi');
  }
}

export async function getPosts() {
  const data = await fetchAPI(`
    query GetBlogPosts {
      blogPosts {
        documentId
        title
        slug
        excerpt
        author
        publishedAt
      }
    }
  `);
  // fetchAPI now returns the correct data object, so data.blogPosts is the array.
  return data.blogPosts;
}

export async function getPostBySlug(slug: string) {
  const data = await fetchAPI(
    `
    query GetBlogPostBySlug($slug: String!) {
      blogPosts(filters: { slug: { eq: $slug } }) {
        documentId
        title
        slug
        content
        author
        publishedAt
      }
    }
  `,
    {
      variables: {
        slug,
      },
    }
  );
  
  console.log('Raw Strapi response for slug:', slug, data);
  
  // The result is an array, and we want the first item.
  const post = data.blogPosts[0];
  console.log('Individual post data:', post);
  
  return post;
}

// New functions for topic-based blog structure
export async function getTopics() {
  const data = await fetchAPI(`
    query GetTopics {
      topics {
        documentId
        name
        slug
        description
        articles {
          documentId
          title
          slug
          excerpt
          author {
            documentId
            username
            email
          }
          publishedAt
        }
      }
    }
  `);
  return data.topics;
}

export async function getTopicBySlug(topicSlug: string) {
  const data = await fetchAPI(
    `
    query GetTopicBySlug($topicSlug: String!) {
      topics(filters: { slug: { eq: $topicSlug } }) {
        documentId
        name
        slug
        description
        articles {
          documentId
          title
          slug
          excerpt
          author {
            documentId
            username
            email
          }
          publishedAt
        }
      }
    }
  `,
    {
      variables: {
        topicSlug,
      },
    }
  );
  
  return data.topics[0];
}

export async function getArticleByTopicAndSlug(topicSlug: string, articleSlug: string) {
  const data = await fetchAPI(
    `
    query GetArticleByTopicAndSlug($topicSlug: String!, $articleSlug: String!) {
      articles(filters: { 
        slug: { eq: $articleSlug },
        topic: { slug: { eq: $topicSlug } }
      }) {
        documentId
        title
        slug
        content
        excerpt
        author {
          documentId
          username
          email
        }
        publishedAt
        topic {
          documentId
          name
          slug
          description
        }
      }
    }
  `,
    {
      variables: {
        topicSlug,
        articleSlug,
      },
    }
  );
  
  return data.articles[0];
}

export async function getAllArticles() {
  const data = await fetchAPI(`
    query GetAllArticles {
      articles {
        documentId
        title
        slug
        excerpt
        author {
          documentId
          username
          email
        }
        publishedAt
        topic {
          documentId
          name
          slug
        }
      }
    }
  `);
  return data.articles;
}
