import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Library, Download, Settings, UploadIcon, Heart, Music2, Menu, X } from 'lucide-react';

const menuItems = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Library, label: 'Library', path: '/library' },
  { icon: Heart, label: 'Liked Songs', path: '/likedsongs' },
  { icon: Download, label: 'Downloads', path: '/downloads' },
  { icon: Settings, label: 'Settings', path: '/settings' },
  { icon: UploadIcon, label: 'Upload', path: '/upload' }
];

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  // Close sidebar on route change
  useEffect(() => { setIsOpen(false); }, [location.pathname]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => window.innerWidth >= 768 && setIsOpen(false);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
      {/* --- MOBILE TRIGGER (Visible < md) --- */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#F8F3D9] dark:bg-[#3B362C] border-b border-[#B9B28A] dark:border-[#7A745D] z-30 flex items-center px-4 justify-between">
         <div className="flex items-center gap-2">
            <Music2 className="w-6 h-6 text-[#504B38] dark:text-[#F8F3D9]" />
            <span className="font-bold text-lg text-[#504B38] dark:text-[#F8F3D9]">Tunify</span>
         </div>
         <button onClick={() => setIsOpen(true)} className="p-2 text-[#504B38] dark:text-[#F8F3D9]">
            <Menu size={24} />
         </button>
      </div>

      {/* --- BACKDROP (Mobile Only) --- */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* --- SIDEBAR (Always Fixed) --- */}
      <aside className={`
        fixed top-0 bottom-0 left-0 z-50 w-64
        bg-[#F8F3D9] dark:bg-[#3B362C] border-r border-[#B9B28A] dark:border-[#7A745D]
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 
      `}>
        {/* Header */}
        <div className="h-20 flex items-center px-6 gap-3 border-b border-transparent md:border-[#B9B28A]/20">
            <Music2 className="w-8 h-8 text-[#504B38] dark:text-[#F8F3D9]" />
            <span className="text-xl font-bold text-[#504B38] dark:text-[#F8F3D9]">Tunify</span>
             {/* Close Btn (Mobile) */}
            <button onClick={() => setIsOpen(false)} className="ml-auto md:hidden text-[#504B38] dark:text-[#F8F3D9]">
              <X size={24} />
            </button>
        </div>

        {/* Links */}
        <nav className="p-4 space-y-2 overflow-y-auto h-[calc(100%-5rem)]">
           {menuItems.map((item, idx) => {
             const isActive = location.pathname === item.path;
             return (
               <Link key={idx} to={item.path} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${isActive ? 'bg-[#504B38] text-[#F8F3D9]' : 'text-[#504B38] dark:text-[#F8F3D9] hover:bg-[#B9B28A]/20'}`}>
                 <item.icon size={20} />
                 <span className="font-medium">{item.label}</span>
               </Link>
             )
           })}
        </nav>
      </aside>
    </>
  );
}