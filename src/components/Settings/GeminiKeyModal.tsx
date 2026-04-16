import React, { useState, useEffect } from 'react';
import localforage from 'localforage';
import { analyzeScenes } from '../../services/sceneAnalysis';
import './GeminiKeyModal.css';

interface GeminiKeyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

const GeminiKeyModal: React.FC<GeminiKeyModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [apiKey, setApiKey] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        if (isOpen) {
            localforage.getItem<string>('user_gemini_api_key').then(key => {
                if (key) setApiKey(key);
                else setApiKey('');
            });
            setMessage(null);
        }
    }, [isOpen]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setMessage(null);
        try {
            await localforage.setItem('user_gemini_api_key', apiKey.trim());
            setMessage({ type: 'success', text: 'API Key saved successfully!' });
            if (onSuccess) onSuccess();
            // Close after a short delay
            setTimeout(onClose, 1000);
        } catch (err) {
            console.error('Failed to save API key:', err);
            setMessage({ type: 'error', text: 'Failed to save API Key.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleClear = async () => {
        setIsSaving(true);
        try {
            await localforage.removeItem('user_gemini_api_key');
            setApiKey('');
            setMessage({ type: 'success', text: 'API Key cleared.' });
        } catch (err) {
            console.error('Failed to clear API key:', err);
            setMessage({ type: 'error', text: 'Failed to clear API Key.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleTest = async () => {
        if (!apiKey.trim()) {
            setMessage({ type: 'error', text: 'Please enter an API key first.' });
            return;
        }
        setIsTesting(true);
        setMessage(null);
        try {
            // Minimal test: analyze a single word
            // We use a try-catch wrapped around the service call
            await analyzeScenes("Hello", "Connection Test", {
                bookTheme: "test",
                colorPalette: "test"
            }, apiKey.trim());
            setMessage({ type: 'success', text: 'Connection successful! Your API key is valid.' });
        } catch (err: any) {
            console.error('API Key test failed:', err);
            setMessage({ type: 'error', text: `Connection failed: ${err.message || 'Check your internet or API key validity.'}` });
        } finally {
            setIsTesting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="gemini-modal-overlay" onClick={onClose}>
            <div className="gemini-modal-content" onClick={e => e.stopPropagation()}>
                <button className="gemini-modal-close" onClick={onClose}>&times;</button>

                <div className="gemini-modal-header mb-6">
                    <h2 className="text-xl font-bold text-gray-800">Google AI API Key</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Enter your Gemini API key to enable Picture Mode without server limits.
                    </p>
                </div>

                <form onSubmit={handleSave} className="space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700">API Key</label>
                        <input
                            type="password"
                            id="apiKey"
                            placeholder="Paste your API key here..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all dark:bg-white text-gray-900"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            disabled={isSaving}
                            autoComplete="off"
                        />
                        <p className="text-xs text-gray-400 leading-relaxed">
                            Don't have a key? You can get a free Gemini API key from the <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline inline-flex items-center gap-0.5">Google AI Studio ↗</a>.
                        </p>
                    </div>

                    {message && (
                        <div className={`p-3 rounded-lg text-sm border ${message.type === 'success'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                            }`}>
                            {message.text}
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button
                            type="submit"
                            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isSaving || isTesting || !apiKey.trim()}
                        >
                            {isSaving ? 'Saving...' : 'Save Key'}
                        </button>
                        <button
                            type="button"
                            onClick={handleTest}
                            className="flex-1 bg-white border border-amber-600 text-amber-600 hover:bg-amber-50 font-bold py-2.5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isSaving || isTesting || !apiKey.trim()}
                        >
                            {isTesting ? 'Testing...' : 'Test Connection'}
                        </button>
                        <button
                            type="button"
                            onClick={handleClear}
                            className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-all disabled:opacity-50"
                            disabled={isSaving || isTesting}
                        >
                            Clear
                        </button>
                    </div>
                </form>

                <div className="mt-8 pt-6 border-t border-gray-100 italic">
                    <p className="text-[10px] text-gray-400 text-center uppercase tracking-widest font-bold">
                        🔒 Your key is stored locally on this device and never sent to our database.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default GeminiKeyModal;
