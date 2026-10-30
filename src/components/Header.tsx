import React from 'react';
import { BookOpen, Sliders, Volume2, Sparkles, Copy, Check, Type } from 'lucide-react';
import { DOCUMENTARY_METADATA } from '../data/mudrosScript';

interface HeaderProps {
  showTashkeel: boolean;
  setShowTashkeel: (val: boolean) => void;
  fontSize: number;
  setFontSize: React.Dispatch<React.SetStateAction<number>>;
  onOpenDirectorModal: () => void;
  onCopyAllText: () => void;
  copied: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  showTashkeel,
  setShowTashkeel,
  fontSize,
  setFontSize,
  onOpenDirectorModal,
  onCopyAllText,
  copied,
}) => {
  return (
    <header className="relative w-full border-b border-amber-900/30 bg-gradient-to-b from-[#13151f] via-[#0e1017] to-[#0b0c10] pt-8 pb-7 px-4 sm:px-8">
      {/* Subtle ambient historical backdrop glow */}
      <div className="absolute top-0 right-1/4 w-96 h-36 bg-amber-600/5 blur-3xl pointer-events-none rounded-full" />
      <div className="absolute top-0 left-1/4 w-96 h-36 bg-red-950/10 blur-3xl pointer-events-none rounded-full" />

      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20 tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              سرد وثائقي تاريخي مسموع
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs bg-stone-800/80 text-stone-300 border border-stone-700/50">
              30 أكتوبر 1918
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs bg-red-950/50 text-red-300 border border-red-900/40">
              البارجة أغاممنون • ميناء مودروس
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black font-display text-stone-100 tracking-tight leading-snug">
            {showTashkeel ? DOCUMENTARY_METADATA.title : DOCUMENTARY_METADATA.titlePlain}
          </h1>

          <p className="mt-2 text-stone-400 text-sm sm:text-base max-w-3xl leading-relaxed">
            قراءة إذاعية متأنية بصوت راوٍ وثائقي عميق ورصين بالعربية الفصحى مع التشكيل الكامل، مراعاة الوقفات، والتدرج الدرامي من اشتعال الجبهات إلى سقوط إمبراطورية الستة قرون.
          </p>
        </div>

        {/* Action controls */}
        <div className="flex flex-wrap items-center gap-2.5 self-stretch md:self-auto justify-end">
          {/* Tashkeel Toggle */}
          <button
            onClick={() => setShowTashkeel(!showTashkeel)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium transition border ${
              showTashkeel
                ? 'bg-amber-500/20 text-amber-200 border-amber-500/40'
                : 'bg-stone-800/80 text-stone-400 border-stone-700 hover:text-stone-200'
            }`}
            title="إظهار أو إخفاء علامات التشكيل"
          >
            <Type className="w-3.5 h-3.5" />
            <span>{showTashkeel ? 'التشكيل مُفعّل' : 'بدون تشكيل'}</span>
          </button>

          {/* Font Size Selector */}
          <div className="flex items-center bg-stone-800/70 border border-stone-700/60 rounded-xl px-2 py-1 gap-1.5 text-xs text-stone-300">
            <span className="text-stone-400 text-[11px]">حجم الخط:</span>
            <button
              onClick={() => setFontSize((s) => Math.max(16, s - 2))}
              className="px-2 py-0.5 rounded hover:bg-stone-700 active:scale-95 text-stone-200 font-bold"
              title="تصغير الخط"
            >
              -A
            </button>
            <span className="text-[11px] font-mono text-amber-400">{fontSize}px</span>
            <button
              onClick={() => setFontSize((s) => Math.min(28, s + 2))}
              className="px-2 py-0.5 rounded hover:bg-stone-700 active:scale-95 text-stone-200 font-bold"
              title="تكبير الخط"
            >
              +A
            </button>
          </div>

          {/* Copy Script */}
          <button
            onClick={onCopyAllText}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-stone-800/80 hover:bg-stone-700 text-stone-200 border border-stone-700/70 transition active:scale-95"
            title="نسخ النص الكامل للوثائقي"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-stone-400" />}
            <span>{copied ? 'تم النسخ!' : 'نسخ النص'}</span>
          </button>

          {/* Director's Studio */}
          <button
            onClick={onOpenDirectorModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-semibold shadow-md shadow-amber-900/20 transition active:scale-95"
            title="استوديو المخرج: ضبط معايير النبرة وتجربة نصوص إضافية"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>استوديو المخرج</span>
          </button>
        </div>
      </div>
    </header>
  );
};
