import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle, X, Zap, Volume2 } from 'lucide-react';
import SEO from '../components/Common/SEO';
import Footer from '../components/Common/Footer';
import { Helmet } from 'react-helmet-async';

const SpeechifyAlternative: React.FC = () => {
  // FAQ data matching the provided schema
  const faqs = [
    {
      question: "Is there a free alternative to Speechify?",
      answer: "Yes, Yoread.com is a completely free Speechify alternative. Unlike Speechify, Yoread offers unlimited text-to-speech conversion for ePubs and documents without requiring a credit card or a premium subscription."
    },
    {
      question: "Does Yoread have a word limit like Speechify?",
      answer: "No, Yoread is designed to be unlimited. You can upload long textbooks, research papers, or novels and listen to the entire document without hitting the premium voice limits found in other tools."
    },
    {
      question: "Can I listen to books for free without signing up?",
      answer: "Yes. Yoread allows you to convert ebooks to audio immediately in your browser. There is no need to create an account, download an app, or log in to start listening."
    },
    {
      question: "What file formats does Yoread support?",
      answer: "Yoread supports a wide range of formats including ePub (eBooks), DOCX (Word), AZW3 (Kindle), and standard text files, making it a versatile tool for students and readers."
    }
  ];

  // Generate FAQPage schema (JSON-LD) for SEO
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO
        title="The Best Free Speechify Alternative (2025) | Unlimited Text to Speech"
        description="Looking for a Speechify alternative? Yoread offers free, unlimited text to speech with natural voices. No credit card required."
        keywords={['Speechify alternative', 'free text to speech', 'unlimited TTS', 'free Speechify', 'text to speech free', 'TTS alternative', 'Voiceforge browser tool', 'Natural Reader alternative']}
        url="https://yoread.com/speechify-alternative"
      />

      {/* FAQ Schema Structured Data */}
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(faqSchema)}
        </script>
      </Helmet>

      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link to="/" className="text-xl font-semibold text-gray-800 flex items-center">
                <ArrowLeft className="w-5 h-5 mr-2" />
                YoRead
              </Link>
              <span className="text-gray-400">/</span>
              <span className="text-gray-600">Speechify Alternative</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-amber-100 p-3 rounded-full">
              <Volume2 className="w-8 h-8 text-amber-800" />
            </div>
          </div>
          <div className="flex items-center justify-center mb-3">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 mr-3" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
              The Free Speechify Alternative You've Been Waiting For
            </h1>
            <span className="bg-green-100 text-green-800 text-sm font-semibold px-3 py-1 rounded-full">
              FREE
            </span>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
            Enjoy unlimited listening without the expensive subscription. The simple, free way to turn text into audio.
          </p>
          <Link
            to="/"
            className="inline-flex items-center justify-center bg-amber-800 hover:bg-amber-900 text-white py-3 px-8 rounded-md font-medium text-base transition-colors relative overflow-hidden"
            style={{
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1), 0 8px 12px -4px rgba(146, 64, 14, 0.3)'
            }}
          >
            <span className="relative z-10">Try Yoread for Free</span>
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(to bottom, transparent 0%, transparent 50%, rgba(0, 0, 0, 0.3) 100%)'
              }}
            />
          </Link>
        </div>

        {/* Comparison Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
            Yoread vs. Speechify: Why Switch?
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-4 px-4 font-semibold text-gray-900">Feature</th>
                  <th className="text-center py-4 px-4 font-semibold text-gray-900">Speechify</th>
                  <th className="text-center py-4 px-4 font-semibold text-gray-900">Yoread</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-4 px-4 font-medium text-gray-900">Cost</td>
                  <td className="py-4 px-4 text-center text-gray-600">Expensive Monthly Fee</td>
                  <td className="py-4 px-4 text-center">
                    <span className="inline-flex items-center text-green-700 font-semibold">
                      <CheckCircle className="w-5 h-5 mr-1" />
                      Free / Affordable
                    </span>
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-4 px-4 font-medium text-gray-900">Word Limit</td>
                  <td className="py-4 px-4 text-center text-gray-600">Limited on Free Plan</td>
                  <td className="py-4 px-4 text-center">
                    <span className="inline-flex items-center text-green-700 font-semibold">
                      <CheckCircle className="w-5 h-5 mr-1" />
                      Unlimited
                    </span>
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-4 px-4 font-medium text-gray-900">Voices</td>
                  <td className="py-4 px-4 text-center text-gray-600">AI Voices</td>
                  <td className="py-4 px-4 text-center">
                    <span className="inline-flex items-center text-green-700 font-semibold">
                      <CheckCircle className="w-5 h-5 mr-1" />
                      Natural AI Voices
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-4 font-medium text-gray-900">Login Required</td>
                  <td className="py-4 px-4 text-center text-gray-600">Yes</td>
                  <td className="py-4 px-4 text-center">
                    <span className="inline-flex items-center text-green-700 font-semibold">
                      <CheckCircle className="w-5 h-5 mr-1" />
                      No (Instant Start)
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Pain Point Copy */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
            Why pay for Text to Speech?
          </h2>
          <p className="text-gray-600 text-lg leading-relaxed">
            Many tools limit how much you can listen to. As a top Speechify free alternative, we believe knowledge should be accessible. Whether you need a free unlimited audiobooks tool or a study aid, Yoread keeps it simple.
          </p>
        </div>

        {/* Related Keywords Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
            More than just an alternative
          </h2>
          <p className="text-gray-600 text-lg leading-relaxed">
            Yoread isn't just for replacing paid apps. It's also a powerful Voiceforge browser tool and Natural Reader alternative designed for speed and simplicity. Experience unlimited text-to-speech without the restrictions.
          </p>
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
            Frequently Asked Questions about Speechify Alternatives
          </h2>
          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  {faq.question}
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default SpeechifyAlternative;

