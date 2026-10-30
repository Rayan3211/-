import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MUDROS_SCENES,
  DOCUMENTARY_METADATA,
  ScriptScene,
  removeTashkeel,
} from './data/mudrosScript';
import { Header } from './components/Header';
import { PlayerControls } from './components/PlayerControls';
import { SceneCard } from './components/SceneCard';
import { DirectorStudioModal } from './components/DirectorStudioModal';
import {
  fetchNarrationAudio,
  downloadWavBlob,
  playWebSpeechFallback,
  stopWebSpeech,
} from './utils/audioService';
import { ambientSoundscape } from './utils/ambientAudio';
import {
  BookOpen,
  History,
  Sparkles,
  Info,
  CheckCircle2,
  Download,
  Loader2,
  Volume2,
  ChevronDown,
  Layers,
} from 'lucide-react';

export default function App() {
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(0.9); // 0.9x: documentary pace
  const [selectedVoice, setSelectedVoice] = useState('Charon'); // Deep resonant documentary narrator
  const [showTashkeel, setShowTashkeel] = useState(true);
  const [fontSize, setFontSize] = useState(21);
  const [ambientEnabled, setAmbientEnabled] = useState(false);
  const [ambientVolume, setAmbientVolume] = useState(0.15);
  const [autoPlayNext, setAutoPlayNext] = useState(true);
  const [isDirectorModalOpen, setIsDirectorModalOpen] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  // Cache tracking: sceneId -> { url, blob }
  const [cachedScenes, setCachedScenes] = useState<{
    [key: string]: { url: string; blob: Blob };
  }>({});
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isFallbackPlayingRef = useRef(false);

  const currentScene = MUDROS_SCENES[currentSceneIndex];

  // Initialize audio element
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (autoPlayNext && currentSceneIndex < MUDROS_SCENES.length - 1) {
        // Transition to next scene with a brief documentary transition pause
        setTimeout(() => {
          handleSelectScene(currentSceneIndex + 1, true);
        }, 1200);
      }
    };

    const handleError = (e: any) => {
      console.warn('Audio playback error:', e);
      setIsPlaying(false);
      setIsLoadingAudio(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.pause();
      ambientSoundscape.stop();
      stopWebSpeech();
    };
  }, [autoPlayNext, currentSceneIndex]);

  // Handle ambient soundscape updates
  useEffect(() => {
    if (ambientEnabled && isPlaying) {
      ambientSoundscape.start(ambientVolume);
    } else if (!isPlaying || !ambientEnabled) {
      ambientSoundscape.stop();
    }
  }, [ambientEnabled, isPlaying]);

  useEffect(() => {
    if (ambientEnabled) {
      ambientSoundscape.setVolume(ambientVolume);
    }
  }, [ambientVolume, ambientEnabled]);

  // Adjust playback speed
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  // Load or fetch audio for a specific scene
  const loadSceneAudio = useCallback(
    async (scene: ScriptScene, voice: string = selectedVoice): Promise<string> => {
      const cacheKey = `${scene.id}_${voice}`;
      if (cachedScenes[cacheKey]) {
        return cachedScenes[cacheKey].url;
      }

      const res = await fetchNarrationAudio(
        scene.cleanNarrationText,
        voice,
        scene.speechStyleInstruction,
        cacheKey
      );

      setCachedScenes((prev) => ({
        ...prev,
        [cacheKey]: { url: res.url, blob: res.blob },
      }));

      return res.url;
    },
    [cachedScenes, selectedVoice]
  );

  // Play a specific scene
  const playSceneAudio = async (sceneIndex: number) => {
    const scene = MUDROS_SCENES[sceneIndex];
    if (!scene || !audioRef.current) return;

    setIsLoadingAudio(true);
    stopWebSpeech();

    try {
      const audioUrl = await loadSceneAudio(scene, selectedVoice);
      const audio = audioRef.current;
      audio.src = audioUrl;
      audio.playbackRate = playbackSpeed;
      await audio.play();
      setIsPlaying(true);
    } catch (err: any) {
      console.warn('Backend TTS failed, falling back to Web Speech API:', err);
      // Fallback to browser SpeechSynthesis
      isFallbackPlayingRef.current = true;
      setIsPlaying(true);
      playWebSpeechFallback(scene.cleanNarrationText, playbackSpeed, () => {
        setIsPlaying(false);
        isFallbackPlayingRef.current = false;
        if (autoPlayNext && sceneIndex < MUDROS_SCENES.length - 1) {
          setTimeout(() => handleSelectScene(sceneIndex + 1, true), 1200);
        }
      });
    } finally {
      setIsLoadingAudio(false);
    }
  };

  const handleTogglePlay = async () => {
    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      stopWebSpeech();
      setIsPlaying(false);
    } else {
      if (audioRef.current && audioRef.current.src && audioRef.current.currentTime > 0) {
        audioRef.current.playbackRate = playbackSpeed;
        await audioRef.current.play();
        setIsPlaying(true);
      } else {
        await playSceneAudio(currentSceneIndex);
      }
    }
  };

  const handleSelectScene = (index: number, shouldAutoPlay = false) => {
    if (index < 0 || index >= MUDROS_SCENES.length) return;
    if (audioRef.current) {
      audioRef.current.pause();
    }
    stopWebSpeech();
    setCurrentSceneIndex(index);
    setCurrentTime(0);

    const el = document.getElementById(`scene-${MUDROS_SCENES[index].id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    if (shouldAutoPlay || isPlaying) {
      playSceneAudio(index);
    } else {
      setIsPlaying(false);
    }
  };

  const handleReplayScene = () => {
    if (audioRef.current && audioRef.current.src) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      setIsPlaying(true);
    } else {
      playSceneAudio(currentSceneIndex);
    }
  };

  // Pre-generate all scenes sequentially in background
  const handlePreGenerateAll = async () => {
    if (batchLoading) return;
    setBatchLoading(true);
    setBatchProgress(0);

    for (let i = 0; i < MUDROS_SCENES.length; i++) {
      const scene = MUDROS_SCENES[i];
      const cacheKey = `${scene.id}_${selectedVoice}`;
      if (!cachedScenes[cacheKey]) {
        try {
          await loadSceneAudio(scene, selectedVoice);
        } catch (e) {
          console.error(`Failed to pre-cache scene ${scene.id}`, e);
        }
      }
      setBatchProgress(i + 1);
    }

    setBatchLoading(false);
  };

  const handleDownloadCurrentScene = () => {
    const cacheKey = `${currentScene.id}_${selectedVoice}`;
    const cached = cachedScenes[cacheKey];
    if (cached) {
      downloadWavBlob(cached.blob, `mudros_scene_${currentScene.id}_${selectedVoice}.wav`);
    } else {
      // Fetch and download
      loadSceneAudio(currentScene, selectedVoice).then(() => {
        const entry = cachedScenes[cacheKey];
        if (entry) {
          downloadWavBlob(entry.blob, `mudros_scene_${currentScene.id}_${selectedVoice}.wav`);
        }
      });
    }
  };

  const handleCopyAllText = () => {
    const fullScript = MUDROS_SCENES.map(
      (s) => `[${s.title}]\n\n${s.paragraphs.join('\n\n')}`
    ).join('\n\n* * *\n\n');

    navigator.clipboard.writeText(showTashkeel ? fullScript : removeTashkeel(fullScript));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['input', 'textarea'].includes((e.target as HTMLElement)?.tagName?.toLowerCase())) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.code === 'ArrowRight' && e.ctrlKey) {
        e.preventDefault();
        handleSelectScene(currentSceneIndex + 1, isPlaying);
      } else if (e.code === 'ArrowLeft' && e.ctrlKey) {
        e.preventDefault();
        handleSelectScene(currentSceneIndex - 1, isPlaying);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, currentSceneIndex]);

  return (
    <div className="min-h-screen bg-[#0b0c10] text-[#e0e2ec] flex flex-col font-display selection:bg-amber-600/30 selection:text-amber-200">
      {/* Top Documentary Banner */}
      <Header
        showTashkeel={showTashkeel}
        setShowTashkeel={setShowTashkeel}
        fontSize={fontSize}
        setFontSize={setFontSize}
        onOpenDirectorModal={() => setIsDirectorModalOpen(true)}
        onCopyAllText={handleCopyAllText}
        copied={copiedAll}
      />

      {/* Persistent Audio Player & Studio Bar */}
      <PlayerControls
        currentScene={currentScene}
        currentSceneIndex={currentSceneIndex}
        totalScenes={MUDROS_SCENES.length}
        isPlaying={isPlaying}
        isLoadingAudio={isLoadingAudio}
        onTogglePlay={handleTogglePlay}
        onNextScene={() => handleSelectScene(currentSceneIndex + 1, isPlaying)}
        onPrevScene={() => handleSelectScene(currentSceneIndex - 1, isPlaying)}
        onReplayScene={handleReplayScene}
        playbackSpeed={playbackSpeed}
        setPlaybackSpeed={setPlaybackSpeed}
        selectedVoice={selectedVoice}
        setSelectedVoice={(v) => {
          setSelectedVoice(v);
          if (isPlaying) {
            setTimeout(() => playSceneAudio(currentSceneIndex), 50);
          }
        }}
        ambientEnabled={ambientEnabled}
        setAmbientEnabled={setAmbientEnabled}
        ambientVolume={ambientVolume}
        setAmbientVolume={setAmbientVolume}
        autoPlayNext={autoPlayNext}
        setAutoPlayNext={setAutoPlayNext}
        onDownloadAudio={handleDownloadCurrentScene}
        currentTime={currentTime}
        duration={duration}
        onSeek={(t) => {
          if (audioRef.current) {
            audioRef.current.currentTime = t;
            setCurrentTime(t);
          }
        }}
        audioElement={audioRef.current}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-8 flex flex-col lg:flex-row gap-8">
        {/* Left/Main Column: Script Scenes Stream */}
        <section className="flex-1 space-y-8">
          {/* Quick Scene Jump Ribbon */}
          <div className="bg-[#12141f] border border-amber-900/30 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-3 text-xs">
              <span className="font-bold text-stone-200 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-amber-400" />
                فهرس المشاهد التاريخية (7 مشاهد)
              </span>
              <button
                onClick={handlePreGenerateAll}
                disabled={batchLoading}
                className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold transition"
              >
                {batchLoading ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>جاري تحضير المقاطع ({batchProgress}/7)...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3" />
                    <span>تجهيز كافة المشاهد مسبقاً للتشغيل الفوري</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
              {MUDROS_SCENES.map((scene, idx) => {
                const isActive = idx === currentSceneIndex;
                const isCached = !!cachedScenes[`${scene.id}_${selectedVoice}`];
                return (
                  <button
                    key={scene.id}
                    onClick={() => handleSelectScene(idx, isPlaying)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                      isActive
                        ? 'bg-amber-500/20 border-amber-500/80 text-amber-200 shadow-md ring-1 ring-amber-500/40'
                        : 'bg-stone-900/60 hover:bg-stone-800/80 border-stone-800 text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    <div className="flex items-center gap-1 mb-1">
                      <span className="text-[10px] font-mono font-bold">0{scene.id}</span>
                      {isCached && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                    </div>
                    <span className="text-xs font-medium truncate w-full">
                      {scene.year}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scenes List */}
          <div className="space-y-6">
            {MUDROS_SCENES.map((scene, idx) => (
              <SceneCard
                key={scene.id}
                scene={scene}
                index={idx}
                isActive={idx === currentSceneIndex}
                isPlayingThisScene={idx === currentSceneIndex && isPlaying}
                isLoadingThisScene={idx === currentSceneIndex && isLoadingAudio}
                onPlayScene={() => {
                  if (idx === currentSceneIndex && isPlaying) {
                    handleTogglePlay();
                  } else {
                    handleSelectScene(idx, true);
                  }
                }}
                showTashkeel={showTashkeel}
                fontSize={fontSize}
                onDownloadSceneAudio={() => {
                  const cacheKey = `${scene.id}_${selectedVoice}`;
                  const entry = cachedScenes[cacheKey];
                  if (entry) {
                    downloadWavBlob(entry.blob, `mudros_scene_${scene.id}_${selectedVoice}.wav`);
                  }
                }}
                hasCachedAudio={!!cachedScenes[`${scene.id}_${selectedVoice}`]}
              />
            ))}
          </div>

          {/* Closing Historical Epilogue Card */}
          <div className="rounded-2xl border border-amber-900/40 bg-gradient-to-br from-[#12141f] via-[#0d0f17] to-[#090a0f] p-6 text-center space-y-3">
            <h4 className="text-base font-bold text-amber-300 font-display">
              انتهى السرد الوثائقي لهدنة مودروس
            </h4>
            <p className="text-xs text-stone-400 max-w-2xl mx-auto leading-relaxed">
              «فَقَدْ تَقَرَّرَ مَصِيرُ إِمْبِرَاطُورِيَّةٍ عُمْرُهَا سِتَّةُ قُرُون فِي بِضْعَةِ أَيَّام، عَلَى سَفِينَةٍ حَرْبِيَّةٍ فِي مِينَاءٍ صَغِير، حِينَ أُنْزِلَ عَلَمُ دَوْلَةٍ وَارْتَفَعَتْ أَعْلَامٌ أُخْرَى.»
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <button
                onClick={() => handleSelectScene(0, true)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow transition active:scale-95"
              >
                إعادة الاستماع من البداية
              </button>
              <button
                onClick={handleCopyAllText}
                className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-medium text-xs border border-stone-700 transition"
              >
                نسخ النص المكتمل
              </button>
            </div>
          </div>
        </section>

        {/* Right Sidebar: Historical Dossier & Context */}
        <aside className="w-full lg:w-80 space-y-6 shrink-0">
          {/* Historical File / Dossier Card */}
          <div className="bg-[#10121a] border border-stone-800/80 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider border-b border-stone-800 pb-3">
              <History className="w-4 h-4" />
              <span>بطاقة الوثائقي التاريخي</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-stone-400 block text-[11px]">الحدث:</span>
                <span className="font-bold text-stone-200">
                  توقيع هدنة مودروس (Armistice of Mudros)
                </span>
              </div>
              <div>
                <span className="text-stone-400 block text-[11px]">الموقع:</span>
                <span className="text-stone-200">البارجة أغاممنون، جزيرة ليمنوس، اليونان</span>
              </div>
              <div>
                <span className="text-stone-400 block text-[11px]">التاريخ والوقت:</span>
                <span className="text-stone-200">30 أكتوبر 1918 (سَرَت ظُهر 31 أكتوبر)</span>
              </div>
              <div>
                <span className="text-stone-400 block text-[11px]">أبرز الموقعين:</span>
                <span className="text-stone-200">
                  الأدميرال البريطاني كالثورب & وزير البحرية العثماني رؤوف أورباي
                </span>
              </div>
              <div>
                <span className="text-stone-400 block text-[11px]">أخطر بند:</span>
                <span className="text-amber-300 font-bold">
                  «المادة السابعة» (حق الحلفاء في احتلال أي موقع استراتيجي)
                </span>
              </div>
              <div>
                <span className="text-stone-400 block text-[11px]">المآل والنتائج:</span>
                <span className="text-stone-300">
                  احتلال إسطنبول، معاهدة سيفر، حرب الاستقلال بقيادة مصطفى كمال، معاهدة لوزان 1923، وتثبيت انتدابات سايكس بيكو في العالم العربي.
                </span>
              </div>
            </div>
          </div>

          {/* Director's Narration Guide Card */}
          <div className="bg-gradient-to-br from-[#121524] to-[#0e1019] border border-amber-900/40 rounded-2xl p-5 shadow-lg space-y-3.5">
            <div className="flex items-center gap-2 text-amber-300 text-xs font-bold border-b border-amber-950/60 pb-3">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>توجيهات الراوي المعتمدة في الصوت</span>
            </div>

            <ul className="text-xs space-y-2.5 text-stone-300 leading-relaxed list-disc list-inside">
              <li>
                <span className="text-amber-300 font-medium">طبقة الصوت:</span> صوت رجالي عميق ورصين (Charon / Fenrir).
              </li>
              <li>
                <span className="text-amber-300 font-medium">الإيقاع والوقفات:</span> سرعة متأنية، وقفة قصيرة عند الفواصل وأطول عند الفواصل الزمنية.
              </li>
              <li>
                <span className="text-amber-300 font-medium">التفاعل الدرامي:</span> توتر هادئ في الافتتاح، حماسي بالمعارك، حزين عند المجازر.
              </li>
              <li>
                <span className="text-amber-300 font-medium">التشكيل الحرفي:</span> نطق مخارج الحروف بالتشكيل الكامل للأسماء والأعلام.
              </li>
              <li>
                <span className="text-amber-300 font-medium">الخاتمة:</span> انحسار وتلاشٍ تدريجي هادئ.
              </li>
            </ul>

            <button
              onClick={() => setIsDirectorModalOpen(true)}
              className="w-full mt-2 py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-200 text-xs font-bold transition flex items-center justify-center gap-1.5"
            >
              <span>فتح استوديو المخرج والتجارب</span>
            </button>
          </div>

          {/* Keyboard Shortcuts Guide */}
          <div className="bg-[#10121a]/80 border border-stone-800 rounded-2xl p-4 text-xs text-stone-400 space-y-2">
            <span className="text-[11px] font-bold text-stone-300 block mb-1">
              اختصارات لوحة المفاتيح:
            </span>
            <div className="flex justify-between">
              <span>تشغيل / إيقاف مؤقت:</span>
              <kbd className="px-1.5 py-0.5 bg-stone-800 border border-stone-700 rounded text-[10px] text-stone-200 font-mono">
                Space
              </kbd>
            </div>
            <div className="flex justify-between">
              <span>المشهد التالي:</span>
              <kbd className="px-1.5 py-0.5 bg-stone-800 border border-stone-700 rounded text-[10px] text-stone-200 font-mono">
                Ctrl + →
              </kbd>
            </div>
            <div className="flex justify-between">
              <span>المشهد السابق:</span>
              <kbd className="px-1.5 py-0.5 bg-stone-800 border border-stone-700 rounded text-[10px] text-stone-200 font-mono">
                Ctrl + ←
              </kbd>
            </div>
          </div>
        </aside>
      </main>

      {/* Director's Studio Modal */}
      <DirectorStudioModal
        isOpen={isDirectorModalOpen}
        onClose={() => setIsDirectorModalOpen(false)}
        selectedVoice={selectedVoice}
        setSelectedVoice={setSelectedVoice}
      />
    </div>
  );
}
