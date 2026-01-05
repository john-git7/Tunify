import React, { useState, useRef, useEffect } from "react";
import {
  Play,
  Pause,
  Loader2,
  X,
  ChevronUp,
  ChevronDown,
  Layers,
  Music2,
  Mic2,
  Drum,
  Guitar,
  Speaker,
  Heart,
} from "lucide-react";

/**
 * Helper to map stems to icons for better UX
 */
const getStemIcon = (stemName) => {
  switch (stemName) {
    case "vocals": return <Mic2 size={16} />;
    case "drums": return <Drum size={16} />;
    case "bass": return <Guitar size={16} />;
    case "other": return <Music2 size={16} />;
    default: return <Layers size={16} />;
  }
};

/**
 * Full Player Component
 * - Fixed Progress Bar Alignment (Using Linear Gradient)
 * - Fixed Z-Index Layering
 * - Responsive Layout
 */
function Player({ currentSong }) {
  const STEMS = ["vocals", "drums", "bass", "other"];

  // --- State: Playback & UI ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioTime, setAudioTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [volume, setVolume] = useState(100);

  // --- State: Splitting Process ---
  const [isSplitting, setIsSplitting] = useState(false);
  const [splitProgress, setSplitProgress] = useState(null);
  const [splitDone, setSplitDone] = useState(false);
  const [loadingStems, setLoadingStems] = useState(false);

  // --- WebAudio Refs ---
  const audioRef = useRef(null); // HTML Audio for pre-split
  const audioContextRef = useRef(null);
  const masterGainRef = useRef(null);
  const stemsBufferRef = useRef({});
  const stemsGainRef = useRef({});
  const stemsSourceRef = useRef({});

  // --- Mixer Sync Refs ---
  const mixerIsPlayingRef = useRef(false);
  const mixerStartTimeRef = useRef(0);
  const mixerOffsetRef = useRef(0);
  const mixerClockRef = useRef(null);

  // --- Mixer Controls ---
  const [stemEnabled, setStemEnabled] = useState({
    vocals: true, drums: true, bass: true, other: true,
  });
  const [stemVolumes, setStemVolumes] = useState({
    vocals: 100, drums: 100, bass: 100, other: 100,
  });

  // --- UI Layout State ---
  const [mixerOpenMobile, setMixerOpenMobile] = useState(false);
  const [mixerPinned, setMixerPinned] = useState(false);

  // ============================================================
  // AUDIO CONTEXT & CLEANUP
  // ============================================================

  const ensureAudioContext = async () => {
    if (!audioContextRef.current) {
      const AC = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AC();
      masterGainRef.current = audioContextRef.current.createGain();
      masterGainRef.current.gain.value = volume / 100;
      masterGainRef.current.connect(audioContextRef.current.destination);

      STEMS.forEach((s) => {
        if (!stemsGainRef.current[s]) {
          const g = audioContextRef.current.createGain();
          g.gain.value = (stemVolumes[s] ?? 100) / 100;
          g.connect(masterGainRef.current);
          stemsGainRef.current[s] = g;
        }
      });
    }
    if (audioContextRef.current.state === "suspended") {
      try { await audioContextRef.current.resume(); } catch (e) {}
    }
    return audioContextRef.current;
  };

  const stopAndClearAllSources = () => {
    try {
      Object.keys(stemsSourceRef.current).forEach((s) => {
        const node = stemsSourceRef.current[s];
        if (node) {
          try { node.onended = null; node.stop(0); } catch (e) {}
        }
        stemsSourceRef.current[s] = null;
      });
    } catch (e) {}
    mixerIsPlayingRef.current = false;
  };

  // Cleanup on Unmount
  useEffect(() => {
    return () => {
      stopAndClearAllSources();
      stopMixerClock();
      try { audioRef.current?.pause(); } catch (e) {}
      if (audioContextRef.current) {
        try { audioContextRef.current.close(); } catch (e) {}
      }
    };
  }, []);

  // ============================================================
  // SONG CHANGE HANDLER
  // ============================================================

  useEffect(() => {
    // 1. Reset everything
    stopAndClearAllSources();
    stopMixerClock();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }

    setIsPlaying(false);
    setAudioTime(0);
    setAudioDuration(0);
    setIsSplitting(false);
    setSplitProgress(null);
    setSplitDone(false);
    setLoadingStems(false);
    setMixerOpenMobile(false);
    setMixerPinned(false);

    stemsBufferRef.current = {};
    stemsSourceRef.current = {};
    mixerStartTimeRef.current = 0;
    mixerOffsetRef.current = 0;

    setStemEnabled({ vocals: true, drums: true, bass: true, other: true });
    setStemVolumes({ vocals: 100, drums: 100, bass: 100, other: 100 });

    if (!currentSong?.id) return;

    // 2. Load basic Mix for immediate playback
    const a = audioRef.current;
    a.crossOrigin = "anonymous";
    a.src = `http://localhost:5000/api/audio/${currentSong.id}/mix`;
    a.load();
    a.volume = volume / 100;
    a.onloadedmetadata = () => {
      setAudioDuration(a.duration || 0);
    };
    a.ontimeupdate = () => {
      // Only update from HTML Audio if we are NOT in mixer mode
      if (!splitDone) setAudioTime(a.currentTime || 0);
    };
  }, [currentSong]);

  // Update volume ref
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100;
    if (masterGainRef.current) masterGainRef.current.gain.value = volume / 100;
  }, [volume]);

  // ============================================================
  // LOGIC: PRE-SPLIT PLAYBACK
  // ============================================================

  const playPreSplit = async () => {
    if (!audioRef.current) return;
    try {
      await audioRef.current.play();
      setIsPlaying(true);
    } catch (e) { setIsPlaying(false); }
  };

  const pausePreSplit = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    setIsPlaying(false);
  };

  // ============================================================
  // LOGIC: LOADING STEMS
  // ============================================================

  const loadAllStems = async () => {
    if (!currentSong?.id) return false;
    setLoadingStems(true);
    
    try {
      const ac = await ensureAudioContext();
      if (ac.state === 'closed') return false;

      const buffers = {};
      
      // Parallel Download
      await Promise.all(
        STEMS.map(async (s) => {
            const url = `http://localhost:5000/api/audio/${currentSong.id}/${s}`;
            const r = await fetch(url);
            if (!r.ok) throw new Error(`Failed to fetch ${s}: ${r.status}`);
            const ab = await r.arrayBuffer();
            if (ac.state === 'closed') throw new Error("Context closed");
            buffers[s] = await ac.decodeAudioData(ab);
        })
      );

      stemsBufferRef.current = buffers;

      // Ensure Gain Nodes
      if (ac.state !== 'closed') {
        STEMS.forEach((s) => {
            if (!stemsGainRef.current[s]) {
                const g = ac.createGain();
                g.gain.value = (stemVolumes[s] ?? 100) / 100;
                g.connect(masterGainRef.current);
                stemsGainRef.current[s] = g;
            } else {
                stemsGainRef.current[s].gain.value = (stemVolumes[s] ?? 100) / 100;
            }
        });
      }
      return true; // Success
    } catch (err) {
      console.error("loadAllStems failed:", err);
      return false; // Fail
    } finally {
      setLoadingStems(false);
    }
  };

  // ============================================================
  // LOGIC: SPLITTING & POLLING
  // ============================================================

  const handleSplit = async () => {
    if (!currentSong?.id) return;
    if (isSplitting || splitDone) return;

    setIsSplitting(true);
    setSplitProgress(0);

    try {
      const res = await fetch(`http://localhost:5000/api/audio/${currentSong.id}/vocals`);
      
      if (res.status === 200) {
        // Already Done -> Load Stems -> Show Mixer
        const success = await loadAllStems();
        if (!success) {
            setIsSplitting(false);
            return; 
        }
        setSplitDone(true);
        setIsSplitting(false);
        setSplitProgress(null);
        switchToMixer();
      } else if (res.status === 202) {
        // Processing -> Poll
        pollSplitStatus();
      } else {
        setIsSplitting(false);
        setSplitProgress(null);
      }
    } catch (err) {
      console.error("Split trigger error", err);
      setIsSplitting(false);
      setSplitProgress(null);
    }
  };

  const pollSplitStatus = () => {
    const id = currentSong?.id;
    if (!id) return;
    let stopped = false;
    
    const interval = setInterval(async () => {
      if (stopped) return;
      try {
        const res = await fetch(`http://localhost:5000/api/audio/status/${id}`);
        const data = await res.json();
        
        if (data.done) {
          stopped = true;
          clearInterval(interval);
          
          const success = await loadAllStems();
          if (!success) {
             setIsSplitting(false);
             setSplitProgress(null);
             return;
          }
          
          setSplitDone(true);
          setIsSplitting(false);
          setSplitProgress(null);
          switchToMixer();
        } else {
          setSplitProgress(data.progress ?? 0);
        }
      } catch (err) { console.warn("Poll error", err); }
    }, 1500);
    
    return () => {
      stopped = true;
      clearInterval(interval);
    };
  };

  // ============================================================
  // LOGIC: MIXER PLAYBACK
  // ============================================================

  const switchToMixer = async () => {
    await ensureAudioContext();
    const pos = audioRef.current?.currentTime || 0;
    mixerOffsetRef.current = pos;
    try { audioRef.current.pause(); } catch (e) {}
    
    if (isPlaying) {
      startMixerPlayback(mixerOffsetRef.current);
    }
  };

  const startMixerPlayback = (offset = 0) => {
    if (!audioContextRef.current) return;
    const ac = audioContextRef.current;
    
    const buffers = stemsBufferRef.current || {};
    if (Object.keys(buffers).length < STEMS.length) {
      console.warn("Buffers not ready yet.");
      setIsPlaying(false);
      return;
    }

    stopAndClearAllSources();

    mixerIsPlayingRef.current = true;
    mixerStartTimeRef.current = ac.currentTime;
    mixerOffsetRef.current = offset;

    for (const s of STEMS) {
      if (!stemEnabled[s]) {
        stemsSourceRef.current[s] = null;
        continue;
      }
      try {
        const source = ac.createBufferSource();
        source.buffer = buffers[s];
        if (!stemsGainRef.current[s]) {
          const g = ac.createGain();
          g.gain.value = (stemVolumes[s] ?? 100) / 100;
          g.connect(masterGainRef.current);
          stemsGainRef.current[s] = g;
        }
        source.connect(stemsGainRef.current[s]);

        if (offset < source.buffer.duration) {
          source.start(ac.currentTime, offset);
        }
        source.onended = () => {
          stemsSourceRef.current[s] = null;
          const any = Object.values(stemsSourceRef.current).some(Boolean);
          if (!any) {
            mixerIsPlayingRef.current = false;
            setIsPlaying(false);
          }
        };
        stemsSourceRef.current[s] = source;
      } catch (err) {
        stemsSourceRef.current[s] = null;
      }
    }

    setIsPlaying(true);
    startMixerClock();
  };

  const stopMixerPlayback = () => {
    stopAndClearAllSources();
    stopMixerClock();
    setIsPlaying(false);
  };

  const toggleStem = async (stem) => {
    setStemEnabled((p) => ({ ...p, [stem]: !p[stem] }));
    if (!splitDone) return;

    await ensureAudioContext();
    const ac = audioContextRef.current;
    const willEnable = !stemEnabled[stem];

    if (willEnable) {
      const now = ac.currentTime;
      const elapsed = mixerIsPlayingRef.current ? now - mixerStartTimeRef.current : 0;
      const currentPos = mixerOffsetRef.current + elapsed;
      const buffer = stemsBufferRef.current[stem];
      if (!buffer) return;
      
      const source = ac.createBufferSource();
      source.buffer = buffer;
      
      if (!stemsGainRef.current[stem]) {
        const g = ac.createGain();
        g.gain.value = (stemVolumes[stem] ?? 100) / 100;
        g.connect(masterGainRef.current);
        stemsGainRef.current[stem] = g;
      }
      source.connect(stemsGainRef.current[stem]);
      
      if (currentPos < buffer.duration) {
        if (mixerIsPlayingRef.current) {
          source.start(now, currentPos);
        } else {
          source.disconnect();
          source.onended = null;
          stemsSourceRef.current[stem] = null;
          return;
        }
      }
      source.onended = () => {
        stemsSourceRef.current[stem] = null;
        const any = Object.values(stemsSourceRef.current).some(Boolean);
        if (!any) {
          mixerIsPlayingRef.current = false;
          setIsPlaying(false);
        }
      };
      stemsSourceRef.current[stem] = source;
    } else {
      try { stemsSourceRef.current[stem]?.stop(); } catch (e) {}
      stemsSourceRef.current[stem] = null;
    }
  };

  const changeStemVolume = (stem, value) => {
    const vol = Number(value);
    setStemVolumes((p) => ({ ...p, [stem]: vol }));
    if (stemsGainRef.current[stem]) {
      stemsGainRef.current[stem].gain.value = vol / 100;
    }
  };

  // ============================================================
  // LOGIC: GLOBAL CONTROLS
  // ============================================================

  const togglePlay = async () => {
    if (loadingStems) return;

    if (!splitDone) {
      if (isPlaying) pausePreSplit();
      else {
        await ensureAudioContext();
        await playPreSplit();
      }
      return;
    }
    
    await ensureAudioContext();
    if (isPlaying) stopMixerPlayback();
    else startMixerPlayback(mixerOffsetRef.current);
  };

  const seek = (newTime) => {
    if (!splitDone) {
      if (!audioRef.current) return;
      audioRef.current.currentTime = newTime;
      setAudioTime(newTime);
      return;
    }
    mixerOffsetRef.current = newTime;
    if (mixerIsPlayingRef.current) {
      startMixerPlayback(newTime);
    } else {
      setAudioTime(newTime);
    }
  };

  const startMixerClock = () => {
    stopMixerClock();
    mixerClockRef.current = setInterval(() => {
      if (!audioContextRef.current || !mixerIsPlayingRef.current) return;
      const now = audioContextRef.current.currentTime;
      const elapsed = now - mixerStartTimeRef.current;
      const current = mixerOffsetRef.current + elapsed;
      setAudioTime(current);
      const buf = stemsBufferRef.current?.vocals || Object.values(stemsBufferRef.current)[0];
      if (buf) setAudioDuration(buf.duration);
    }, 150);
  };

  const stopMixerClock = () => {
    if (mixerClockRef.current) {
      clearInterval(mixerClockRef.current);
      mixerClockRef.current = null;
    }
  };

  const formatTime = (sec) => {
    if (!sec || !isFinite(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // Helper to calculate progress percentage for gradients
  const getProgress = (current, total) => {
    if (!total) return 0;
    return (current / total) * 100;
  };

  // Minimal styles for the thumb only
  const rangeStyle = `
    .custom-range::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 12px;
      height: 12px;
      background: #7A745D;
      cursor: pointer;
      border-radius: 50%;
      transition: transform 0.1s;
      border: 2px solid #F8F3D9;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    }
    .custom-range::-webkit-slider-thumb:hover {
      transform: scale(1.2);
    }
  `;

  // ============================================================
  // RENDER UI
  // ============================================================
  return (
    <>
      <style>{rangeStyle}</style>

      {/* --- MOBILE MIXER (Bottom Sheet) --- */}
      <div
        className={`fixed inset-0 z-[1000] bg-black/40 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          mixerOpenMobile ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"
        }`}
        onClick={() => setMixerOpenMobile(false)}
      />
      
      <div
        className={`fixed inset-x-0 bottom-0 z-[1001] md:hidden transform transition-transform duration-300 ease-out ${
          mixerOpenMobile ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="bg-[#F8F3D9] dark:bg-[#3B362C] border-t border-[#B9B28A]/30 rounded-t-3xl shadow-2xl p-6 pb-8 max-h-[85vh] overflow-auto">
          <div className="w-12 h-1.5 bg-[#B9B28A]/50 rounded-full mx-auto mb-6" />
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg text-[#3B362C] dark:text-[#F8F3D9]">Stem Mixer</h3>
            <button onClick={() => setMixerOpenMobile(false)} className="p-2 rounded-full hover:bg-black/5">
              <X size={20} className="text-[#7A745D]" />
            </button>
          </div>
          <div className="space-y-6">
            {STEMS.map((s) => (
              <div key={s} className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleStem(s)}
                      className={`p-2.5 rounded-xl border transition-all ${
                        stemEnabled[s] 
                          ? "bg-[#7A745D] text-[#F8F3D9] border-[#7A745D]" 
                          : "bg-transparent text-[#B9B28A] border-[#B9B28A]"
                      }`}
                    >
                      {getStemIcon(s)}
                    </button>
                    <span className="font-medium capitalize text-[#3B362C] dark:text-[#F8F3D9]">{s}</span>
                  </div>
                  <span className="text-xs font-mono text-[#7A745D] w-8 text-right">{stemVolumes[s]}%</span>
                </div>
                {/* Styled Volume Slider */}
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={stemVolumes[s]}
                  onChange={(e) => changeStemVolume(s, e.target.value)}
                  disabled={!stemEnabled[s]}
                  className="w-full h-1.5 bg-transparent rounded-lg appearance-none cursor-pointer custom-range disabled:opacity-40"
                  style={{
                    background: `linear-gradient(to right, #7A745D ${stemVolumes[s]}%, rgba(185, 178, 138, 0.3) ${stemVolumes[s]}%)`
                  }}
                />
              </div>
            ))}
          </div>
          {(loadingStems || isSplitting) && (
            <div className="flex items-center justify-center gap-2 mt-6 text-sm text-[#7A745D] animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin" /> {loadingStems ? "Loading stems..." : "Processing audio..."}
            </div>
          )}
        </div>
      </div>

      {/* --- MAIN PLAYER BAR --- */}
      <div className="fixed left-0 right-0 bottom-0 z-[900] px-2 pb-2 md:pb-4 md:px-6 md:left-64 transition-all duration-300">
        <div className="max-w-screen-2xl mx-auto bg-[#F8F3D9] dark:bg-[#3B362C] border border-[#B9B28A]/40 rounded-2xl shadow-xl backdrop-blur-md">
          <div className="px-4 py-3 md:py-4 md:px-6">
            
            {/* Mobile View */}
            <div className="md:hidden flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="relative group">
                    <img 
                        src={currentSong?.thumbnail || "https://placehold.co/100"} 
                        alt="" 
                        className={`w-14 h-14 rounded-xl object-cover shadow-sm transition-transform duration-500 ${isPlaying ? "rotate-1" : ""}`} 
                    />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[#3B362C] dark:text-[#F8F3D9] truncate leading-tight">
                    {currentSong?.title || "Select a Song"}
                  </div>
                  <div className="text-xs font-medium text-[#7A745D] dark:text-[#B9B28A] truncate mt-0.5">
                    {currentSong?.artists?.join(", ")}
                  </div>
                </div>
                <button
                  onClick={togglePlay}
                  disabled={loadingStems || isSplitting}
                  className={`w-12 h-12 rounded-full bg-[#7A745D] text-[#F8F3D9] flex items-center justify-center shadow-lg active:scale-95 transition-all ${loadingStems ? "opacity-75" : ""}`}
                >
                  {loadingStems ? <Loader2 size={20} className="animate-spin" /> : (isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />)}
                </button>
              </div>

              {/* Mobile Progress Bar */}
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono text-[#7A745D] w-8 text-right">{formatTime(audioTime)}</span>
                <input
                  type="range"
                  min={0}
                  max={audioDuration}
                  value={audioTime}
                  onChange={(e) => seek(Number(e.target.value))}
                  className="flex-1 h-1 bg-transparent rounded-full appearance-none cursor-pointer custom-range"
                  style={{
                    background: `linear-gradient(to right, #7A745D ${getProgress(audioTime, audioDuration)}%, rgba(185, 178, 138, 0.3) ${getProgress(audioTime, audioDuration)}%)`
                  }}
                />
                <span className="text-[10px] font-mono text-[#7A745D] w-8">{formatTime(audioDuration)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-[#B9B28A]/20 pt-2 mt-1">
                <button className="p-2 text-[#B9B28A]"><Heart size={18} /></button>
                <button
                  onClick={() => setMixerOpenMobile(true)}
                  disabled={!splitDone}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold border border-[#B9B28A]/30 transition-all ${splitDone ? "bg-[#B9B28A]/10 text-[#7A745D]" : "opacity-50"}`}
                >
                  <Layers size={14} /> Mixer
                </button>
              </div>
            </div>

            {/* Desktop View */}
            <div className="hidden md:flex items-center justify-between gap-8">
              {/* Info */}
              <div className="flex items-center gap-4 w-1/4 min-w-[200px]">
                <div className={`relative w-14 h-14 rounded-lg overflow-hidden shadow-md transition-all duration-500 ${isPlaying ? "scale-100" : "scale-95 opacity-90"}`}>
                    <img src={currentSong?.thumbnail || "https://placehold.co/100"} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-[#3B362C] dark:text-[#F8F3D9] truncate">
                    {currentSong?.title || "No song selected"}
                  </div>
                  <div className="text-xs font-medium text-[#7A745D] dark:text-[#B9B28A] truncate mt-1">
                    {currentSong?.artists?.join(", ")}
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex flex-col items-center flex-1 max-w-2xl">
                <div className="flex items-center gap-6 mb-2">
                  <button
                    onClick={handleSplit}
                    disabled={isSplitting || splitDone}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                        isSplitting || loadingStems
                            ? "bg-[#B9B28A]/20 text-[#7A745D] cursor-wait" 
                            : splitDone 
                                ? "bg-green-100 text-green-700 border border-green-200" 
                                : "bg-transparent border border-[#7A745D] text-[#7A745D] hover:bg-[#7A745D] hover:text-[#F8F3D9]"
                    }`}
                  >
                    {isSplitting || loadingStems ? <Loader2 size={12} className="animate-spin" /> : <Layers size={12} />}
                    {isSplitting ? `Splitting ${splitProgress ?? 0}%` : (loadingStems ? "Loading..." : (splitDone ? "Stem Mode Active" : "Split Audio"))}
                  </button>

                  <button
                    onClick={togglePlay}
                    disabled={loadingStems || isSplitting}
                    className={`w-10 h-10 rounded-full bg-[#7A745D] text-[#F8F3D9] flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all ${loadingStems ? "opacity-75 cursor-wait" : ""}`}
                  >
                    {loadingStems ? <Loader2 size={18} className="animate-spin" /> : (isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />)}
                  </button>
                  <div className="w-[100px]" />
                </div>

                {/* Desktop Progress Bar */}
                <div className="w-full flex items-center gap-3">
                  <span className="text-xs font-mono text-[#7A745D] w-10 text-right">{formatTime(audioTime)}</span>
                  <div className="relative flex-1 h-4 flex items-center">
                    <input
                      type="range"
                      min={0}
                      max={audioDuration}
                      value={audioTime}
                      onChange={(e) => seek(Number(e.target.value))}
                      className="w-full h-1 bg-transparent rounded-full appearance-none cursor-pointer custom-range focus:outline-none"
                      style={{
                        background: `linear-gradient(to right, #7A745D ${getProgress(audioTime, audioDuration)}%, rgba(185, 178, 138, 0.3) ${getProgress(audioTime, audioDuration)}%)`
                      }}
                    />
                  </div>
                  <span className="text-xs font-mono text-[#7A745D] w-10">{formatTime(audioDuration)}</span>
                </div>
              </div>

              {/* Volume & Pin */}
              <div className="flex items-center justify-end gap-4 w-1/4">
                 <div className="flex items-center gap-2 group">
                    <Speaker size={18} className="text-[#B9B28A] group-hover:text-[#7A745D]" />
                    <input 
                        type="range" 
                        min={0} 
                        max={100} 
                        value={volume}
                        onChange={(e) => setVolume(Number(e.target.value))}
                        className="w-20 h-1 bg-transparent rounded-full appearance-none custom-range" 
                        style={{
                            background: `linear-gradient(to right, #7A745D ${volume}%, rgba(185, 178, 138, 0.3) ${volume}%)`
                        }}
                    />
                 </div>
                 {splitDone && (
                    <button
                        onClick={() => setMixerPinned(p => !p)}
                        className={`p-2 rounded-lg transition-all ${mixerPinned ? "bg-[#7A745D] text-[#F8F3D9]" : "hover:bg-[#B9B28A]/10 text-[#7A745D]"}`}
                    >
                        {mixerPinned ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                    </button>
                 )}
              </div>
            </div>

            {/* Desktop Inline Mixer */}
            <div className={`hidden md:block overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out ${splitDone && mixerPinned ? "max-h-40 opacity-100 mt-4 border-t border-[#B9B28A]/20 pt-4" : "max-h-0 opacity-0"}`}>
                <div className="grid grid-cols-4 gap-6">
                    {STEMS.map((s) => (
                        <div key={s} className="flex items-center gap-3 bg-[#B9B28A]/5 p-2 rounded-xl border border-[#B9B28A]/10">
                            <button
                                onClick={() => toggleStem(s)}
                                className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all shadow-sm ${stemEnabled[s] ? "bg-[#7A745D] text-[#F8F3D9]" : "bg-[#F8F3D9] text-[#B9B28A] border border-[#B9B28A]/30"}`}
                            >
                                {getStemIcon(s)}
                            </button>
                            <div className="flex-1 flex flex-col gap-1">
                                <div className="flex justify-between items-center px-1">
                                    <span className="text-xs font-bold uppercase tracking-wider text-[#3B362C] dark:text-[#B9B28A]">{s}</span>
                                    <span className="text-[10px] text-[#7A745D]">{stemVolumes[s]}%</span>
                                </div>
                                <input
                                    type="range"
                                    min={0}
                                    max={100}
                                    value={stemVolumes[s]}
                                    onChange={(e) => changeStemVolume(s, e.target.value)}
                                    className={`w-full h-1 bg-transparent rounded-full appearance-none cursor-pointer custom-range ${stemEnabled[s] ? "opacity-100" : "opacity-40"}`}
                                    style={{
                                        background: `linear-gradient(to right, #7A745D ${stemVolumes[s]}%, rgba(185, 178, 138, 0.3) ${stemVolumes[s]}%)`
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

          </div>
        </div>
      </div>

      <audio ref={audioRef} hidden />
    </>
  );
}

export { Player };