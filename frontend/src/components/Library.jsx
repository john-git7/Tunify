// frontend/src/components/Library.jsx
import React, { useEffect, useState } from 'react';

const Library = () => {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeAudio, setActiveAudio] = useState(null);
  const [playingStem, setPlayingStem] = useState(null); // { id: '...', stem: 'vocals' }

  useEffect(() => {
    fetchLibrary();
  }, []);

  const fetchLibrary = async () => {
    try {
      const res = await fetch('/api/music/library');
      const data = await res.json();
      setSongs(data);
      setLoading(false);
    } catch (err) {
      console.error("Failed to load library", err);
      setLoading(false);
    }
  };

  const handlePlayStem = (videoId, stem) => {
    const audioUrl = `/api/music/${videoId}/${stem}`;
    
    // If clicking the same button, toggle pause (logic handled by <audio> mostly)
    if (playingStem?.id === videoId && playingStem?.stem === stem) {
      return; 
    }

    setPlayingStem({ id: videoId, stem });
    setActiveAudio(audioUrl);
  };

  const handleDownload = (videoId, stem) => {
    window.open(`/api/music/${videoId}/${stem}`, '_blank');
  };

  if (loading) return <div className="p-10 text-center text-gray-500">Loading Library...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h2 className="text-3xl font-bold mb-8 text-gray-800">My Stems Library</h2>
      
      {/* Global Player (Sticky Bottom) */}
      {activeAudio && (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-4 shadow-lg z-50 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-sm text-gray-400">Now Playing:</span>
            <span className="font-bold capitalize">{playingStem?.stem} Track</span>
          </div>
          <audio controls autoPlay src={activeAudio} className="w-2/3 h-10" />
          <button 
            onClick={() => setActiveAudio(null)}
            className="text-gray-400 hover:text-white px-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Songs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {songs.map((song) => (
          <div key={song.id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow border border-gray-100">
            {/* Header / Thumbnail */}
            <div className="flex p-4 border-b border-gray-100 bg-gray-50">
              <img 
                src={song.thumbnail} 
                alt={song.title} 
                className="w-20 h-20 object-cover rounded-md bg-gray-200"
              />
              <div className="ml-4 flex flex-col justify-center">
                <h3 className="font-semibold text-gray-800 line-clamp-1" title={song.title}>
                  {song.title}
                </h3>
                <p className="text-sm text-gray-500">{song.uploader}</p>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full w-fit mt-1">
                  {song.duration}
                </span>
              </div>
            </div>

            {/* Controls */}
            <div className="p-4">
              <div className="text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider">
                Available Stems
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                {['mix', 'vocals', 'drums', 'bass', 'other'].map((stem) => (
                  <div key={stem} className="flex items-center justify-between bg-gray-50 rounded-lg p-2 group hover:bg-gray-100">
                    <span className="text-sm font-medium capitalize text-gray-700">{stem}</span>
                    
                    <div className="flex gap-1">
                      {/* Play Button */}
                      <button 
                        onClick={() => handlePlayStem(song.id, stem)}
                        className={`p-1.5 rounded-md transition-colors ${
                          playingStem?.id === song.id && playingStem?.stem === stem 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-white text-gray-600 hover:text-blue-600 shadow-sm'
                        }`}
                        title="Play"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                      </button>
                      
                      {/* Download Button */}
                      <button 
                        onClick={() => handleDownload(song.id, stem)}
                        className="p-1.5 rounded-md bg-white text-gray-600 hover:text-green-600 shadow-sm transition-colors"
                        title="Download"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              {!song.hasStems && (
                <div className="mt-3 text-xs text-orange-500 bg-orange-50 p-2 rounded text-center">
                  ⚠️ Stems not generated yet. Playing specific parts will trigger separation (slow).
                </div>
              )}
            </div>
          </div>
        ))}
        
        {songs.length === 0 && (
          <div className="col-span-full text-center py-10 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
            <p className="text-gray-400">No songs in library yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Library;