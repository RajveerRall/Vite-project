import React from 'react';
import SEO from '../components/Common/SEO';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <SEO title="Privacy Policy" description="YoRead Privacy Policy" />
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-6">Privacy Policy</h1>

      <p className="text-gray-600 mb-6">Last updated: {new Date().toLocaleDateString()}</p>

      <div className="prose prose-gray max-w-none">
        <p>
          Your privacy is important to us. This Privacy Policy explains how YoRead ("we", "us", or "our") collects, uses, and protects your information when you use our ebook reader and text-to-speech application.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">1. Information We Collect</h2>
        
        <h3 className="text-lg font-medium text-gray-900 mt-4 mb-2">1.1 Information You Provide</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Account Information:</strong> When you sign in using Google, we collect your email address and basic profile information to create and authenticate your account.</li>
          <li><strong>User Content:</strong> We store the EPUB files, book metadata, and reading progress (bookmarks, highlights, current page) that you upload or generate to sync them across your devices.</li>
          <li><strong>Support Communications:</strong> Information you provide when contacting support.</li>
        </ul>

        <h3 className="text-lg font-medium text-gray-900 mt-4 mb-2">1.2 Automatically Collected Information</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Usage Data:</strong> We collect data on how you interact with the app, such as reading time, features used (e.g., Text-to-Speech), and navigation paths.</li>
          <li><strong>Device Information:</strong> We may collect information about your device, including browser type, operating system, and screen size, to optimize your reading experience.</li>
          <li><strong>Analytics:</strong> We use third-party analytics tools (including PostHog, Amplitude, and Google Analytics) to understand app performance and user behavior.</li>
        </ul>

        <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">2. How We Use Your Information</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>To Provide the Service:</strong> Syncing your books and progress across devices via our backend.</li>
          <li><strong>Text-to-Speech (TTS) Processing:</strong> To convert text to audio, small segments of text from your books are temporarily sent to our TTS providers. This data is processed ephemerally and is not permanently stored by the TTS provider.</li>
          <li><strong>Service Improvement:</strong> Analyzing usage patterns to fix bugs and improve app performance.</li>
          <li><strong>Account Management:</strong> Managing your subscription, usage limits, and billing status.</li>
        </ul>

        <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">3. Data Sharing and Third Parties</h2>
        <p className="mb-4">We do not sell your personal data. We share data only with trusted service providers necessary to operate the app:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Supabase:</strong> For secure database hosting and authentication services.</li>
          <li><strong>TTS Providers:</strong> For generating audio from text.</li>
          <li><strong>Analytics Providers:</strong> Google, PostHog, and Amplitude for usage analysis.</li>
          <li><strong>Payment Processors:</strong> If you subscribe to a paid plan, payment details are processed securely by our payment provider and are not stored on our servers.</li>
        </ul>

        <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">4. Data Retention and Deletion</h2>
        <p className="mb-4">
          We retain your data as long as your YoRead account is active. You have the right to request the deletion of your account and all associated personal data at any time.
        </p>
        <h3 className="text-lg font-medium text-gray-900 mt-4 mb-2">How to Request Account Deletion:</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Via Email:</strong> You can send an email to our support team at <a href="mailto:rajveer@yoread.com" className="text-blue-600 hover:underline">rajveer@yoread.com</a>. Please include "Account Deletion Request" in the subject line and provide your registered email address for verification.</li>
          <li><strong>In-App (Coming Soon):</strong> We are working on providing an in-app option for direct account deletion. Please check back for updates.</li>
        </ul>
        <h3 className="text-lg font-medium text-gray-900 mt-4 mb-2">What Data is Deleted:</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>User Account Information:</strong> Your email address and basic profile data used for authentication.</li>
          <li><strong>Uploaded Content:</strong> All EPUB files you have uploaded to YoRead.</li>
          <li><strong>Reading Progress Data:</strong> Your bookmarks, highlights, current page, and other reading session data associated with your books.</li>
          <li><strong>Text-to-Speech (TTS) Usage Records:</strong> Individual usage records for TTS minutes.</li>
        </ul>
        <h3 className="text-lg font-medium text-gray-900 mt-4 mb-2">What Data May Be Retained:</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Anonymized Analytics Data:</strong> We may retain anonymized usage data for service improvement, which cannot be linked back to you.</li>
          <li><strong>Legal & Financial Records:</strong> Data necessary to comply with legal obligations (e.g., tax or billing records for past subscriptions) may be retained for a period required by law, typically 7 years, before permanent deletion.</li>
        </ul>
        <p className="mt-4 mb-4">
          Upon receiving a valid account deletion request, we will process it within a reasonable timeframe (typically within 30 days). Once deleted, your account and associated personal data cannot be recovered.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">5. Children's Privacy</h2>
        <p className="mb-4">
          Our Service is not directed to children under the age of 13. We do not knowingly collect personal information from children under 13.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">6. Security</h2>
        <p className="mb-4">
          We implement industry-standard security measures to protect your data, including encryption in transit and at rest.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">7. Contact Us</h2>
        <p>
          If you have any questions about this Privacy Policy, please contact us at <a href="mailto:rajveer@yoread.com" className="text-blue-600 hover:underline">rajveer@yoread.com</a>.
        </p>
      </div>
    </div>
  );
};

export default PrivacyPolicy;