// src/pages/blog/TopicListPage.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getTopics } from '../../services/strapi';
import SEO from '../../components/Common/SEO';
import Header from '../../components/Library/header';
import Footer from '../../components/Common/Footer';
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

const TopicListPage: React.FC = () => {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const topicsData = await getTopics();
        setTopics(topicsData || []);
      } catch (err) {
        setError('Failed to fetch topics. Please check your Strapi configuration.');
      } finally {
        setLoading(false);
      }
    };

    fetchTopics();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading topics...</p>
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
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO
        title="Topics - Vite Reader | Explore Articles by Topic"
        description="Discover articles organized by topics. Explore our collection of insights, stories, and knowledge across various subjects."
        keywords={['topics', 'articles', 'blog', 'knowledge', 'insights', 'learning']}
        type="website"
        url="https://yoread.com/topics"
      />
      <Header />
      <div className="min-h-screen bg-gray-50 pt-16">
        {/* Topics Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-6 py-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Topics</h1>
            <p className="text-xl text-gray-600 max-w-2xl">
              Explore our articles organized by topics. Find the content that matters most to you.
            </p>
          </div>
        </div>

        {/* Topics List */}
        <div className="max-w-4xl mx-auto px-6 py-12">
          {topics.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-gray-400 text-6xl mb-4">📚</div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">No topics yet</h2>
              <p className="text-gray-600">Check back soon for organized content!</p>
            </div>
          ) : (
            <div className="space-y-8">
              {topics.map((topic) => (
                <div 
                  key={topic.documentId} 
                  className="topic-card bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 overflow-hidden"
                >
                  <div className="p-8">
                    <div className="mb-4">
                      <span className="inline-block bg-green-50 text-green-700 text-sm font-medium px-3 py-1 rounded-full">
                        Topic
                      </span>
                    </div>
                    
                    <h2 className="text-2xl font-bold text-gray-900 mb-4 leading-tight">
                      <Link 
                        to={`/topics/${topic.slug}`} 
                        className="hover:text-blue-600 transition-colors duration-200"
                      >
                        {topic.name}
                      </Link>
                    </h2>
                    
                    {topic.description && (
                      <p className="text-gray-600 text-lg leading-relaxed mb-6">
                        {topic.description}
                      </p>
                    )}
                    
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-800 mb-3">
                        Articles ({topic.articles?.length || 0})
                      </h3>
                      {topic.articles && topic.articles.length > 0 ? (
                        <div className="space-y-3">
                          {topic.articles.slice(0, 3).map((article) => (
                            <div key={article.documentId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900">
                                  <Link 
                                    to={`/topics/${topic.slug}/${article.slug}`}
                                    className="hover:text-blue-600 transition-colors duration-200"
                                  >
                                    {article.title}
                                  </Link>
                                </h4>
                                <p className="text-sm text-gray-600 mt-1">{article.excerpt}</p>
                              </div>
                              <div className="text-sm text-gray-500 ml-4">
                                {new Date(article.publishedAt).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </div>
                            </div>
                          ))}
                          {topic.articles.length > 3 && (
                            <div className="text-center pt-2">
                              <span className="text-sm text-gray-500">
                                +{topic.articles.length - 3} more articles
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-500 italic">No articles in this topic yet.</p>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-500">
                        {topic.articles?.length || 0} articles
                      </div>
                      
                      <Link 
                        to={`/topics/${topic.slug}`}
                        className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200"
                      >
                        View all articles
                        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Footer */}
      <Footer />
    </>
  );
};

export default TopicListPage;
