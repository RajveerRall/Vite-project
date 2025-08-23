// src/pages/blog/BlogListPage.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getPosts } from '../../services/strapi';

interface Post {
  attributes: {
    title: string;
    slug: string;
    excerpt: string;
    author: {
      data: {
        attributes: {
          name: string;
        };
      };
    };
  };
}

const BlogListPage: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const postsData = await getPosts();
        setPosts(postsData);
      } catch (err) {
        setError('Failed to fetch posts. Please check your Strapi configuration.');
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  if (loading) {
    return <div className="container mx-auto p-4">Loading...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-4 text-red-500">{error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Blog</h1>
      <div className="space-y-4">
        {posts.map(post => (
          <div key={post.attributes.slug} className="border-b pb-4">
            <h2 className="text-2xl font-semibold">
              <Link to={`/blog/${post.attributes.slug}`} className="text-blue-600 hover:underline">
                {post.attributes.title}
              </Link>
            </h2>
            <p className="text-gray-600">By {post.attributes.author.data.attributes.name}</p>
            <p className="mt-2">{post.attributes.excerpt}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BlogListPage;