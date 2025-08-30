// src/services/staticBlogService.ts
// This service serves pre-built static HTML files instead of making API calls

export async function getStaticTopicsList(): Promise<string> {
  try {
    const response = await fetch('/topics/index.html');
    if (!response.ok) {
      throw new Error(`Failed to fetch static topics list: ${response.status}`);
    }
    return await response.text();
  } catch (error) {
    console.error('Error fetching static topics list:', error);
    throw error;
  }
}

export async function getStaticTopicPage(topicSlug: string): Promise<string> {
  try {
    const response = await fetch(`/topics/${topicSlug}/index.html`);
    if (!response.ok) {
      throw new Error(`Failed to fetch static topic page: ${response.status}`);
    }
    return await response.text();
  } catch (error) {
    console.error('Error fetching static topic page:', error);
    throw error;
  }
}

export async function getStaticArticlePage(topicSlug: string, articleSlug: string): Promise<string> {
  try {
    const response = await fetch(`/topics/${topicSlug}/${articleSlug}/index.html`);
    if (!response.ok) {
      throw new Error(`Failed to fetch static article page: ${response.status}`);
    }
    return await response.text();
  } catch (error) {
    console.error('Error fetching static article page:', error);
    throw error;
  }
}

// Check if static pages are available
export async function checkStaticPagesAvailable(): Promise<boolean> {
  try {
    const response = await fetch('/topics/index.html');
    return response.ok;
  } catch {
    return false;
  }
}
