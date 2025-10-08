import React from 'react';
import SEO from '../components/Common/SEO';

const TermsOfService: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <SEO title="Terms of Service" description="YoRead Terms of Service" />
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-6">Terms of Service</h1>

      <p className="text-gray-600 mb-6">Last updated: {new Date().toLocaleDateString()}</p>

      <div className="prose prose-gray max-w-none">
        <h2 className="text-xl font-semibold text-gray-900">1. Overview</h2>
        <p>
          These Terms of Service ("Terms") govern your use of YoRead ("Service"), which enables
          you to upload EPUB files and listen using text-to-speech (TTS). By accessing or using the
          Service, you agree to these Terms.
        </p>

        <h2 className="text-xl font-semibold text-gray-900">2. Eligibility</h2>
        <p>
          You must be at least 13 years old (or the minimum age of digital consent in your region) to use the Service.
        </p>

        <h2 className="text-xl font-semibold text-gray-900">3. Accounts</h2>
        <p>
          You are responsible for maintaining the confidentiality of your account and for all activities
          under it. You agree to provide accurate information and keep it updated.
        </p>

        <h2 className="text-xl font-semibold text-gray-900">4. Uploads and Content Rights</h2>
        <ul>
          <li>Only upload EPUBs you own or have the right to use for personal reading/listening.</li>
          <li>You retain rights to your content; YoRead does not claim ownership.</li>
          <li>We may temporarily process and cache audio segments to provide the Service; such processing is ephemeral and for delivery only.</li>
        </ul>

        <h2 className="text-xl font-semibold text-gray-900">5. Text‑to‑Speech Usage Limits</h2>
        <ul>
          <li>Free tier includes up to <strong>10 hours (600 minutes)</strong> of TTS per monthly billing cycle. Exact allotments displayed in‑app control. We may adjust this in the future with notice.</li>
          <li>Once you exhaust free minutes, continued TTS requires an active paid plan or add‑on minutes.</li>
          <li>We may implement fair‑use safeguards (e.g., rate limiting, daily caps) to ensure stability.</li>
        </ul>

        <h2 className="text-xl font-semibold text-gray-900">6. Plans, Billing, and Payments</h2>
        <ul>
          <li>Paid plans grant additional TTS minutes or features. Pricing and inclusions are displayed at checkout and may change.</li>
          <li>By subscribing or purchasing add‑ons, you authorize us and our payment processor to charge your payment method.</li>
          <li>Unless otherwise stated, subscriptions auto‑renew until cancelled. You can cancel any time; access continues until the end of the current period.</li>
          <li>Taxes may apply based on your location.</li>
          <li>Refunds are handled per our Refund Policy (if any) or as required by law.</li>
        </ul>

        <h2 className="text-xl font-semibold text-gray-900">7. Acceptable Use</h2>
        <ul>
          <li>No infringement: do not upload or convert content you do not have the right to use.</li>
          <li>No abuse: do not attempt to scrape, reverse‑engineer, or overload the Service.</li>
          <li>No unlawful content: do not use the Service to create or distribute illegal content.</li>
        </ul>

        <h2 className="text-xl font-semibold text-gray-900">8. Service Changes and Availability</h2>
        <p>
          We may modify features, limits, or availability (including TTS providers/voices) to improve
          reliability and quality. We aim to give notice for material changes when feasible.
        </p>

        <h2 className="text-xl font-semibold text-gray-900">9. Privacy</h2>
        <p>
          We handle personal data in accordance with our Privacy Policy. By using the Service, you consent
          to such processing. We minimize storage of processed audio and only retain what is necessary to
          operate the Service (e.g., usage counts, preferences).
        </p>

        <h2 className="text-xl font-semibold text-gray-900">10. Intellectual Property</h2>
        <p>
          The Service, including the app, UI, and underlying technology, is owned by YoRead and its licensors.
          You receive a limited, non‑exclusive, non‑transferable license to use the Service for personal purposes.
        </p>

        <h2 className="text-xl font-semibold text-gray-900">11. Disclaimers</h2>
        <p>
          The Service is provided “as is” without warranties of any kind. We do not guarantee uninterrupted
          or error‑free operation, or that generated audio matches any specific standard or accent.
        </p>

        <h2 className="text-xl font-semibold text-gray-900">12. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, YoRead shall not be liable for indirect, incidental, special,
          consequential, or punitive damages, or any loss of data, profits, or revenues resulting from your use of
          the Service.
        </p>

        <h2 className="text-xl font-semibold text-gray-900">13. Termination</h2>
        <p>
          We may suspend or terminate your access for breach of these Terms or misuse of the Service. You may
          stop using the Service at any time. Sections that by their nature should survive termination will survive.
        </p>

        <h2 className="text-xl font-semibold text-gray-900">14. Governing Law</h2>
        <p>
          These Terms are governed by the laws of your local jurisdiction unless superseded by mandatory laws.
        </p>

        <h2 className="text-xl font-semibold text-gray-900">15. Contact</h2>
        <p>
          For questions, contact <a href="mailto:rajveer@yoread.com">rajveer@yoread.com</a>.
        </p>
      </div>
    </div>
  );
};

export default TermsOfService;


