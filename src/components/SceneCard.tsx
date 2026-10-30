import React from 'react';
import {
  Play,
  Pause,
  MapPin,
  Calendar,
  Volume2,
  Quote,
  Sparkles,
  Download,
  Copy,
  Check,
  CheckCircle2,
  Loader2,
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
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    const textToCopy = scene.paragraphs.join('\n\n');
    navigator.clipboard.writeText(showTashkeel ? textToCopy : removeTashkeel(textToCopy));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {hasCachedAudio && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-emerald-950/60 text-emerald-400 border border-emerald-800/40"
              title="الصوت جاهز في الذاكرة المؤقتة"
            >
              <CheckCircle2 className="w-3 h-3" />
              جاهز
            </span>
          )}

          <button
            onClick={handleCopy}
            className="p-2 rounded-lg bg-stone-800/60 hover:bg-stone-700 text-stone-400 hover:text-stone-200 transition border border-stone-700/60"
            title="نسخ نص هذا المشهد"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          {hasCachedAudio && (
            <button
              onClick={onDownloadSceneAudio}
              className="p-2 rounded-lg bg-stone-800/60 hover:bg-stone-700 text-stone-400 hover:text-stone-200 transition border border-stone-700/60"
              title="تحميل المقطع الصوتي لهذا المشهد"
            >
              <Download className="w-4 h-4" />
            </button>
          )}

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
                <span>جاري التوليد...</span>
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
        {scene.paragraphs.map((p, pIdx) => {
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

      {/* Key Quote Callout if exists */}
      {scene.keyQuote && (
        <div className="mt-1 pt-3 border-t border-stone-800/60 flex items-center gap-2.5 text-amber-300/90 text-sm italic font-serif">
          <Quote className="w-4 h-4 text-amber-500/70 shrink-0" />
          <span>«{showTashkeel ? scene.keyQuote : removeTashkeel(scene.keyQuote)}»</span>
        </div>
      )}
    </article>
  );
};
