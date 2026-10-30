import React from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Volume2,
  VolumeX,
  Download,
  Radio,
  Loader2,
  Disc,
  FastForward,
} from 'lucide-react';
import { AudioVisualizer } from './AudioVisualizer';
import { ScriptScene } from '../data/mudrosScript';

interface PlayerControlsProps {
  currentScene: ScriptScene;
  currentSceneIndex: number;
  totalScenes: number;
  isPlaying: boolean;
  isLoadingAudio: boolean;
  onTogglePlay: () => void;
  onNextScene: () => void;
  onPrevScene: () => void;
  onReplayScene: () => void;
  playbackSpeed: number;
  setPlaybackSpeed: (speed: number) => void;
  selectedVoice: string;
  setSelectedVoice: (voice: string) => void;
  ambientEnabled: boolean;
  setAmbientEnabled: (enabled: boolean) => void;
  ambientVolume: number;
  setAmbientVolume: (vol: number) => void;
  autoPlayNext: boolean;
  setAutoPlayNext: (val: boolean) => void;
  onDownloadAudio: () => void;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  audioElement: HTMLAudioElement | null;
}

const VOICES = [
  { id: 'Charon', name: 'شارون (Charon)', desc: 'صوت رجالي عميق ورصين (نبرة وثائقية كلاسيكية)' },
  { id: 'Fenrir', name: 'فنرير (Fenrir)', desc: 'صوت رجالي جهوري وقور' },
  { id: 'Puck', name: 'بوك (Puck)', desc: 'صوت رجالي معبّر وواضح' },
  { id: 'Kore', name: 'كور (Kore)', desc: 'صوت نسائي وقور ومعبّر' },
  { id: 'Zephyr', name: 'زفير (Zephyr)', desc: 'صوت هادئ متزن' },
];

const SPEEDS = [
  { val: 0.8, label: '0.8x متأنٍّ' },
  { val: 0.9, label: '0.9x وثائقي' },
  { val: 1.0, label: '1.0x طبيعي' },
  { val: 1.15, label: '1.15x سريع' },
];

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  currentScene,
  currentSceneIndex,
  totalScenes,
  isPlaying,
  isLoadingAudio,
  onTogglePlay,
  onNextScene,
  onPrevScene,
  onReplayScene,
  playbackSpeed,
  setPlaybackSpeed,
  selectedVoice,
  setSelectedVoice,
  ambientEnabled,
  setAmbientEnabled,
  ambientVolume,
  setAmbientVolume,
  autoPlayNext,
  setAutoPlayNext,
  onDownloadAudio,
  currentTime,
  duration,
  onSeek,
  audioElement,
}) => {
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="sticky top-0 z-30 w-full bg-[#0d0f17]/95 backdrop-blur-md border-b border-amber-900/40 shadow-2xl py-3 px-4 sm:px-8 transition-all">
      <div className="max-w-6xl mx-auto flex flex-col gap-3">
        {/* Top bar: Current Scene Info & Visualizer */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="w-full md:w-auto flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
              {isLoadingAudio ? (
                <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
              ) : (
                <Radio className={`w-5 h-5 ${isPlaying ? 'text-amber-400 animate-pulse' : 'text-stone-400'}`} />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                  المشهد {currentSceneIndex + 1} من {totalScenes}
                </span>
                <span className="text-xs text-stone-400 font-mono">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-stone-100 truncate mt-0.5 font-display">
                {currentScene.title}
              </h2>
            </div>
          </div>

          {/* Audio Visualizer */}
          <div className="w-full md:w-1/2 flex justify-center">
            <AudioVisualizer isPlaying={isPlaying} audioElement={audioElement} />
          </div>

          {/* Quick Voice Selector */}
          <div className="w-full md:w-auto flex items-center justify-end gap-2 text-xs">
            <label className="text-stone-400 whitespace-nowrap">الراوي:</label>
            <select
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              className="bg-stone-900 border border-amber-900/50 rounded-lg px-2.5 py-1.5 text-stone-200 text-xs focus:outline-none focus:border-amber-500 transition cursor-pointer"
            >
              {VOICES.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Timeline Scrubber */}
        <div className="w-full flex items-center gap-3">
          <span className="text-[11px] font-mono text-stone-400 w-10 text-left">
            {formatTime(currentTime)}
          </span>
          <div className="relative flex-1 group py-1.5 cursor-pointer">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={(e) => onSeek(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-500 group-hover:h-2 transition-all"
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 left-0 h-1.5 bg-gradient-to-r from-amber-600 to-amber-400 rounded-lg pointer-events-none group-hover:h-2 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-[11px] font-mono text-stone-400 w-10 text-right">
            {formatTime(duration)}
          </span>
        </div>

        {/* Bottom Playback & Tuning Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-stone-800/60">
          {/* Main Controls: Prev, Play/Pause, Next, Replay */}
          <div className="flex items-center gap-2">
            <button
              onClick={onPrevScene}
              disabled={currentSceneIndex === 0}
              className="p-2 rounded-lg bg-stone-900 hover:bg-stone-800 disabled:opacity-30 disabled:hover:bg-stone-900 text-stone-200 transition active:scale-95 border border-stone-800"
              title="المشهد السابق"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            <button
              onClick={onTogglePlay}
              disabled={isLoadingAudio}
              className="flex items-center justify-center w-11 h-11 rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-stone-950 shadow-lg shadow-amber-600/30 transition-transform active:scale-95 disabled:opacity-50"
              title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل السرد الصوتي'}
            >
              {isLoadingAudio ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current translate-x-0.5" />
              )}
            </button>

            <button
              onClick={onNextScene}
              disabled={currentSceneIndex === totalScenes - 1}
              className="p-2 rounded-lg bg-stone-900 hover:bg-stone-800 disabled:opacity-30 disabled:hover:bg-stone-900 text-stone-200 transition active:scale-95 border border-stone-800"
              title="المشهد التالي"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={onReplayScene}
              className="p-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 transition active:scale-95 border border-stone-800"
              title="إعادة تشغيل المشهد الحالي من البداية"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Speed Selector */}
          <div className="flex items-center bg-stone-900/90 rounded-lg p-1 border border-stone-800 gap-1 text-xs">
            <FastForward className="w-3.5 h-3.5 text-stone-400 ml-1" />
            {SPEEDS.map((s) => (
              <button
                key={s.val}
                onClick={() => setPlaybackSpeed(s.val)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                  playbackSpeed === s.val
                    ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Ambient Historical Soundscape Generator */}
          <div className="flex items-center gap-2 bg-stone-900/90 rounded-lg px-2.5 py-1 border border-stone-800 text-xs">
            <button
              onClick={() => setAmbientEnabled(!ambientEnabled)}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded transition ${
                ambientEnabled
                  ? 'bg-amber-500/20 text-amber-300 font-medium'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
              title="تشغيل/إيقاف خلفية صوتية ملحمية هادئة"
            >
              {ambientEnabled ? (
                <Disc className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              ) : (
                <VolumeX className="w-3.5 h-3.5" />
              )}
              <span>أجواء وثائقية</span>
            </button>

            {ambientEnabled && (
              <input
                type="range"
                min={0.02}
                max={0.4}
                step={0.02}
                value={ambientVolume}
                onChange={(e) => setAmbientVolume(parseFloat(e.target.value))}
                className="w-16 h-1 bg-stone-700 rounded appearance-none accent-amber-500 cursor-pointer"
                title="مستوى صوت المؤثر الخلفي"
              />
            )}
          </div>

          {/* Auto Next Scene Toggle */}
          <label className="flex items-center gap-1.5 text-xs text-stone-300 cursor-pointer hover:text-stone-100 select-none">
            <input
              type="checkbox"
              checked={autoPlayNext}
              onChange={(e) => setAutoPlayNext(e.target.checked)}
              className="rounded bg-stone-900 border-stone-700 text-amber-500 focus:ring-0 accent-amber-500"
            />
            <span>تشغيل تلقائي متتابع</span>
          </label>

          {/* Download Current Scene WAV */}
          <button
            onClick={onDownloadAudio}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-200 border border-stone-800 text-xs font-medium transition active:scale-95"
            title="تحميل المقطع الصوتي للمشهد الحالي بتنسيق WAV عالي الجودة"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>تحميل الصوت</span>
          </button>
        </div>
      </div>
    </div>
  );
};
