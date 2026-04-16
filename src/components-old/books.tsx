import React, { useState, useEffect, FormEvent } from 'react';

const BooksPage: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // Fetch books from Gutendex API
  const fetchBooks = async (query: string = '') => {
    setLoading(true);
    try {
      const baseUrl = 'https://gutendex.com/books';
      // Append search query if provided
      const url = query ? `${baseUrl}?search=${encodeURIComponent(query)}` : baseUrl;
      const res = await fetch(url);
      const data = await res.json();
      // Type assertion: data.results is an array of Book
      setBooks(data.results as Book[]);
    } catch (error) {
      console.error('Error fetching books:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  const handleSearchSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    fetchBooks(searchTerm);
  };

  // Helper function to select a download/view link.
  const getDownloadLink = (formats: { [mime: string]: string }): string => {
    const htmlFormat = Object.entries(formats).find(([mime, url]) =>
      mime.startsWith('text/html')
    );
    return htmlFormat ? htmlFormat[1] : Object.values(formats)[0];
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Popular Books</h1>
      <form onSubmit={handleSearchSubmit} style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Search for books..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            padding: '8px',
            fontSize: '16px',
            width: '300px',
            border: '1px solid #ccc',
            borderRadius: '4px',
          }}
        />
        <button
          type="submit"
          style={{
            padding: '8px 12px',
            marginLeft: '8px',
            fontSize: '16px',
            border: 'none',
            borderRadius: '4px',
            backgroundColor: '#0070f3',
            color: 'white',
            cursor: 'pointer',
          }}
        >
          Search
        </button>
      </form>
      {loading ? (
        <p>Loading books...</p>
      ) : books.length > 0 ? (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {books.map((book) => (
            <li
              key={book.id}
              style={{
                marginBottom: '20px',
                borderBottom: '1px solid #ccc',
                paddingBottom: '10px',
              }}
            >
              <h2 style={{ margin: '0 0 10px 0' }}>{book.title}</h2>
              {book.authors && book.authors.length > 0 && (
                <p>
                  <strong>By:</strong> {book.authors.map((author) => author.name).join(', ')}
                </p>
              )}
              <p>
                <strong>Downloads:</strong> {book.download_count}
              </p>
              {book.formats && (
                <p>
                  <a
                    href={getDownloadLink(book.formats)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#0070f3' }}
                  >
                    Download / View Book
                  </a>
                </p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p>No books found.</p>
      )}
    </div>
  );
};

export default BooksPage;
