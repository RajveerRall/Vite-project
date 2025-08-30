// src/pages/blog/StaticTopicsPage.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../../components/Common/SEO';
import Header from '../../components/Library/header';
import Footer from '../../components/Common/Footer';
import StaticBlogRenderer from '../../components/Blog/StaticBlogRenderer';
import './Blog.css';

const StaticTopicsPage: React.FC = () => {
  return (
    <>
      <SEO
        title="Topics - Vite Reader | Explore Articles by Topic"
        description="Discover articles organized by topics. Explore our collection of insights, stories, and knowledge across various subjects."
        keywords="topics, articles, blog, knowledge, insights, learning"
        canonicalUrl="https://yoread.com/topics"
      />
      <Header />
      <main className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <StaticBlogRenderer 
            type="topics-list" 
            fallbackToAPI={true}
          />
        </div>
      </main>
      <Footer />
    </>
  );
};

export default StaticTopicsPage;
