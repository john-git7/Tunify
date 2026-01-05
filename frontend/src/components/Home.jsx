import React, { useState } from 'react';
import { Search, Loader2, Music } from 'lucide-react';

/**
 * Home Component
 * Fully responsive: Mobile (2 cols), Tablet (3-4 cols), Desktop (5-6 cols)
 */
export default function Home({ onSongClick }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`http://localhost:5001/api/music/search?q=${query}`);
      if (!res.ok) throw new Error('Failed to fetch search results');
      const data = await res.json();
      setResults(data.items || []);
    } catch (err) {
      console.error('Search failed:', err);
      setError('Search failed. Please ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f8f3d6] text-[#4d4834] dark:bg-[#4d4834] dark:text-[#f8f3d6] min-h-screen">
      
      {/* --- Header & Search --- */}
      <header className="sticky top-0 z-20 bg-[#f8f3d6]/95 dark:bg-[#4d4834]/95 backdrop-blur-md border-b border-[#c5bd91] dark:border-[#333025] px-4 py-3 md:px-6 md:py-5 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto w-full">
            <h1 className="text-xl md:text-3xl font-bold mb-3 md:mb-5 px-1 tracking-tight">Discover Music</h1>
            
            <div className="flex gap-2 md:gap-3 w-full">
              <div className="relative flex-1 group">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search songs, artists..."
                  // text-base prevents iOS zoom on focus
                  className="w-full pl-9 md:pl-11 pr-4 py-2.5 md:py-3 rounded-xl bg-[#eae3bb] text-[#4d4834] placeholder-[#4d4834]/60 text-base
                           focus:outline-none focus:ring-2 focus:ring-[#7A745D] focus:bg-[#f0eac5] transition-all
                           dark:bg-[#333025] dark:text-[#f8f3d6] dark:placeholder-[#d7d1ac]/60 dark:focus:bg-[#2a281e]"
                />
                <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 opacity-50 group-focus-within:opacity-100 transition-opacity" />
              </div>
              
              <button
                onClick={handleSearch}
                disabled={loading}
                className="bg-[#c5bd91] text-[#4d4834] px-4 md:px-8 py-2 md:py-3 rounded-xl font-bold hover:bg-[#b5ac7f] active:scale-95 transition-all
                           dark:bg-[#d7d1ac] dark:text-[#333025] dark:hover:bg-[#c2ba8c] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap text-sm md:text-base shadow-sm"
              >
                {loading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Search'}
              </button>
            </div>
            
            {error && (
              <div className="mt-3 text-center text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20 p-2.5 rounded-xl text-sm font-medium animate-in fade-in slide-in-from-top-1">
                {error}
              </div>
            )}
        </div>
      </header>

      {/* --- Main Content --- */}
      <main className="flex-1 p-3 md:p-6 lg:p-8 overflow-y-auto w-full"> 
        {/* pb-32 adds padding at bottom so the fixed Player doesn't cover the last items */}
        <div className="pb-32 md:pb-40 max-w-7xl mx-auto">
            
            {results.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 md:gap-6">
                {results.map((song, index) => (
                  <div
                    key={song.id || index}
                    onClick={() => onSongClick && onSongClick(song)}
                    className="group relative bg-[#eae3bb] dark:bg-[#333025] p-2.5 md:p-4 rounded-xl md:rounded-2xl shadow-sm hover:shadow-xl 
                               cursor-pointer transform hover:-translate-y-1 transition-all duration-300 border border-transparent hover:border-[#c5bd91]/50"
                  >
                    {/* Image Container */}
                    <div className="relative aspect-square mb-2 md:mb-3 overflow-hidden rounded-lg md:rounded-xl bg-[#c5bd91]/30 shadow-inner">
                      <img
                        src={song.thumbnail}
                        alt={song.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        loading="lazy"
                      />
                      {/* Overlay Play Icon - Hidden on mobile touch, visible on desktop hover */}
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                        <div className="bg-[#f8f3d6] p-2 md:p-3 rounded-full shadow-lg text-[#4d4834] transform scale-90 group-hover:scale-100 transition-transform">
                            <Music fill="currentColor" className="w-5 h-5 md:w-6 md:h-6" />
                        </div>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="space-y-0.5 md:space-y-1">
                      <h3 className="font-bold text-[#4d4834] dark:text-[#f8f3d6] truncate text-sm md:text-base leading-tight" title={song.title}>
                        {song.title}
                      </h3>
                      <p className="text-xs md:text-sm text-[#4d4834]/80 dark:text-[#f8f3d6]/70 truncate font-medium">
                        {song.artists?.join(', ')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Empty State */
              !loading && (
                <div className="flex flex-col items-center justify-center h-[40vh] md:h-[50vh] text-[#4d4834]/40 dark:text-[#f8f3d6]/40 text-center px-4">
                  <div className="bg-[#eae3bb] dark:bg-[#333025] p-6 rounded-full mb-4 md:mb-6">
                    <Music className="w-12 h-12 md:w-16 md:h-16 opacity-50" />
                  </div>
                  <h2 className="text-lg md:text-xl font-bold mb-2 text-[#4d4834] dark:text-[#f8f3d6]">Start Your Mix</h2>
                  <p className="text-sm md:text-base font-medium max-w-xs md:max-w-md mx-auto leading-relaxed">
                    Search for a song above to separate stems and create your masterpiece.
                  </p>
                </div>
              )
            )}
        </div>
      </main>
    </div>
  );
}