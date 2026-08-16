'use client';

import { useEffect, useState } from 'react';
import { Languages } from 'lucide-react';

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: any;
  }
}

export default function LanguageSelector() {
  const [selectedLang, setSelectedLang] = useState<string>('en');

  useEffect(() => {
    // Check cookie for current Google Translate language
    const match = document.cookie.match(/googtrans=\/en\/([a-z]{2})/);
    if (match && match[1]) {
      setSelectedLang(match[1]);
    }

    // Add Google Translate script dynamically if missing
    if (!document.getElementById('google-translate-script')) {
      window.googleTranslateElementInit = () => {
        if (window.google?.translate?.TranslateElement) {
          new window.google.translate.TranslateElement(
            {
              pageLanguage: 'en',
              includedLanguages: 'en,kn,hi,mr,te,ta',
              autoDisplay: false,
            },
            'google_translate_element'
          );
        }
      };

      const script = document.createElement('script');
      script.id = 'google-translate-script';
      script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const changeLanguage = (langCode: string) => {
    setSelectedLang(langCode);

    // Set cookie for Google Translate
    const domain = window.location.hostname;
    document.cookie = `googtrans=/en/${langCode}; path=/; domain=${domain}`;
    document.cookie = `googtrans=/en/${langCode}; path=/`;

    // Trigger select change on Google Translate combo element
    const selectElem = document.querySelector('.goog-te-combo') as HTMLSelectElement;
    if (selectElem) {
      selectElem.value = langCode;
      selectElem.dispatchEvent(new Event('change'));
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="relative inline-flex items-center gap-1">
      {/* Hidden Google Translate Target */}
      <div id="google_translate_element" className="hidden" />

      <div className="flex items-center gap-1.5 bg-emerald-800/90 hover:bg-emerald-700/90 text-white px-2.5 py-1 rounded-lg border border-emerald-700/60 shadow-2xs transition">
        <Languages className="w-3.5 h-3.5 text-amber-300 shrink-0" />
        <select
          value={selectedLang}
          onChange={(e) => changeLanguage(e.target.value)}
          className="bg-transparent text-[11px] font-bold text-white outline-none cursor-pointer pr-1"
          aria-label="Select Language"
        >
          <option value="en" className="text-slate-900 font-bold">🇬🇧 English</option>
          <option value="kn" className="text-slate-900 font-bold">🇮🇳 ಕನ್ನಡ (Kannada)</option>
          <option value="hi" className="text-slate-900 font-bold">🇮🇳 हिंदी (Hindi)</option>
          <option value="mr" className="text-slate-900 font-bold">🇮🇳 मराठी (Marathi)</option>
          <option value="te" className="text-slate-900 font-bold">🇮🇳 తెలుగు (Telugu)</option>
          <option value="ta" className="text-slate-900 font-bold">🇮🇳 தமிழ் (Tamil)</option>
        </select>
      </div>
    </div>
  );
}
