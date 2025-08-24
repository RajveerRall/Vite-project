// src/pages/blog/BlogPostPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { getPostBySlug } from '../../services/strapi';
import SEO from '../../components/Common/SEO';
import Header from '../../components/Library/header';
import { 
  calculateReadingTime, 
  calculateWordCount, 
  extractKeywords, 
  generateMetaDescription,
  generateOGImageUrl,
  generateCanonicalUrl,
  extractTags
} from '../../utils/blogUtils';
import './Blog.css';

interface Post {
  title: string;
  slug: string;
  content: string;
  author: string;
  publishedAt: string;
}

const BlogPostPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPost = async () => {
      if (!slug) return;
      try {
        const postData = await getPostBySlug(slug);
        console.log('Fetched post data:', postData);
        setPost(postData);
      } catch (err) {
        console.error('Error fetching post:', err);
        setError('Failed to fetch post. Please check your Strapi configuration.');
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading post...</p>
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
            to="/blog" 
            className="inline-block mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            Back to Blog
          </Link>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-gray-400 text-6xl mb-4">📄</div>
          <h1 className="text-2xl font-semibold text-gray-800 mb-2">Post Not Found</h1>
          <p className="text-gray-600 mb-4">The requested blog post could not be found or is not available.</p>
          <Link 
            to="/blog" 
            className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            Back to Blog
          </Link>
        </div>
      </div>
    );
  }

  // Ensure content is a string before passing to ReactMarkdown
  const content = typeof post.content === 'string' ? post.content : String(post.content || '');
  
  // Calculate SEO metrics
  const readingTime = calculateReadingTime(content);
  const wordCount = calculateWordCount(content);
  const keywords = extractKeywords(content);
  const tags = extractTags(content);
  const metaDescription = generateMetaDescription(content);
  const ogImage = generateOGImageUrl(post.title, post.author);
  const canonicalUrl = generateCanonicalUrl(post.slug);
  
  console.log('Content type:', typeof post.content);
  console.log('Content value:', post.content);

  return (
    <>
      <SEO
        title={`${post.title} - Vite Reader Blog`}
        description={metaDescription}
        keywords={keywords}
        author={post.author}
        publishedAt={post.publishedAt}
        updatedAt={post.publishedAt} // You can add updatedAt field to your Strapi content type
        image={ogImage}
        url={canonicalUrl}
        type="article"
        section="Blog"
        tags={tags}
        readingTime={readingTime}
        wordCount={wordCount}
      />
      <Header />
      <div className="min-h-screen bg-gray-50 pt-16">
        {/* Back Navigation */}
        <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <Link 
            to="/blog" 
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors duration-200"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Blog
          </Link>
        </div>
      </div>

      {/* Article Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="mb-6">
            <span className="inline-block bg-blue-50 text-blue-700 text-sm font-medium px-3 py-1 rounded-full">
              Blog Post
            </span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
            {post.title || 'Untitled'}
          </h1>
          
          <div className="flex items-center space-x-6 text-gray-600">
            <span className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
              {post.author || 'Unknown Author'}
            </span>
            <span className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
              {new Date(post.publishedAt || Date.now()).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
            {readingTime > 0 && (
              <span className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                {readingTime} min read
              </span>
            )}
            {wordCount > 0 && (
              <span className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                {wordCount.toLocaleString()} words
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Article Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <article className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 md:p-12">
          <div className="blog-prose">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        </article>
      </div>

      {/* Footer Navigation */}
      <div className="bg-white border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <Link 
              to="/blog" 
              className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors duration-200"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Blog
            </Link>
            
            <div className="text-sm text-gray-500">
              Enjoyed this post? Share it with others!
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default BlogPostPage;