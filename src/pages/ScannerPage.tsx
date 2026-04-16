import React, { useState, useRef } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { generateEpubFromScannedText, appendToExistingEpub } from '../utils/epubGenerator';

const ScannerPage: React.FC = () => {
  const { addToast } = useToast();
  const { user } = useAuth();
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [text, setText] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [bookTitle, setBookTitle] = useState<string>('');
  const [accumulatedText, setAccumulatedText] = useState<string>('');
  const [pagesCount, setPagesCount] = useState<number>(0);
  const [saving, setSaving] = useState<boolean>(false);
  const [generatingEpub, setGeneratingEpub] = useState<boolean>(false);
  const [chapterBreaks, setChapterBreaks] = useState<number[]>([]);
  const [existingEpub, setExistingEpub] = useState<File | null>(null);
  const [appendingToEpub, setAppendingToEpub] = useState<boolean>(false);
  const [chapterTitle, setChapterTitle] = useState<string>('New Chapter');
  const [appendMode, setAppendMode] = useState<'new_chapter' | 'last_chapter'>('new_chapter');
  const epubFileInputRef = useRef<HTMLInputElement>(null);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImageDataUrl(reader.result as string);
    reader.readAsDataURL(file);
    setText('');
    setError('');
  };

  const extractText = async () => {
    if (!imageDataUrl) return;
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
    if (!apiKey) {
      setError('Missing VITE_GEMINI_API_KEY');
      addToast('Gemini API key not found. If it does not work contact us.', 'error');
      return;
    }
    try {
      setExtracting(true);
      setError('');
      const base64 = imageDataUrl.includes(',') ? imageDataUrl.split(',')[1] : imageDataUrl; // strip data: prefix if present
      const mimeMatch = imageDataUrl.match(/^data:(.*?);base64,/);
      const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = 'Extract the readable text content from this book page image. Return plain text only.';
      const result = await model.generateContent([
        { text: prompt },
        { inlineData: { data: base64, mimeType: mime } }
      ] as any);

      const out = (result as any).response?.text?.() || '';
      setText(out.trim());
      if (out.trim()) {
        setAccumulatedText(prev => prev ? prev + '\n\n' + out.trim() : out.trim());
        setPagesCount(prev => prev + 1);
      }
      if (!out.trim()) {
        addToast('No text detected from image. If it does not work contact us.', 'error');
      } else {
        addToast('OCR complete', 'success');
      }
    } catch (e: any) {
      console.error('Gemini OCR error', e);
      setError(e?.message || 'OCR failed');
      addToast('OCR failed. If it does not work contact us.', 'error');
    } finally {
      setExtracting(false);
    }
  };

  const saveToSupabase = async () => {
    if (!user) {
      addToast('Please sign in to save', 'error');
      return;
    }
    if (!bookTitle.trim()) {
      addToast('Enter a book title', 'error');
      return;
    }
    if (!accumulatedText.trim()) {
      addToast('No content to save', 'error');
      return;
    }
    try {
      setSaving(true);
      const filenameSafe = bookTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const path = `${user.id}/${Date.now()}_${filenameSafe}.txt`;
      const fileBlob = new Blob([accumulatedText], { type: 'text/plain' });
      const { error: upErr } = await supabase.storage.from('books').upload(path, fileBlob, { upsert: true });
      if (upErr) throw upErr;
      addToast('Saved to cloud', 'success');
    } catch (e: any) {
      console.error('Save failed', e);
      addToast('Save failed. If it does not work contact us.', 'error');
    } finally {
      setSaving(false);
    }
  };
  
  const generateAndDownloadEpub = async () => {
    if (!bookTitle.trim()) {
      addToast('Enter a book title', 'error');
      return;
    }
    if (!accumulatedText.trim()) {
      addToast('No content to save', 'error');
      return;
    }
    try {
      setGeneratingEpub(true);
      
      // Generate the EPUB with all pages in a single chapter by default
      const epubBlob = await generateEpubFromScannedText(accumulatedText, {
        title: bookTitle,
        chapterBreaks: chapterBreaks
      });
      
      // Create a download link
      const url = URL.createObjectURL(epubBlob);
      const a = document.createElement('a');
      a.href = url;
      const filenameSafe = bookTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      a.download = `${filenameSafe}.epub`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      addToast('EPUB generated and downloaded', 'success');
    } catch (e: any) {
      console.error('EPUB generation failed', e);
      addToast('EPUB generation failed', 'error');
    } finally {
      setGeneratingEpub(false);
    }
  };
  
  const toggleChapterBreak = (pageIndex: number) => {
    setChapterBreaks(prevBreaks => {
      const index = prevBreaks.indexOf(pageIndex);
      if (index >= 0) {
        // Remove the break point
        return [...prevBreaks.slice(0, index), ...prevBreaks.slice(index + 1)];
      } else {
        // Add the break point
        return [...prevBreaks, pageIndex].sort((a, b) => a - b);
      }
    });
  };
  
  const handleEpubFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/epub+zip') {
      setExistingEpub(file);
      addToast(`Selected EPUB: ${file.name}`, 'success');
    } else if (file) {
      addToast('Please select a valid EPUB file', 'error');
      setExistingEpub(null);
    }
  };
  
  const appendToEpub = async () => {
    if (!existingEpub) {
      addToast('Please select an EPUB file', 'error');
      return;
    }
    
    if (!accumulatedText || accumulatedText.trim() === '') {
      addToast('No content to append. Please scan some pages first.', 'error');
      return;
    }
    
    try {
      setAppendingToEpub(true);
      console.log('Appending to EPUB:', {
        epubName: existingEpub.name,
        contentLength: accumulatedText.length,
        chapterTitle: chapterTitle
      });
      
      const updatedEpub = await appendToExistingEpub({
        existingEpub,
        newContent: accumulatedText,
        chapterTitle,
        appendMode
      });
      
      // Create a download link
      const url = URL.createObjectURL(updatedEpub);
      const a = document.createElement('a');
      a.href = url;
      const filenameSafe = existingEpub.name.replace(/\.epub$/i, '') + '-updated.epub';
      a.download = filenameSafe;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      addToast('Content appended to EPUB successfully', 'success');
      
      // Clear the input field to allow selecting the same file again if needed
      if (epubFileInputRef.current) {
        epubFileInputRef.current.value = '';
      }
    } catch (e: any) {
      console.error('Error appending to EPUB:', e);
      addToast(`Failed to append to EPUB: ${e.message}`, 'error');
    } finally {
      setAppendingToEpub(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-4">Scan Book Pages</h1>

      <div className="bg-white p-4 rounded shadow mb-4">
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Book Title</label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded"
            placeholder="Enter book title"
            value={bookTitle}
            onChange={(e) => setBookTitle(e.target.value)}
          />
        </div>
        <input type="file" accept="image/*" onChange={onFile} />
        {imageDataUrl && (
          <div className="mt-4">
            <img src={imageDataUrl} alt="preview" className="max-h-64 rounded border" />
          </div>
        )}
        <div className="mt-4">
          <button
            onClick={extractText}
            disabled={!imageDataUrl || extracting}
            className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {extracting ? 'Extracting…' : 'Extract Text'}
          </button>
          <button
            onClick={saveToSupabase}
            disabled={saving || !accumulatedText || !bookTitle.trim()}
            className="ml-3 bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {saving ? 'Saving…' : `Save Book (${pagesCount} page${pagesCount === 1 ? '' : 's'})`}
          </button>
          <button
            onClick={generateAndDownloadEpub}
            disabled={generatingEpub || !accumulatedText || !bookTitle.trim()}
            className="ml-3 bg-purple-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {generatingEpub ? 'Generating…' : 'Generate EPUB'}
          </button>
        </div>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        
        <div className="mt-6 border-t pt-4">
          <h3 className="text-lg font-medium mb-2">Append to Existing EPUB</h3>
          <p className="text-sm text-gray-600 mb-3">
            Add your scanned content to an existing EPUB file.
          </p>
          
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Select EPUB File</label>
            <input 
              type="file" 
              accept="application/epub+zip" 
              onChange={handleEpubFileSelect}
              ref={epubFileInputRef}
              className="mb-2"
            />
            {existingEpub && (
              <p className="text-sm text-green-600">
                Selected: {existingEpub.name}
              </p>
            )}
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Append Mode</label>
            <div className="flex gap-4 mb-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="appendMode"
                  checked={appendMode === 'new_chapter'}
                  onChange={() => setAppendMode('new_chapter')}
                  className="mr-2"
                />
                Create new chapter
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="appendMode"
                  checked={appendMode === 'last_chapter'}
                  onChange={() => setAppendMode('last_chapter')}
                  className="mr-2"
                />
                Append to last chapter
              </label>
            </div>
          </div>
          
          {appendMode === 'new_chapter' && (
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Chapter Title</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded"
                placeholder="Enter chapter title"
                value={chapterTitle}
                onChange={(e) => setChapterTitle(e.target.value)}
              />
            </div>
          )}
          
          <button
            onClick={appendToEpub}
            disabled={appendingToEpub || !existingEpub || !accumulatedText}
            className="bg-amber-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {appendingToEpub ? 'Appending…' : 'Append to EPUB'}
          </button>
          
          <button
            onClick={() => {
              console.log('Debug info:', {
                existingEpub,
                accumulatedTextLength: accumulatedText?.length || 0,
                accumulatedTextPreview: accumulatedText?.substring(0, 100),
                pagesCount,
                chapterBreaks,
                appendMode,
                chapterTitle
              });
              addToast('Debug info logged to console', 'info');
            }}
            className="ml-3 bg-gray-600 text-white px-4 py-2 rounded text-sm"
          >
            Debug Info
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-lg font-medium mb-2">Current Extract</h2>
        {text ? (
          <pre className="whitespace-pre-wrap text-sm">{text}</pre>
        ) : (
          <p className="text-gray-500 text-sm">No text yet. Upload an image and extract.</p>
        )}
        
        <h2 className="text-lg font-medium mt-6 mb-2">Accumulated Book Text</h2>
        {accumulatedText ? (
          <div>
            <div className="mb-4">
              <h3 className="text-md font-medium mb-2">Chapter Breaks</h3>
              <p className="text-sm text-gray-600 mb-2">
                By default, all pages are in a single chapter. Click on a page number to mark it as the start of a new chapter.
              </p>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: pagesCount }).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => toggleChapterBreak(idx)}
                    className={`px-2 py-1 text-xs rounded ${
                      chapterBreaks.includes(idx)
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-200 text-gray-800'
                    }`}
                  >
                    Page {idx + 1}
                    {chapterBreaks.includes(idx) ? ' (Chapter Start)' : ''}
                  </button>
                ))}
              </div>
            </div>
            <pre className="whitespace-pre-wrap text-sm max-h-64 overflow-auto border p-2 rounded">{accumulatedText}</pre>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Nothing accumulated yet.</p>
        )}
      </div>
    </div>
  );
};

export default ScannerPage;


