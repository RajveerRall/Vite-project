// src/pages/blog/TopicPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getTopicBySlug } from '../../services/strapi';
import SEO from '../../components/Common/SEO';
import Header from '../../components/Library/header';
import './Blog.css';

interface Article {
  documentId: string;
  title: string;
  slug: string;
  excerpt: string;
  author: {
    documentId: string;
    username: string;
    email: string;
  };
  publishedAt: string;
}

interface Topic {
  documentId: string;
  name: string;
  slug: string;
  description: string;
  articles: Article[];
}

const TopicPage: React.FC = () => {
  const { topicSlug } = useParams<{ topicSlug: string }>();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTopic = async () => {
      if (!topicSlug) return;
      try {
        const topicData = await getTopicBySlug(topicSlug);
        setTopic(topicData);
      } catch (err) {
        setError('Failed to fetch topic. Please check your Strapi configuration.');
      } finally {
        setLoading(false);
      }
    };

    fetchTopic();
  }, [topicSlug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading topic...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-semibold text-gray-800 mb-2">Oops!</h1>
          <p className="text-gray-600">{error}</p>
          <Link 
            to="/topics" 
            className="inline-block mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            Back to Topics
          </Link>
        </div>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-gray-400 text-6xl mb-4">📚</div>
          <h1 className="text-2xl font-semibold text-gray-800 mb-2">Topic Not Found</h1>
          <p className="text-gray-600 mb-4">The requested topic could not be found.</p>
          <Link 
            to="/topics" 
            className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            Back to Topics
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO
        title={`${topic.name} - Vite Reader Topics`}
        description={topic.description || `Explore articles about ${topic.name}. Discover insights, stories, and knowledge on this topic.`}
        keywords={[topic.name.toLowerCase(), 'articles', 'blog', 'knowledge', 'insights']}
        type="website"
        url={`https://yoread.com/topics/${topic.slug}`}
      />
      <Header />
      <div className="min-h-screen bg-gray-50 pt-16">
        {/* Back Navigation */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <Link 
              to="/topics" 
              className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors duration-200"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Topics
            </Link>
          </div>
        </div>

        {/* Topic Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-6 py-12">
            <div className="mb-6">
              <span className="inline-block bg-green-50 text-green-700 text-sm font-medium px-3 py-1 rounded-full">
                Topic
              </span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
              {topic.name}
            </h1>
            
            {topic.description && (
              <p className="text-xl text-gray-600 max-w-3xl leading-relaxed">
                {topic.description}
              </p>
            )}
            
            <div className="mt-6 text-gray-600">
              <span className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                {topic.articles?.length || 0} articles
              </span>
            </div>
          </div>
        </div>

        {/* Articles List */}
        <div className="max-w-4xl mx-auto px-6 py-12">
          {!topic.articles || topic.articles.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-gray-400 text-6xl mb-4">📝</div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">No articles yet</h2>
              <p className="text-gray-600">Check back soon for content in this topic!</p>
            </div>
          ) : (
            <div className="space-y-8">
              {topic.articles.map((article, index) => (
                <article 
                  key={article.documentId} 
                  className="blog-card bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 overflow-hidden"
                >
                  <div className="p-8">
                    <div className="mb-4">
                      <span className="inline-block bg-blue-50 text-blue-700 text-sm font-medium px-3 py-1 rounded-full">
                        Article
                      </span>
                    </div>
                    
                    <h2 className="text-2xl font-bold text-gray-900 mb-4 leading-tight">
                      <Link 
                        to={`/topics/${topic.slug}/${article.slug}`} 
                        className="hover:text-blue-600 transition-colors duration-200"
                      >
                        {article.title}
                      </Link>
                    </h2>
                    
                    <p className="text-gray-600 text-lg leading-relaxed mb-6">
                      {article.excerpt}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                          </svg>
                          {article.author.username}
                        </span>
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                          </svg>
                          {new Date(article.publishedAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                      
                      <Link 
                        to={`/topics/${topic.slug}/${article.slug}`}
                        className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200"
                      >
                        Read more
                        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default TopicPage;
