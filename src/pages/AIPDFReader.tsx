import React, { useRef, useState, useCallback } from 'react';
import { Upload, FileText, Headphones, CheckCircle, ArrowLeft, Volume2, Users, Clock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import SEO from '../components/Common/SEO';
import { useBook } from '../context/BookContext';
import '../components/Library/Library.css';

const AIPDFReader: React.FC = () => {
  const { addBook, openBook } = useBook();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const navigate = useNavigate();

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
      
      if (!isPdf) {
        alert('Please upload a valid PDF file.');
        e.target.value = '';
        return;
      }

      setIsUploading(true);
      try {
        const newBook = await addBook(file);
        e.target.value = '';
        
        // Auto-open the newly uploaded PDF
        console.log('[AIPDFReader] Auto-opening uploaded PDF:', newBook.title);
        await openBook(newBook);
        
        // Navigate to reader
        navigate(`/reader/${newBook.id}`);
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Error uploading PDF');
        setIsUploading(false);
      }
    }
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
      
      if (!isPdf) {
        alert('Please upload a valid PDF file.');
        return;
      }

      setIsUploading(true);
      try {
        const newBook = await addBook(file);
        
        // Auto-open the newly uploaded PDF
        console.log('[AIPDFReader] Auto-opening uploaded PDF:', newBook.title);
        await openBook(newBook);
        
        // Navigate to reader
        navigate(`/reader/${newBook.id}`);
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Error uploading PDF');
        setIsUploading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <SEO 
        title="Free AI PDF Reader | Turn PDF to Audio & Listen Online"
        description="Convert any document with our AI PDF Reader. The best free PDF to audio tool to read PDF files out loud with natural voices. No sign-up required."
        keywords={['AI PDF reader', 'PDF to audio', 'read PDF aloud online', 'PDF audio reader', 'PDF text to speech', 'free PDF reader', 'PDF voice reader', 'listen to PDF']}
        url="https://yoread.com/ai-pdf-reader"
      />
      
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
              <span className="text-gray-600">AI PDF Reader</span>
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
              The AI PDF Reader That Turns Documents into Speech
            </h1>
            <span className="bg-green-100 text-green-800 text-sm font-semibold px-3 py-1 rounded-full">
              FREE
            </span>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
            Instantly convert PDF to audio and listen to your research papers, books, and contracts with human-like voices.
          </p>
          
          {/* CTA Upload Area */}
          <div 
            className={`upload-area max-w-2xl mx-auto ${dragActive ? 'active' : ''} ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={!isUploading ? handleUploadClick : undefined}
          >
            <h3 className="text-lg font-semibold mb-1.5 text-gray-800">Upload your PDF</h3>
            <p className="text-sm text-gray-500 mb-3">Drag & drop a .pdf file, or click to choose</p>
            <button 
              className="browse-button" 
              disabled={isUploading}
              onClick={(e) => {
                e.stopPropagation();
                if (!isUploading) handleUploadClick();
              }}
            >
              {isUploading ? 'Uploading...' : 'Upload PDF & Listen'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <p className="mt-2 text-xs text-gray-500">After upload, open your PDF and tap Read Aloud.</p>
          </div>
        </div>

        {/* How-To Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
            How to Read PDF Files Out Loud Online
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-amber-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-amber-800" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload your file</h3>
              <p className="text-gray-600">
                Select any document for our PDF audio reader.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-amber-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Headphones className="w-8 h-8 text-amber-800" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Choose a Voice</h3>
              <p className="text-gray-600">
                Pick from our natural AI voices.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-amber-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Volume2 className="w-8 h-8 text-amber-800" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Click Play</h3>
              <p className="text-gray-600">
                Sit back and let Yoread convert PDF to sound instantly.
              </p>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
            Why use Yoread for PDF Audio?
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="flex items-start mb-3">
                <CheckCircle className="w-6 h-6 text-green-500 mr-3 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Natural Voices</h3>
                  <p className="text-gray-600">
                    Better than robotic readers. Our AI file reader understands context for smooth listening.
                  </p>
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-start mb-3">
                <Users className="w-6 h-6 text-green-500 mr-3 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Accessibility</h3>
                  <p className="text-gray-600">
                    A perfect screen reader for students with dyslexia or ADHD.
                  </p>
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-start mb-3">
                <Clock className="w-6 h-6 text-green-500 mr-3 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Multitasking</h3>
                  <p className="text-gray-600">
                    Turn PDF into audiobook format and listen while you commute or workout.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
            Frequently Asked Questions about PDF Text to Speech
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Q: Is there an AI that can read PDFs?
              </h3>
              <p className="text-gray-600">
                A: Yes, Yoread is a free AI PDF reader that works directly in your browser. Simply upload your PDF and our AI will read it aloud with natural voices.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Q: How do I get a PDF to read aloud?
              </h3>
              <p className="text-gray-600">
                A: Simply upload it to Yoread.com. We handle the PDF to voice conversion in seconds. No sign-up required - just upload and start listening.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIPDFReader;

