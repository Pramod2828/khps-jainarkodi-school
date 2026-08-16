'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GraduationCap, Menu, X, LogIn, Phone, Calendar, BookOpen, Bell, Image as ImageIcon, Info, Download, Activity, LayoutDashboard } from 'lucide-react';
import LanguageSelector from './LanguageSelector';

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const navLinks = [
    { name: 'Home', href: '/', icon: GraduationCap },
    { name: 'Homework', href: '/homework', icon: BookOpen },
    { name: 'Notices', href: '/notices', icon: Bell },
    { name: 'Activities', href: '/activities', icon: Activity },
    { name: 'Gallery', href: '/gallery', icon: ImageIcon },
    { name: 'About', href: '/about', icon: Info },
    { name: 'Calendar', href: '/calendar', icon: Calendar },
    { name: 'Downloads', href: '/downloads', icon: Download },
    { name: 'Contact', href: '/contact', icon: Phone },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-emerald-100 shadow-xs">
      {/* Main Logo & Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="flex justify-between items-center min-h-[52px] gap-3">
          
          {/* Logo & School Name */}
          <Link href="/" className="flex items-center gap-2 group shrink-0 min-w-0">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-white p-0.5 border border-emerald-100 flex items-center justify-center shadow-xs group-hover:scale-105 transition shrink-0 overflow-hidden">
              <img src="/logo.png" alt="Government of Karnataka Emblem" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col justify-center min-w-0">
              <h1 className="text-[11px] sm:text-base font-extrabold text-slate-900 tracking-tight leading-tight group-hover:text-emerald-700 transition uppercase truncate">
                KHPS JAINARAKODI
              </h1>
              <p className="text-[8px] sm:text-[10px] font-bold text-emerald-600 tracking-wider uppercase truncate">
                Govt Primary School
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden xl:flex items-center gap-0.5">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-800 font-extrabold shadow-2xs'
                      : 'text-slate-600 hover:text-emerald-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 opacity-75" />
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Right Controls: Language Selector & Admin Portal */}
          <div className="hidden xl:flex items-center gap-2 shrink-0">
            <LanguageSelector />
            <Link
              href="/login"
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 shrink-0"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Admin Portal
            </Link>
          </div>

          {/* Mobile / Tablet Menu Button */}
          <div className="flex items-center gap-2 xl:hidden">
            <LanguageSelector />
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-slate-700 hover:text-emerald-700 rounded-xl hover:bg-slate-100 transition shrink-0"
              aria-label="Toggle Navigation Menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile / Tablet Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="xl:hidden bg-white border-b border-slate-200 px-4 pt-2 pb-4 space-y-1 shadow-xl animate-fadeIn">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold ${
                  isActive
                    ? 'bg-emerald-600 text-white font-bold shadow-xs'
                    : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {link.name}
              </Link>
            );
          })}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <Link
              href="/login"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 w-full bg-emerald-600 text-white py-2.5 rounded-xl font-bold text-xs shadow-xs"
            >
              <LayoutDashboard className="w-4 h-4" /> Admin Portal
            </Link>
            <Link
              href="/login"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 w-full bg-slate-900 text-white py-2 rounded-xl font-bold text-xs"
            >
              <LogIn className="w-4 h-4" /> Teacher Login
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
