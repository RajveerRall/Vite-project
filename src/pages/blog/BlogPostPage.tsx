// src/pages/blog/BlogPostPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { getPostBySlug } from '../../services/strapi';

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
    return <div className="container mx-auto p-4">Loading...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-4 text-red-500">{error}</div>;
  }

  if (!post) {
    return <div className="container mx-auto p-4">Post not found.</div>;
  }

  // Ensure content is a string before passing to ReactMarkdown
  const content = typeof post.content === 'string' ? post.content : String(post.content || '');
  
  console.log('Content type:', typeof post.content);
  console.log('Content value:', post.content);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-2">{post.title}</h1>
      <p className="text-gray-600 mb-4">By {post.author} on {new Date(post.publishedAt).toLocaleDateString()}</p>
      <div className="prose">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  );
};

export default BlogPostPage;