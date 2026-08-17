'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import { api, getAssetUrl, IMAGE_FALLBACK_SVG } from '@/services/api';
import { GalleryItem, GalleryCategory } from '@/types';
import { Image as ImageIcon, X, Maximize2 } from 'lucide-react';

export default function GalleryPublicPage() {
  const [galleryPhotos, setGalleryPhotos] = useState<GalleryItem[]>([]);
  const [categories, setCategories] = useState<GalleryCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [lightboxImage, setLightboxImage] = useState<GalleryItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await api.get('/gallery/categories');
        if (res.data.success) setCategories(res.data.data);
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    }
    fetchCategories();
  }, []);

  useEffect(() => {
    async function fetchGallery() {
      setLoading(true);
      try {
        const res = await api.get(`/gallery?limit=60&category_id=${selectedCategory}`);
        if (res.data.success) {
          setGalleryPhotos(res.data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch gallery photos:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchGallery();
  }, [selectedCategory]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <Navbar />

      <section className="bg-gradient-to-r from-teal-950 via-slate-900 to-emerald-950 text-white py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-2.5">
          <div className="inline-flex items-center gap-1.5 bg-teal-800/60 text-teal-200 text-[11px] sm:text-xs font-bold px-3 py-1 rounded-full border border-teal-500/30">
            <ImageIcon className="w-3.5 h-3.5" /> Memorable School Moments
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">School Photo Gallery</h1>
          <p className="text-xs sm:text-sm text-slate-200 max-w-2xl leading-relaxed">
            Browse captured photos of our campus, classrooms, sports events, cultural programs, and student activities.
          </p>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1 space-y-6 sm:space-y-8 w-full overflow-x-hidden">
        <div className="bg-white p-3 sm:p-4 rounded-2xl shadow-xs border border-slate-200/80 w-full overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-2 min-w-max pb-0.5">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold transition shrink-0 ${
                selectedCategory === 'all'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All Photos
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(String(cat.id))}
                className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold transition shrink-0 ${
                  selectedCategory === String(cat.id)
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {cat.category_name}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <LoadingState message="Loading photo gallery..." />
        ) : galleryPhotos.length === 0 ? (
          <div className="py-4 sm:py-8 flex justify-center">
            <div className="w-full max-w-lg">
              <EmptyState
                title="No Photos Available"
                message="No photos found under this category yet."
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6 w-full">
            {galleryPhotos.map((photo) => (
              <div
                key={photo.id}
                onClick={() => setLightboxImage(photo)}
                className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-xs hover:shadow-lg transition group cursor-pointer relative"
              >
                <div className="h-56 bg-slate-100 overflow-hidden relative">
                  <img
                    src={getAssetUrl(photo.image_url)}
                    alt={photo.title}
                    loading="lazy"
                    onError={(e) => { (e.target as HTMLImageElement).src = IMAGE_FALLBACK_SVG; }}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                    <Maximize2 className="w-8 h-8 drop-shadow-md" />
                  </div>
                  <span className="absolute bottom-2 left-2 bg-slate-900/80 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-md backdrop-blur-xs">
                    {photo.category_name}
                  </span>
                </div>
                <div className="p-3.5">
                  <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{photo.title}</h4>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 text-white hover:text-slate-300 p-2 bg-white/10 rounded-full"
          >
            <X className="w-6 h-6" />
          </button>

          <div
            className="max-w-4xl w-full bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl p-4 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="max-h-[75vh] flex items-center justify-center bg-slate-950 rounded-2xl overflow-hidden">
              <img
                src={getAssetUrl(lightboxImage.image_url)}
                alt={lightboxImage.title}
                className="max-h-[75vh] w-auto object-contain"
              />
            </div>
            <div className="text-white px-2">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                {lightboxImage.category_name}
              </span>
              <h3 className="text-lg font-bold">{lightboxImage.title}</h3>
              {lightboxImage.description && (
                <p className="text-xs text-slate-300 mt-1">{lightboxImage.description}</p>
              )}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
