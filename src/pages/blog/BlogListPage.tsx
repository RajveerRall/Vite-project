// src/pages/blog/BlogListPage.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getPosts } from '../../services/strapi';
import SEO from '../../components/Common/SEO';
import Header from '../../components/Library/header';
import Footer from '../../components/Common/Footer';
import './Blog.css';

interface Post {
  documentId: string;
  title: string;
  slug: string;
  excerpt: string;
  author: string;
  published: string;
}

const BlogListPage: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const postsData = await getPosts();
        console.log('🔍 Fetched posts data:', postsData);
        console.log('🔍 Posts array:', postsData?.map((post: Post) => ({
          title: post.title,
          slug: post.slug,
          author: post.author
        })));
        setPosts(postsData || []);
      } catch (err) {
        console.error('Error fetching posts:', err);
        setError('Failed to fetch posts. Please check your Strapi configuration.');
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading blog posts...</p>
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
        title="Blog - Vite Reader | Thoughts, Insights & Stories"
        description="Discover our collection of articles, insights, and stories. Explore topics ranging from technology to literature, written by our community of authors."
        keywords={['blog', 'articles', 'insights', 'stories', 'reading', 'literature', 'technology']}
        type="blog"
        url="https://yoread.com/blog"
      />
      <Header />
      <div className="min-h-screen bg-gray-50 pt-16">
        {/* Blog Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-6 py-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Blog</h1>
            <p className="text-xl text-gray-600 max-w-2xl">
              Thoughts, insights, and stories worth sharing. Dive into our collection of articles and discover something new.
            </p>
          </div>
        </div>

        {/* Blog Posts */}
        <div className="max-w-4xl mx-auto px-6 py-12">
          {posts.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-gray-400 text-6xl mb-4">📝</div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">No posts yet</h2>
              <p className="text-gray-600">Check back soon for new content!</p>
            </div>
          ) : (
            <div className="space-y-8">
              {posts.map((post, index) => (
                <article 
                  key={index} 
                  className="blog-card bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 overflow-hidden"
                >
                  <div className="p-8">
                    <div className="mb-4">
                      <span className="inline-block bg-blue-50 text-blue-700 text-sm font-medium px-3 py-1 rounded-full">
                        Blog Post
                      </span>
                    </div>
                    
                    <h2 className="text-2xl font-bold text-gray-900 mb-4 leading-tight">
                      <Link 
                        to={`/blog/${post.slug}`} 
                        className="hover:text-blue-600 transition-colors duration-200"
                      >
                        {post.title}
                      </Link>
                    </h2>
                    
                    <p className="text-gray-600 text-lg leading-relaxed mb-6">
                      {post.excerpt}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                          </svg>
                          {post.author}
                        </span>
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                          </svg>
                          {new Date(post.published).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                      
                      <Link 
                        to={`/blog/${post.slug}`}
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
      
      {/* Footer */}
      <Footer />
    </>
  );
};

export default BlogListPage;