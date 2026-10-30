import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  MapPin,
  Calendar,
  Quote,
  Sparkles,
  Download,
  Copy,
  Check,
  CheckCircle2,
  Loader2,
  Edit3,
  RotateCcw,
  Save,
  X,
  Volume2,
} from 'lucide-react';
import { ScriptScene, removeTashkeel } from '../data/mudrosScript';

interface SceneCardProps {
  scene: ScriptScene;
  index: number;
  isActive: boolean;
  isPlayingThisScene: boolean;
  isLoadingThisScene: boolean;
  onPlayScene: () => void;
  showTashkeel: boolean;
  fontSize: number;
  onDownloadSceneAudio: () => void;
  hasCachedAudio: boolean;
  customText?: string;
  onSaveCustomText: (sceneId: number, newText: string, andGenerateSpeech?: boolean) => void;
  onResetCustomText: (sceneId: number) => void;
}

export const SceneCard: React.FC<SceneCardProps> = ({
  scene,
  index,
  isActive,
  isPlayingThisScene,
  isLoadingThisScene,
  onPlayScene,
  showTashkeel,
  fontSize,
  onDownloadSceneAudio,
  hasCachedAudio,
  customText,
  onSaveCustomText,
  onResetCustomText,
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(customText || scene.paragraphs.join('\n\n'));

  // Sync editText if customText changes externally
  useEffect(() => {
    setEditText(customText || scene.paragraphs.join('\n\n'));
  }, [customText, scene.paragraphs]);

  const activeText = customText || scene.paragraphs.join('\n\n');
  const paragraphs = activeText.split('\n\n').filter((p) => p.trim().length > 0);
  const isModified = !!customText && customText.trim() !== scene.paragraphs.join('\n\n').trim();

  const handleCopy = () => {
    navigator.clipboard.writeText(showTashkeel ? activeText : removeTashkeel(activeText));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveAndGenerate = () => {
    onSaveCustomText(scene.id, editText, true);
    setIsEditing(false);
  };

  const handleSaveOnly = () => {
    onSaveCustomText(scene.id, editText, false);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditText(activeText);
    setIsEditing(false);
  };

  const handleReset = () => {
    onResetCustomText(scene.id);
    setEditText(scene.paragraphs.join('\n\n'));
    setIsEditing(false);
  };

  return (
    <article
      id={`scene-${scene.id}`}
      className={`relative rounded-2xl transition-all duration-300 border ${
        isActive
          ? 'bg-gradient-to-b from-[#161a29] to-[#0f121d] border-amber-500/60 shadow-xl shadow-amber-950/20 ring-1 ring-amber-500/20'
          : 'bg-[#10121a]/90 hover:bg-[#131622] border-stone-800/80 hover:border-stone-700'
      } p-5 sm:p-7 flex flex-col gap-5`}
    >
      {/* Top Header: Scene index, Title, Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800/80 pb-4">
        <div className="flex items-start sm:items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border transition ${
              isActive
                ? 'bg-amber-500 text-stone-950 border-amber-400 font-mono shadow-md shadow-amber-500/20'
                : 'bg-stone-800/80 text-stone-300 border-stone-700 font-mono'
            }`}
          >
            0{scene.id}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-amber-400">
                المشهد {scene.id}
              </span>
              <span className="text-stone-500">•</span>
              <span className="inline-flex items-center gap-1 text-xs text-stone-400">
                <Calendar className="w-3 h-3 text-stone-400" />
                {scene.year}
              </span>
              <span className="text-stone-500">•</span>
              <span className="inline-flex items-center gap-1 text-xs text-stone-400">
                <MapPin className="w-3 h-3 text-stone-400" />
                {scene.location}
              </span>

              {isModified && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  <Edit3 className="w-3 h-3" />
                  نص مُعدَّل مخصص
                </span>
              )}
            </div>
            <h3 className="text-lg sm:text-xl font-bold font-display text-stone-100">
              {scene.title}
            </h3>
            <p className="text-xs text-stone-400 mt-0.5">
              {scene.subtitle}
            </p>
          </div>
        </div>

        {/* Scene Actions */}
        <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
          {/* Edit text toggle */}
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
              isEditing
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                : 'bg-stone-800/60 hover:bg-stone-700 text-stone-300 border-stone-700/60'
            }`}
            title="تعديل نص هذا المشهد وتحديث نطقه بصوت الراوي"
          >
            <Edit3 className="w-3.5 h-3.5 text-amber-400" />
            <span>{isEditing ? 'إغلاق المحرر' : 'تعديل النص'}</span>
          </button>

          <button
            onClick={handleCopy}
            className="p-2 rounded-lg bg-stone-800/60 hover:bg-stone-700 text-stone-400 hover:text-stone-200 transition border border-stone-700/60"
            title="نسخ نص هذا المشهد"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          <button
            onClick={onDownloadSceneAudio}
            className="p-2 rounded-lg bg-stone-800/60 hover:bg-stone-700 text-stone-400 hover:text-stone-200 transition border border-stone-700/60"
            title="تحميل الملف الصوتي (WAV) لهذا المشهد"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Main Play Scene button */}
          <button
            onClick={onPlayScene}
            disabled={isLoadingThisScene}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition shadow-md ${
              isPlayingThisScene
                ? 'bg-amber-500 text-stone-950 shadow-amber-500/20'
                : 'bg-stone-800 hover:bg-stone-700 text-stone-100 border border-stone-700'
            }`}
          >
            {isLoadingThisScene ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                <span>جاري تحضير الصوت...</span>
              </>
            ) : isPlayingThisScene ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>إيقاف المشهد</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>استماع للمشهد</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* In-place Text Editor Modal / Container */}
      {isEditing ? (
        <div className="bg-[#0b0d14] rounded-2xl p-5 border border-amber-500/40 shadow-inner flex flex-col gap-3.5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <label className="text-xs font-bold text-amber-300">
                محرر نص المشهد — يمكنك تغيير الكلمات أو التشكيل وتوليد النطق مباشرة:
              </label>
            </div>
            {isModified && (
              <button
                onClick={handleReset}
                className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1 transition"
                title="إلغاء التعديلات واستعادة النص الأصلي"
              >
                <RotateCcw className="w-3 h-3" />
                <span>استعادة النص الأصلي</span>
              </button>
            )}
          </div>

          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={6}
            dir="rtl"
            className="w-full bg-[#12141e] border border-amber-900/50 rounded-xl p-4 text-stone-100 text-base font-narrative leading-loose focus:outline-none focus:border-amber-500 transition shadow-inner resize-y"
            placeholder="اكتب أو عدل النص هنا مع الحفاظ على التشكيل إن رغبت..."
          />

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <p className="text-[11px] text-stone-400">
              💡 عند الضغط على <strong className="text-amber-300">«توليد وتحديث النطق»</strong>، سيقوم الموديل بقراءة نصك المعدل بصوت الراوي الوثائقي نفسه وحفظه.
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCancelEdit}
                className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs transition"
              >
                إلغاء
              </button>
              <button
                onClick={handleSaveOnly}
                className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium border border-stone-700 transition"
                title="حفظ النص المكتوب فقط دون إعادة توليد الصوت حالياً"
              >
                حفظ النص فقط
              </button>
              <button
                onClick={handleSaveAndGenerate}
                disabled={isLoadingThisScene}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-xs shadow-md shadow-amber-600/20 transition active:scale-95 disabled:opacity-50"
              >
                {isLoadingThisScene ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري التوليد...</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4 fill-current" />
                    <span>توليد وتحديث النطق فورا</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Director's Tone Directive Callout */}
          <div className="bg-amber-950/20 rounded-xl p-3 border border-amber-900/30 flex items-start gap-2.5 text-xs text-amber-200/90 leading-relaxed">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-400 ml-1">توجيه الراوي والمخرج:</span>
              <span>{scene.toneDescription}</span>
            </div>
          </div>

          {/* Narrative Paragraphs */}
          <div className="flex flex-col gap-4 font-narrative" style={{ fontSize: `${fontSize}px` }}>
            {paragraphs.map((p, pIdx) => {
              const displayText = showTashkeel ? p : removeTashkeel(p);
              const isQuote = scene.keyQuote && p.includes(scene.keyQuote);

              return (
                <p
                  key={pIdx}
                  className={`leading-[2.2] tracking-wide text-stone-200 text-justify transition-all duration-200 ${
                    isQuote
                      ? 'bg-amber-500/5 border-r-2 border-amber-500/60 pr-3 rounded-l-lg'
                      : ''
                  } ${isActive ? 'text-stone-100 font-medium' : 'text-stone-300'}`}
                >
                  {displayText}
                </p>
              );
            })}
          </div>

          {/* Key Quote Callout if exists and not modified */}
          {!isModified && scene.keyQuote && (
            <div className="mt-1 pt-3 border-t border-stone-800/60 flex items-center gap-2.5 text-amber-300/90 text-sm italic font-serif">
              <Quote className="w-4 h-4 text-amber-500/70 shrink-0" />
              <span>«{showTashkeel ? scene.keyQuote : removeTashkeel(scene.keyQuote)}»</span>
            </div>
          )}
        </>
      )}
    </article>
  );
};
