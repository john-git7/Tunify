import React, { useState, useEffect } from "react";
import { 
  Play, 
  Layers, // Icon for "Split"
  CheckCircle2, 
  Loader2, 
  Music, 
  Clock, 
  Trash2 
} from "lucide-react";

const Downloads = ({ onPlay }) => {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null); // Track which song is currently splitting

  // --- 1. Fetch Downloaded Songs ---
  useEffect(() => {
    fetchDownloads();
  }, []);

  const fetchDownloads = async () => {
    try {
      // Replace with your actual backend endpoint
      const res = await fetch("http://localhost:5000/api/songs"); 
      const data = await res.json();
      setSongs(data);
    } catch (err) {
      console.error("Failed to load downloads", err);
    } finally {
      setLoading(false);
    }
  };

  // --- 2. Trigger Split from Downloads Page ---
  const handlePreSplit = async (songId) => {
    if (processingId) return; // Prevent double clicks
    setProcessingId(songId);

    try {
      // Trigger the split endpoint
      const res = await fetch(`http://localhost:5000/api/audio/${songId}/vocals`);
      
      if (res.status === 200 || res.status === 202) {
        // Optimistically update UI to show it's processing
        // Real status updates will happen when they play the song via polling
        alert("Splitting started in background! You can play now.");
      }
    } catch (err) {
      console.error("Split trigger failed", err);
    } finally {
      setProcessingId(null);
    }
  };

  // --- 3. Delete Song (Optional) ---
  const handleDelete = async (songId, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this song?")) return;
    
    try {
        await fetch(`http://localhost:5000/api/songs/${songId}`, { method: 'DELETE' });
        setSongs(songs.filter(s => s._id !== songId)); // Remove from UI
    } catch (err) {
        console.error("Delete failed", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-[#7A745D]">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading library...</span>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 pb-32"> {/* pb-32 to make room for fixed Player */}
      <h2 className="text-2xl font-bold mb-6 text-[#3B362C] dark:text-[#F8F3D9]">Your Downloads</h2>
      
      {songs.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-[#B9B28A] rounded-xl">
          <Music className="w-12 h-12 mx-auto text-[#B9B28A] mb-3" />
          <p className="text-gray-500">No songs downloaded yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {songs.map((song) => (
            <div 
              key={song._id || song.id}
              className="group bg-white dark:bg-[#2C2820] rounded-xl shadow-sm border border-[#E5E0C8] dark:border-[#4A4538] hover:shadow-md transition-all overflow-hidden flex flex-col"
            >
              {/* Card Top: Image & Info */}
              <div 
                className="p-4 flex gap-4 cursor-pointer"
                onClick={() => onPlay(song)} // Clicking card plays song
              >
                <div className="relative w-20 h-20 flex-shrink-0">
                    <img 
                      src={song.thumbnail || "https://placehold.co/150"} 
                      alt={song.title} 
                      className="w-full h-full object-cover rounded-md"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <Play className="text-white w-8 h-8 fill-current" />
                    </div>
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <h3 className="font-semibold text-lg truncate text-[#3B362C] dark:text-[#F8F3D9]">{song.title}</h3>
                  <p className="text-sm text-[#7A745D] truncate">{song.artists?.join(", ")}</p>
                  
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span>{song.duration ? formatDuration(song.duration) : "--:--"}</span>
                  </div>
                </div>
              </div>

              {/* Card Bottom: Actions */}
              <div className="bg-[#F8F3D9] dark:bg-[#3B362C] p-3 flex items-center justify-between border-t border-[#E5E0C8] dark:border-[#4A4538]">
                
                {/* Status Badge */}
                <div className="text-xs font-medium">
                    {song.isSplit ? (
                        <span className="flex items-center gap-1 text-green-600 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">
                            <CheckCircle2 className="w-3 h-3" /> Ready to Mix
                        </span>
                    ) : (
                        <span className="text-gray-500 px-2">Original Audio</span>
                    )}
                </div>

                {/* Buttons */}
                <div className="flex items-center gap-2">
                    {/* Split Button (Only if not already split) */}
                    {!song.isSplit && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handlePreSplit(song._id || song.id);
                            }}
                            disabled={processingId === (song._id || song.id)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-[#3B362C] text-[#F8F3D9] rounded-md hover:bg-black transition disabled:opacity-50"
                        >
                            {processingId === (song._id || song.id) ? (
                                <><Loader2 className="w-3 h-3 animate-spin" /> Processing</>
                            ) : (
                                <><Layers className="w-3 h-3" /> Split Stems</>
                            )}
                        </button>
                    )}

                    {/* Delete Button */}
                    <button 
                        onClick={(e) => handleDelete(song._id || song.id, e)}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition"
                        title="Delete"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Helper for duration
const formatDuration = (seconds) => {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
};

export default Downloads;