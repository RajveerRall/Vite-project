import React from 'react';
import TableOfContents from './TableOfContents';
import CTAComponent from './CTAComponent';
import './BlogLayout.css';

interface BlogLayoutProps {
  children: React.ReactNode;
  content: string;
  ctaVariant?: 'primary' | 'secondary' | 'newsletter' | 'download';
  ctaTitle?: string;
  ctaDescription?: string;
  ctaButtonText?: string;
  ctaButtonLink?: string;
  showTOC?: boolean;
  showCTA?: boolean;
}

const BlogLayout: React.FC<BlogLayoutProps> = ({
  children,
  content,
  ctaVariant = 'primary',
  ctaTitle,
  ctaDescription,
  ctaButtonText,
  ctaButtonLink,
  showTOC = true,
  showCTA = true
}) => {
  console.log('BlogLayout received content:', content);
  
  return (
    <div className="blog-layout">
      <div className="blog-container">
        {/* Left Sidebar - Table of Contents */}
        {showTOC && (
          <aside className="blog-sidebar blog-sidebar-left">
            <TableOfContents content={content} />
          </aside>
        )}
        
        {/* Main Content Area */}
        <main className="blog-main-content">
          {children}
        </main>
        
        {/* Right Sidebar - CTA Component */}
        {showCTA && (
          <aside className="blog-sidebar blog-sidebar-right">
            <CTAComponent
              variant={ctaVariant}
              title={ctaTitle}
              description={ctaDescription}
              buttonText={ctaButtonText}
              buttonLink={ctaButtonLink}
            />
          </aside>
        )}
      </div>
    </div>
  );
};

export default BlogLayout;
