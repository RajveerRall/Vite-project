// src/pages/blog/BlogPostPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { getPostBySlug } from '../../services/strapi';

interface Post {
  attributes: {
    title: string;
    content: string;
    author: {
      data: {
        attributes: {
          name: string;
        };
      };
    };
  };
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
        setPost(postData);
      } catch (err) {
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

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-2">{post.attributes.title}</h1>
      <p className="text-gray-600 mb-4">By {post.attributes.author.data.attributes.name}</p>
      <div className="prose">
        <ReactMarkdown>{post.attributes.content}</ReactMarkdown>
      </div>
    </div>
  );
};

export default BlogPostPage;