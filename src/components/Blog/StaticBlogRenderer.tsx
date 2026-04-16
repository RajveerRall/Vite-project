// src/components/Blog/StaticBlogRenderer.tsx
import React, { useState, useEffect } from 'react';
import { getStaticTopicsList, getStaticTopicPage, getStaticArticlePage, checkStaticPagesAvailable } from '../../services/staticBlogService';
import { getTopics, getTopicBySlug, getArticleByTopicAndSlug } from '../../services/strapi';

interface StaticBlogRendererProps {
  type: 'topics-list' | 'topic' | 'article';
  topicSlug?: string;
  articleSlug?: string;
  fallbackToAPI?: boolean;
}

const StaticBlogRenderer: React.FC<StaticBlogRendererProps> = ({ 
  type, 
  topicSlug, 
  articleSlug, 
  fallbackToAPI = true 
}) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingStatic, setUsingStatic] = useState(false);

  useEffect(() => {
    const loadContent = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check if static pages are available
        const staticAvailable = await checkStaticPagesAvailable();
        
        if (staticAvailable) {
          try {
            let staticContent: string;
            
            switch (type) {
              case 'topics-list':
                staticContent = await getStaticTopicsList();
                break;
              case 'topic':
                if (!topicSlug) throw new Error('Topic slug required');
                staticContent = await getStaticTopicPage(topicSlug);
                break;
              case 'article':
                if (!topicSlug || !articleSlug) throw new Error('Topic and article slugs required');
                staticContent = await getStaticArticlePage(topicSlug, articleSlug);
                break;
              default:
                throw new Error('Invalid type');
            }
            
            setContent(staticContent);
            setUsingStatic(true);
            return;
          } catch (staticError) {
            console.warn('Static page fetch failed, falling back to API:', staticError);
          }
        }

        // Fallback to API if static pages not available or failed
        if (fallbackToAPI) {
          let apiData: any;
          
          switch (type) {
            case 'topics-list':
              apiData = await getTopics();
              // Convert API data to HTML (you can customize this)
              setContent(`
                <div class="bg-white rounded-lg shadow-md p-6">
                  <h1 class="text-2xl font-bold mb-4">Topics</h1>
                  <div class="space-y-4">
                    ${apiData.map((topic: any) => `
                      <div class="border-b pb-2">
                        <h2 class="text-lg font-semibold">${topic.name}</h2>
                        ${topic.description ? `<p class="text-gray-600">${topic.description}</p>` : ''}
                      </div>
                    `).join('')}
                  </div>
                </div>
              `);
              break;
              
            case 'topic':
              if (!topicSlug) throw new Error('Topic slug required');
              apiData = await getTopicBySlug(topicSlug);
              // Convert API data to HTML
              setContent(`
                <div class="bg-white rounded-lg shadow-md p-6">
                  <h1 class="text-2xl font-bold mb-4">${apiData.name}</h1>
                  ${apiData.description ? `<p class="text-gray-600 mb-4">${apiData.description}</p>` : ''}
                  <div class="space-y-4">
                    ${apiData.articles?.map((article: any) => `
                      <div class="border-b pb-2">
                        <h3 class="text-lg font-semibold">${article.title}</h3>
                        ${article.excerpt ? `<p class="text-gray-600">${article.excerpt}</p>` : ''}
                      </div>
                    `).join('') || '<p>No articles found.</p>'}
                  </div>
                </div>
              `);
              break;
              
            case 'article':
              if (!topicSlug || !articleSlug) throw new Error('Topic and article slugs required');
              apiData = await getArticleByTopicAndSlug(topicSlug, articleSlug);
              // Convert API data to HTML
              setContent(`
                <div class="bg-white rounded-lg shadow-md p-6">
                  <h1 class="text-2xl font-bold mb-4">${apiData.title}</h1>
                  <div class="text-gray-600 mb-4">
                    <span>By: ${apiData.author?.username || apiData.author || 'Unknown'}</span>
                    <span class="mx-2">•</span>
                    <span>${new Date(apiData.publishedAt).toLocaleDateString()}</span>
                  </div>
                  <div class="prose max-w-none">
                    ${apiData.content || apiData.excerpt || 'Content not available'}
                  </div>
                </div>
              `);
              break;
          }
          
          setUsingStatic(false);
        } else {
          throw new Error('Static pages not available and API fallback disabled');
        }
        
      } catch (err) {
        console.error('Error loading content:', err);
        setError(err instanceof Error ? err.message : 'Failed to load content');
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, [type, topicSlug, articleSlug, fallbackToAPI]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="static-blog-content">
      {usingStatic && (
        <div className="mb-4 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
          📄 Serving static HTML (fastest)
        </div>
      )}
      <div 
        dangerouslySetInnerHTML={{ __html: content }}
        className="prose max-w-none"
      />
    </div>
  );
};

export default StaticBlogRenderer;
