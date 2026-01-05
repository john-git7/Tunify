import React, { useState } from "react";
import { Routes, Route } from "react-router-dom";
import TopBar from "./components/TopBar";
import { AuthModal } from "./components/AuthModal";
import Sidebar from "./components/Sidebar";
import { Player } from "./components/Player";
import Home from "./components/Home";
import LikedSongsPage from "./components/LikedSongsPage";
import Downloads from "./components/Downloads";
import Library from "./components/Library";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function App() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentSong, setCurrentSong] = useState(null);
  const [selectedStem, setSelectedStem] = useState("mix");

  return (
    <div className={`${isDarkMode ? "dark" : ""} min-h-screen bg-[#F8F3D9] dark:bg-[#3B362C]`}>
      
      {/* 1. SIDEBAR (Fixed, ignores parent flex) */}
      <Sidebar />

      {/* 2. MAIN CONTENT WRAPPER 
          - md:pl-64: Adds 256px padding on Desktop to make room for sidebar
          - pt-16: Adds padding top on Mobile to clear the hamburger menu
          - md:pt-0: Removes that top padding on Desktop
      */}
      <div className="flex flex-col min-h-screen transition-all duration-300 md:pl-64 pt-16 md:pt-0">
        
        {/* Topbar */}
        <div className="hidden md:block">
           {/* We hide the original TopBar on mobile because Sidebar has its own hamburger header now. 
               Or you can keep it visible if it contains search/auth only. */}
           <TopBar
             onAuthClick={() => setIsAuthModalOpen(true)}
             onThemeToggle={() => setIsDarkMode(!isDarkMode)}
           />
        </div>

        {/* Routes Content */}
        <main className="flex-1 overflow-y-auto p-4 pb-32">
          <Routes>
            <Route path="/" element={<Home onSongClick={setCurrentSong} />} />
            <Route path="/likedsongs" element={<LikedSongsPage onSongClick={setCurrentSong} selectedStem={selectedStem} setSelectedStem={setSelectedStem} />} />
            <Route path="/downloads" element={<Downloads onPlay={setCurrentSong} />} />
            <Route path="/library" element={<Library />} />
          </Routes>
        </main>

        {/* Global Player (Fixed at bottom) */}
        {currentSong && (
          <div className="fixed bottom-0 right-0 left-0 md:left-64 z-50">
             {/* md:left-64 ensures player doesn't cover the sidebar on desktop */}
            <Player 
              currentSong={currentSong} 
              selectedStem={selectedStem} 
              setSelectedStem={setSelectedStem} 
            />
          </div>
        )}
      </div>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      <ToastContainer position="top-right" autoClose={500} />
    </div>
  );
}

export default App;