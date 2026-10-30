import React, { useState } from 'react';
import {
  X,
  Sliders,
  Play,
  Pause,
  Loader2,
  Sparkles,
  Volume2,
  Check,
  RotateCcw,
  Download,
} from 'lucide-react';
import { fetchNarrationAudio, downloadWavBlob } from '../utils/audioService';

interface DirectorStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVoice: string;
  setSelectedVoice: (v: string) => void;
}

export const DirectorStudioModal: React.FC<DirectorStudioModalProps> = ({
  isOpen,
  onClose,
  selectedVoice,
  setSelectedVoice,
}) => {
  const [testText, setTestText] = useState(
    '«لَمْ يَكُنْ تَوْقِيعًا عَلَى اتِّفَاقِ سَلَام، بَلْ هُدْنَة. غَيْرَ أَنَّهَا حَمَلَتْ مِنَ الشُّرُوطِ مَا جَعَلَ مِنْهَا بِدَايَةَ النِّهَايَةِ لِلدَّوْلَةِ العُثْمَانِيَّة.»'
  );
  const [customStyle, setCustomStyle] = useState(
    'A deep, authoritative, dignified male documentary narrator speaking flawless classical Modern Standard Arabic (فصحى). Measured, slow to moderate pace, with solemn weight on historical turning points.'
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  if (!isOpen) return null;

  const handleTestAudio = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
      const res = await fetchNarrationAudio(testText, selectedVoice, customStyle);
      setAudioUrl(res.url);
      setAudioBlob(res.blob);

      const audio = new Audio(res.url);
      audioRef.current = audio;
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => setIsPlaying(false);
      await audio.play();
      setIsPlaying(true);
    } catch (err: any) {
      console.error('Test generation error:', err);
      setErrorMsg(err.message || 'فشل توليد الصوت. يرجى التحقق من الخادم.');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlayAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#12141f] border border-amber-900/50 rounded-2xl shadow-2xl p-6 sm:p-7 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-100 font-display">
                استوديو المخرج وهندسة الصوت الوثائقي
              </h2>
              <p className="text-xs text-stone-400">
                فحص معايير نموذج Gemini TTS وضبط نبرة السرد التاريخي
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-stone-800/80 hover:bg-stone-700 text-stone-400 hover:text-stone-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Specs Overview */}
        <div className="my-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="bg-stone-900/70 p-3 rounded-xl border border-stone-800">
            <span className="text-stone-400 block mb-1">النموذج الصوتي:</span>
            <span className="font-mono text-amber-400 font-bold">gemini-3.8-flash-lite-tts</span>
            <p className="text-[11px] text-stone-400 mt-0.5">توليد WAV أحادي 24kHz فائق النقاء</p>
          </div>
          <div className="bg-stone-900/70 p-3 rounded-xl border border-stone-800">
            <span className="text-stone-400 block mb-1">الراوي الافتراضي:</span>
            <span className="font-bold text-stone-200">Charon (شارون)</span>
            <p className="text-[11px] text-stone-400 mt-0.5">صوت رجالي عميق ورصين مناسب للأفلام الوثائقية</p>
          </div>
        </div>

        {/* Text Sandbox */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5">
              نص التجربة السريعة (مع التشكيل الكامل):
            </label>
            <textarea
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              rows={3}
              className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-sm font-narrative text-stone-200 focus:outline-none focus:border-amber-500 leading-relaxed resize-none"
              dir="rtl"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5">
              توجيه النبرة للموديل (Directorial Style Prompt):
            </label>
            <textarea
              value={customStyle}
              onChange={(e) => setCustomStyle(e.target.value)}
              rows={2}
              className="w-full bg-stone-950 border border-stone-800 rounded-xl p-2.5 text-xs text-stone-300 focus:outline-none focus:border-amber-500 leading-relaxed resize-none font-mono"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <label className="text-xs text-stone-400">اختر صوت الراوي:</label>
              <select
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                className="bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1 text-xs text-stone-200"
              >
                <option value="Charon">Charon (شارون - صوت عميق ورصين)</option>
                <option value="Fenrir">Fenrir (فنرير - صوت جهوري)</option>
                <option value="Puck">Puck (بوك - صوت حيوي)</option>
                <option value="Kore">Kore (كور - صوت نسائي)</option>
                <option value="Zephyr">Zephyr (زفير - صوت متزن)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              {audioBlob && (
                <button
                  onClick={() => downloadWavBlob(audioBlob, 'test-sample.wav')}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium transition"
                  title="تحميل عينة التجربة"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>تحميل العينة</span>
                </button>
              )}

              {audioUrl && !isLoading && (
                <button
                  onClick={togglePlayAudio}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium transition"
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                  <span>{isPlaying ? 'إيقاف' : 'إعادة الاستماع'}</span>
                </button>
              )}

              <button
                onClick={handleTestAudio}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold shadow-md shadow-amber-500/20 transition active:scale-95 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري التوليد...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 fill-current" />
                    <span>توليد واستماع فوري</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-900/50 text-red-300 text-xs leading-relaxed">
              {errorMsg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
