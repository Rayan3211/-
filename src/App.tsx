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
  getSceneAudio,
  fetchNarrationAudio,
  downloadWavBlob,
  downloadAudioFromUrl,
} from './utils/audioService';
import { ambientSoundscape } from './utils/ambientAudio';
import {
  BookOpen,
  History,
  Sparkles,
  CheckCircle2,
  Download,
  Loader2,
  Volume2,
  Layers,
  ShieldCheck,
  AlertCircle,
  Edit3,
} from 'lucide-react';

const STORAGE_KEY_CUSTOM_TEXTS = 'mudros_custom_texts_v1';

export default function App() {
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(0.9); // 0.9x documentary pace
  const [selectedVoice, setSelectedVoice] = useState('Charon'); // Deep resonant documentary narrator
  const [showTashkeel, setShowTashkeel] = useState(true);
  const [fontSize, setFontSize] = useState(21);
  const [ambientEnabled, setAmbientEnabled] = useState(false);
  const [ambientVolume, setAmbientVolume] = useState(0.15);
  const [autoPlayNext, setAutoPlayNext] = useState(true);
  const [isDirectorModalOpen, setIsDirectorModalOpen] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Custom texts per scene (persisted in localStorage)
  const [customTexts, setCustomTexts] = useState<Record<number, string>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CUSTOM_TEXTS);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Dynamic audio cache: key -> { url, blob }
  const [cachedScenes, setCachedScenes] = useState<
    Record<string, { url: string; blob?: Blob }>
  >({});

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentScene = MUDROS_SCENES[currentSceneIndex];

  // Save customTexts to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOM_TEXTS, JSON.stringify(customTexts));
    } catch (e) {
      console.warn('Failed to save custom texts to localStorage', e);
    }
  }, [customTexts]);

  // Audio element listeners
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
    };
  }, [autoPlayNext, currentSceneIndex]);

  // Handle ambient soundscape
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

  // Playback speed
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  // Helper to get effective text for a scene
  const getSceneText = useCallback(
    (sceneId: number): string => {
      if (customTexts[sceneId] && customTexts[sceneId].trim().length > 0) {
        return customTexts[sceneId];
      }
      const scene = MUDROS_SCENES.find((s) => s.id === sceneId);
      return scene ? scene.cleanNarrationText : '';
    },
    [customTexts]
  );

  // Load audio for a scene
  const loadAudioForScene = useCallback(
    async (scene: ScriptScene, voice: string = selectedVoice): Promise<string> => {
      const isCustomEdited = !!customTexts[scene.id];
      const textToSpeak = getSceneText(scene.id);
      const cacheKey = `scene_${scene.id}_${voice}_${isCustomEdited ? textToSpeak.slice(0, 30) : 'default'}`;

      if (cachedScenes[cacheKey]) {
        return cachedScenes[cacheKey].url;
      }

      const res = await getSceneAudio(
        scene.id,
        textToSpeak,
        voice,
        scene.speechStyleInstruction,
        isCustomEdited
      );

      setCachedScenes((prev) => ({
        ...prev,
        [cacheKey]: res,
      }));

      return res.url;
    },
    [cachedScenes, selectedVoice, customTexts, getSceneText]
  );

  // Play a specific scene
  const playSceneAudio = async (sceneIndex: number) => {
    const scene = MUDROS_SCENES[sceneIndex];
    if (!scene || !audioRef.current) return;

    setIsLoadingAudio(true);
    setStatusMessage(null);

    try {
      const audioUrl = await loadAudioForScene(scene, selectedVoice);
      const audio = audioRef.current;
      audio.src = audioUrl;
      audio.playbackRate = playbackSpeed;
      await audio.play();
      setIsPlaying(true);
    } catch (err: any) {
      console.error('Audio load failure:', err);
      setStatusMessage(`تعذر تشغيل الصوت: ${err.message || 'خطأ في جلب الصوت'}`);
      setIsPlaying(false);
    } finally {
      setIsLoadingAudio(false);
    }
  };

  const handleTogglePlay = async () => {
    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
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

  // Handle saving custom text for a scene and optionally re-generating speech immediately
  const handleSaveCustomText = async (
    sceneId: number,
    newText: string,
    andGenerateSpeech = true
  ) => {
    setCustomTexts((prev) => ({
      ...prev,
      [sceneId]: newText,
    }));

    if (andGenerateSpeech) {
      const scene = MUDROS_SCENES.find((s) => s.id === sceneId);
      if (!scene) return;

      setIsLoadingAudio(true);
      setStatusMessage(null);

      try {
        const cacheKey = `scene_${sceneId}_${selectedVoice}_${newText.slice(0, 30)}`;
        const res = await fetchNarrationAudio(
          newText,
          selectedVoice,
          scene.speechStyleInstruction,
          cacheKey,
          sceneId
        );

        setCachedScenes((prev) => ({
          ...prev,
          [cacheKey]: { url: res.url, blob: res.blob },
        }));

        // If currently on this scene, play the new audio immediately
        if (currentScene.id === sceneId && audioRef.current) {
          audioRef.current.src = res.url;
          audioRef.current.playbackRate = playbackSpeed;
          await audioRef.current.play();
          setIsPlaying(true);
        }

        setStatusMessage(`✓ تم تحديث نص المشهد ${sceneId} وتوليد النطق الجديد بصوت الراوي وحفظه بنجاح!`);
        setTimeout(() => setStatusMessage(null), 5000);
      } catch (err: any) {
        console.error('Speech generation error:', err);
        setStatusMessage(
          `تم حفظ النص المعدل، ولكن تعذر توليد النطق تلقائياً (${err.message}). يمكنك المحاولة مجدداً أو مراجعة استوديو المخرج.`
        );
      } finally {
        setIsLoadingAudio(false);
      }
    } else {
      setStatusMessage(`✓ تم حفظ النص المعدل للمشهد ${sceneId}.`);
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  // Reset custom text to original script
  const handleResetCustomText = (sceneId: number) => {
    setCustomTexts((prev) => {
      const next = { ...prev };
      delete next[sceneId];
      return next;
    });

    // Clear dynamic audio cache for this scene so it reverts to the permanent bundled WAV
    setCachedScenes((prev) => {
      const next: Record<string, { url: string; blob?: Blob }> = {};
      Object.keys(prev).forEach((k) => {
        if (!k.startsWith(`scene_${sceneId}_`)) {
          next[k] = prev[k];
        }
      });
      return next;
    });

    if (currentScene.id === sceneId) {
      setTimeout(() => playSceneAudio(currentSceneIndex), 50);
    }

    setStatusMessage(`تمت استعادة النص الأصلي والتسجيل الأصلي للمشهد ${sceneId}.`);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleDownloadCurrentScene = async () => {
    const isCustom = !!customTexts[currentScene.id];
    const textToSpeak = getSceneText(currentScene.id);
    const cacheKey = `scene_${currentScene.id}_${selectedVoice}_${isCustom ? textToSpeak.slice(0, 30) : 'default'}`;
    const cached = cachedScenes[cacheKey];

    if (cached?.blob) {
      downloadWavBlob(cached.blob, `mudros_scene_${currentScene.id}_${selectedVoice}.wav`);
    } else if (cached?.url) {
      await downloadAudioFromUrl(cached.url, `mudros_scene_${currentScene.id}_${selectedVoice}.wav`);
    } else {
      // Default to bundled WAV
      await downloadAudioFromUrl(
        `/audio/scene_${currentScene.id}.wav`,
        `mudros_scene_${currentScene.id}_Charon.wav`
      );
    }
  };

  const handleCopyAllText = () => {
    const fullScript = MUDROS_SCENES.map((s) => {
      const text = customTexts[s.id] || s.paragraphs.join('\n\n');
      return `[${s.title}]\n\n${text}`;
    }).join('\n\n* * *\n\n');

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

      {/* GitHub & Permanent Audio Guarantee Banner */}
      <div className="bg-emerald-950/40 border-b border-emerald-800/40 py-2 px-4 sm:px-8 text-xs text-emerald-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            <strong>الصوت الأصلي مدمج وثابت 100%:</strong> تم حفظ جميع تسجيلات مشاهد الوثائقي الـ 7 في المشروع بصوت الراوي الوثائقي الأصلي (Charon)، ولن يتغير الصوت أبداً حتى عند رفع المشروع على GitHub أو تشغيله بدون إنترنت!
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] bg-emerald-900/60 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-700/50">
            تعديل النصوص متاح مع تحديث النطق التلقائي
          </span>
        </div>
      </div>

      {/* Toast / Status alert */}
      {statusMessage && (
        <div className="bg-amber-950/80 border-b border-amber-800/60 py-2.5 px-4 sm:px-8 text-xs text-amber-200 flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{statusMessage}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-stone-400 hover:text-stone-200 text-xs px-2"
          >
            إغلاق
          </button>
        </div>
      )}

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
                فهرس المشاهد التاريخية (7 مشاهد مسجلة مسبقاً)
              </span>
              <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>جاهز للتشغيل الدائم والفوري</span>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
              {MUDROS_SCENES.map((scene, idx) => {
                const isActive = idx === currentSceneIndex;
                const isCustom = !!customTexts[scene.id];
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
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      {isCustom && <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
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
                onDownloadSceneAudio={async () => {
                  const isCustom = !!customTexts[scene.id];
                  const textToSpeak = getSceneText(scene.id);
                  const cacheKey = `scene_${scene.id}_${selectedVoice}_${isCustom ? textToSpeak.slice(0, 30) : 'default'}`;
                  const entry = cachedScenes[cacheKey];
                  if (entry?.blob) {
                    downloadWavBlob(entry.blob, `mudros_scene_${scene.id}.wav`);
                  } else {
                    await downloadAudioFromUrl(`/audio/scene_${scene.id}.wav`, `mudros_scene_${scene.id}.wav`);
                  }
                }}
                hasCachedAudio={true}
                customText={customTexts[scene.id]}
                onSaveCustomText={handleSaveCustomText}
                onResetCustomText={handleResetCustomText}
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
          {/* Text Editing Feature Spotlight Card */}
          <div className="bg-gradient-to-br from-[#151a2e] to-[#0e1220] border border-amber-500/40 rounded-2xl p-5 shadow-lg space-y-3">
            <div className="flex items-center gap-2 text-amber-300 text-xs font-bold uppercase tracking-wider border-b border-amber-900/40 pb-2.5">
              <Edit3 className="w-4 h-4 text-amber-400" />
              <span>ميزة تعديل النص وتحديث النطق</span>
            </div>
            <p className="text-xs text-stone-300 leading-relaxed">
              يمكنك في أي وقت الضغط على زر <strong className="text-amber-300">«تعديل النص»</strong> الموجود على أي مشهد، وكتابة أو تعديل العبارات والتشكيل، ثم الضغط على <strong className="text-amber-300">«توليد وتحديث النطق»</strong>.
            </p>
            <p className="text-xs text-stone-400 leading-relaxed">
              سيقوم نموذج Gemini TTS المتقدم بقراءة نصك المعدل بصوت الراوي نفسه مع تطبيق كامل توجيهات النبرة.
            </p>
          </div>

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
              <span>ضمان ثبات الصوت عند الرفع على GitHub</span>
            </div>

            <ul className="text-xs space-y-2 text-stone-300 leading-relaxed list-disc list-inside">
              <li>
                <span className="text-emerald-300 font-medium">ملفات صوتية مدمجة:</span> تم توليد وحفظ كافة المقاطع بصيغة WAV في <code className="text-amber-400">public/audio/</code>.
              </li>
              <li>
                <span className="text-emerald-300 font-medium">بدون روبوت أو صوت متصفح:</span> تم إلغاء الصوت الاصطناعي الخاص بالمتصفحات نهائياً لضمان عدم تغير الصوت إطلاقاً.
              </li>
              <li>
                <span className="text-emerald-300 font-medium">تخزين التعديلات:</span> نصوصك المعدلة تُحفظ محلياً في المتصفح.
              </li>
            </ul>

            <button
              onClick={() => setIsDirectorModalOpen(true)}
              className="w-full mt-2 py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-200 text-xs font-bold transition flex items-center justify-center gap-1.5"
            >
              <span>فتح استوديو المخرج والتجارب</span>
            </button>
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
