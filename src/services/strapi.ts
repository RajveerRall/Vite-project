// src/services/strapi.ts
const STRAPI_API_URL = import.meta.env.VITE_STRAPI_API_URL;
const STRAPI_API_TOKEN = import.meta.env.VITE_STRAPI_API_TOKEN;

if (!STRAPI_API_URL || !STRAPI_API_TOKEN) {
  console.error("Strapi API URL or Token is missing. Please check your .env file.");
}

async function fetchAPI(query: string, { variables }: { variables?: Record<string, any> } = {}) {
  const res = await fetch(`${STRAPI_API_URL}/graphql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${STRAPI_API_TOKEN}`,
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  const json = await res.json();
  if (json.errors) {
    console.error(json.errors);
    throw new Error('Failed to fetch API');
  }

  return json.data;
}

export async function getPosts() {
  const data = await fetchAPI(`
    query {
      blogPosts {
        data {
          attributes {
            title
            slug
            excerpt
            author {
              data {
                attributes {
                  name
                }
              }
            }
          }
        }
      }
    }
  `);
  return data.blogPosts.data;
}

export async function getPostBySlug(slug: string) {
  const data = await fetchAPI(
    `
    query PostBySlug($slug: String!) {
      blogPosts(filters: { slug: { eq: $slug } }) {
        data {
          attributes {
            title
            content
            author {
              data {
                attributes {
                  name
                }
              }
            }
          }
        }
      }
    }
  `,
    {
      variables: {
        slug,
      },
    }
  );
  return data.blogPosts.data[0];
}
