import React, { useState, useRef } from "react";
import { CaptionItem, PresetStyle, VideoMetadata } from "./types";
import { DEFAULT_PRESETS } from "./constants/presets";
import { extractWavAudio } from "./utils/audioExtractor";
import StyleSidebar from "./components/StyleSidebar";
import VideoCanvasPreview from "./components/VideoCanvasPreview";
import CaptionsEditor from "./components/CaptionsEditor";
import {
  Upload,
  Download,
  Video,
  FileText,
  Clock,
  AlertCircle,
  Languages,
  RefreshCw,
} from "lucide-react";
import { TARGET_LANGUAGES } from "./constants/languages";

const DEMO_VIDEO_URL =
  "https://assets.mixkit.co/videos/preview/mixkit-girl-in-neon-sign-city-40011-large.mp4";

const DEMO_CAPTIONS: CaptionItem[] = [
  { id: "d1", text: "Welcome", start: 0.1, end: 1.2 },
  { id: "d2", text: "to Caption", start: 1.2, end: 1.8 },
  { id: "d3", text: "Studio Pro", start: 1.8, end: 3.2 },
  { id: "d4", text: "This is a", start: 3.2, end: 3.8 },
  { id: "d5", text: "zero-cost", start: 3.8, end: 4.5 },
  { id: "d6", text: "client-side editor", start: 4.5, end: 5.8 },
  { id: "d7", text: "Look at", start: 5.8, end: 6.4 },
  { id: "d8", text: "these animated", start: 6.4, end: 7.1 },
  { id: "d9", text: "studio subtitles", start: 7.1, end: 8.5 },
  { id: "d10", text: "Aap easily", start: 8.5, end: 9.3 },
  { id: "d11", text: "apne captions", start: 9.3, end: 10.2 },
  { id: "d12", text: "ko edit,", start: 10.2, end: 10.9 },
  { id: "d13", text: "style,", start: 10.9, end: 11.5 },
  { id: "d14", text: "aur modify", start: 11.5, end: 12.1 },
  { id: "d15", text: "kar sakte ho", start: 12.1, end: 13.5 },
  { id: "d16", text: "Click export", start: 13.5, end: 14.3 },
  { id: "d17", text: "to download", start: 14.3, end: 15.0 },
  { id: "d18", text: "your 1080p video", start: 15.0, end: 16.5 },
];

export default function App() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(DEMO_VIDEO_URL);
  const [captions, setCaptions] = useState<CaptionItem[]>(DEMO_CAPTIONS);
  const [currentStyle, setCurrentStyle] = useState<PresetStyle>(DEFAULT_PRESETS[0]);

  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoMeta, setVideoMeta] = useState<VideoMetadata | null>({
    name: "Demo Neon Lights.mp4",
    size: 14200000,
    duration: 16.5,
    width: 1080,
    height: 1920,
  });

  // Right Inspector Tab Mode ("inspector" | "transcript" | "export")
  const [activeRightPanel, setActiveRightPanel] = useState<"inspector" | "transcript" | "export">("inspector");

  // Transcription & API states
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribeStage, setTranscribeStage] = useState("");
  const [transcribeProgress, setTranscribeProgress] = useState(0);
  const [apiError, setApiError] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState(
    "Transcribe with Hinglish support, short punchy captions (1-2 words per segment), and clean punctuation without emojis."
  );
  const [targetLanguage, setTargetLanguage] = useState<string>("original");
  const cachedAudioBase64Ref = useRef<string | null>(null);

  // Export states
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // Shared refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSeek = (time: number) => {
    if (videoRef.current && !isExporting) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith("video/") && !file.type.startsWith("audio/")) {
      setApiError("Unsupported file format. Please select an MP4, MOV, WebM, or audio file.");
      return;
    }
    cachedAudioBase64Ref.current = null;
    setVideoFile(file);
    setVideoUrl(null);
    setCaptions([]);
    setVideoMeta(null);
    setApiError(null);
    setIsPlaying(false);

    triggerTranscription(file, targetLanguage);
  };

  const exportSRT = () => {
    const srtContent = captions
      .map((c, i) => {
        const formatTime = (secs: number) => {
          const hrs = Math.floor(secs / 3600);
          const mins = Math.floor((secs % 3600) / 60);
          const s = Math.floor(secs % 60);
          const ms = Math.floor((secs % 1) * 1000);
          return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")},${ms.toString().padStart(3, "0")}`;
        };
        return `${i + 1}\n${formatTime(c.start)} --> ${formatTime(c.end)}\n${c.text}\n`;
      })
      .join("\n");

    triggerDownload(srtContent, "captions.srt", "text/srt");
  };

  const exportVTT = () => {
    const vttContent =
      "WEBVTT\n\n" +
      captions
        .map((c, i) => {
          const formatTime = (secs: number) => {
            const hrs = Math.floor(secs / 3600);
            const mins = Math.floor((secs % 3600) / 60);
            const s = Math.floor(secs % 60);
            const ms = Math.floor((secs % 1) * 1000);
            return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${ms.toString().padStart(3, "0")}`;
          };
          return `${i + 1}\n${formatTime(c.start)} --> ${formatTime(c.end)}\n${c.text}\n`;
        })
        .join("\n");

    triggerDownload(vttContent, "captions.vtt", "text/vtt");
  };

  const exportJSON = () => {
    triggerDownload(
      JSON.stringify(captions, null, 2),
      "captions.json",
      "application/json"
    );
  };

  const exportTXT = () => {
    const txtContent = captions.map((c) => c.text).join(" ");
    triggerDownload(txtContent, "transcript.txt", "text/plain");
  };

  const triggerDownload = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportVideo = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    setIsExporting(true);
    setExportProgress(0);
    setIsPlaying(false);
    video.pause();

    video.currentTime = 0;

    await new Promise<void>((resolve) => {
      const onSeeked = () => {
        video.removeEventListener("seeked", onSeeked);
        resolve();
      };
      video.addEventListener("seeked", onSeeked);
    });

    const chunks: BlobPart[] = [];
    const canvasStream = canvas.captureStream(30);

    let combinedStream = canvasStream;
    let audioContext: AudioContext | null = null;
    let sourceNode: MediaElementAudioSourceNode | null = null;
    let destNode: MediaStreamAudioDestinationNode | null = null;

    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      sourceNode = audioContext.createMediaElementSource(video);
      destNode = audioContext.createMediaStreamDestination();

      sourceNode.connect(destNode);
      sourceNode.connect(audioContext.destination);

      const tracks = [
        ...canvasStream.getVideoTracks(),
        ...destNode.stream.getAudioTracks(),
      ];
      combinedStream = new MediaStream(tracks);
    } catch (err) {
      console.warn("Could not capture audio stream from video element. Exporting video-only file.", err);
    }

    let mimeType = "video/webm;codecs=vp9";
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = "video/webm";
    }

    try {
      const recorder = new MediaRecorder(combinedStream, { mimeType });

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);

        const baseName = videoFile ? videoFile.name.replace(/\.[^/.]+$/, "") : "auto_captioned";
        const downloadName = `${baseName}_captioned.webm`;

        const a = document.createElement("a");
        a.href = url;
        a.download = downloadName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        if (sourceNode && destNode && audioContext) {
          sourceNode.disconnect();
          audioContext.close();
        }

        setIsExporting(false);
        setExportProgress(100);
      };

      recorder.start();
      await video.play();

      const duration = video.duration || 10;

      const progressInterval = setInterval(() => {
        if (video.ended || video.currentTime >= duration) {
          clearInterval(progressInterval);
          recorder.stop();
          video.pause();
        } else {
          const progressValue = Math.min(
            99,
            Math.floor((video.currentTime / duration) * 100)
          );
          setExportProgress(progressValue);
        }
      }, 200);
    } catch (recErr) {
      console.error("Recording initialization failed:", recErr);
      setApiError("MediaRecorder failed to initialize. Please use a modern desktop browser such as Chrome, Safari, or Edge.");
      setIsExporting(false);
    }
  };

  const triggerTranscription = async (file?: File | null, explicitTargetLang?: string) => {
    const langToUse = explicitTargetLang !== undefined ? explicitTargetLang : targetLanguage;
    const isTranslating =
      langToUse && langToUse !== "original" && langToUse !== "Original Spoken Language";

    setIsTranscribing(true);
    setApiError(null);
    setTranscribeProgress(0);

    try {
      let base64Audio = cachedAudioBase64Ref.current;

      if (file || !base64Audio) {
        let sourceFile: Blob | File | null = file || videoFile;
        if (!sourceFile && videoUrl) {
          try {
            setTranscribeStage("Fetching sample video audio track...");
            setTranscribeProgress(15);
            const res = await fetch(videoUrl);
            sourceFile = await res.blob();
          } catch (e) {
            console.warn("Could not fetch remote video directly", e);
          }
        }

        if (!sourceFile) {
          throw new Error("No video or audio source found. Please upload a video file.");
        }

        const { base64 } = await extractWavAudio(sourceFile, (stage, prog) => {
          setTranscribeStage(stage);
          setTranscribeProgress(Math.min(75, prog));
        });

        cachedAudioBase64Ref.current = base64;
        base64Audio = base64;
      }

      const stageMsg = isTranslating
        ? `Translating dialogue into ${langToUse}...`
        : "Transcribing speech and aligning word timestamps...";
      setTranscribeStage(stageMsg);
      setTranscribeProgress(80);

      const response = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audio: base64Audio,
          mimeType: "audio/wav",
          promptContext: customPrompt,
          targetLanguage: langToUse,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to transcribe audio.");
      }

      const { transcript } = await response.json();

      if (!transcript || !Array.isArray(transcript)) {
        throw new Error("Invalid transcription format returned by the server.");
      }

      const formattedCaptions: CaptionItem[] = transcript.map((item: any, idx: number) => ({
        id: `gemini_word_${idx}_${Date.now()}`,
        text: item.text,
        start: parseFloat(item.start),
        end: parseFloat(item.end),
      }));

      setCaptions(formattedCaptions);
      setTranscribeProgress(100);
      setTranscribeStage(
        isTranslating
          ? `Translated into ${langToUse} successfully.`
          : "Transcription complete."
      );

      handleSeek(0);
    } catch (err: any) {
      console.error("Master transcription failure:", err);
      setApiError(
        err.message ||
          "An unexpected error occurred. Verify GEMINI_API_KEY in the Settings > Secrets panel."
      );
    } finally {
      setIsTranscribing(false);
    }
  };

  const loadDemoFallback = () => {
    setCaptions(DEMO_CAPTIONS);
    setApiError(null);
    handleSeek(0);
  };

  return (
    <div className="min-h-screen bg-[#000000] text-[#F5F5F7] font-sans flex flex-col antialiased selection:bg-[#0A84FF] selection:text-white">
      {/* Hidden File Input for Top Bar / Upload Actions */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,audio/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file);
        }}
        disabled={isTranscribing || isExporting}
        className="hidden"
      />

      {/* Apple macOS Translucent Top Navigation Bar (Strict 3-Zone Contract) */}
      <header className="sticky top-0 z-30 w-full border-b border-white/[0.08] bg-[#1C1C1E]/75 backdrop-blur-2xl">
        <div className="max-w-[1440px] mx-auto px-6 h-14 flex items-center justify-between gap-8">
          {/* Zone 1: Single Brand Wordmark */}
          <a
            href="#studio"
            className="text-base font-semibold tracking-tight text-[#F5F5F7] whitespace-nowrap shrink-0"
          >
            Caption Studio Pro
          </a>

          {/* Zone 2: Clean Single-Line Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-medium text-[#86868B]">
            <button
              type="button"
              onClick={() => setActiveRightPanel("inspector")}
              className={`hover:text-[#F5F5F7] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeRightPanel === "inspector" ? "text-[#F5F5F7]" : ""
              }`}
            >
              Title Inspector
            </button>
            <button
              type="button"
              onClick={() => setActiveRightPanel("transcript")}
              className={`hover:text-[#F5F5F7] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeRightPanel === "transcript" ? "text-[#F5F5F7]" : ""
              }`}
            >
              Transcript Timeline
            </button>
            <button
              type="button"
              onClick={() => setActiveRightPanel("export")}
              className={`hover:text-[#F5F5F7] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeRightPanel === "export" ? "text-[#F5F5F7]" : ""
              }`}
            >
              Export Master
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isTranscribing || isExporting}
              className="hover:text-[#F5F5F7] transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40"
            >
              Import Media
            </button>
          </nav>

          {/* Zone 3: 1 Primary Action CTA */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={handleExportVideo}
              disabled={isTranscribing || isExporting || captions.length === 0}
              className="px-4 py-2 text-xs font-medium text-white bg-[#0A84FF] hover:bg-[#0071E3] disabled:opacity-40 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
              id="header-export-btn"
            >
              Export 1080p Video
            </button>
          </div>
        </div>
      </header>

      {/* Main Studio Workspace */}
      <main
        id="studio"
        className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
      >
        {/* Left Column (7 cols): Video Canvas Viewer + Speech & Translation Deck */}
        <div className="lg:col-span-7 flex flex-col gap-5 w-full">
          {/* Metadata Sub-Bar (Clean Unboxed Typography) */}
          <div className="flex flex-wrap items-center justify-between gap-4 px-1">
            <div className="flex items-center gap-2 text-xs text-[#86868B]">
              <span className="text-[#F5F5F7] font-medium">
                {videoMeta ? videoMeta.name : "Demo Neon Lights.mp4"}
              </span>
              {videoMeta && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">
                    {videoMeta.duration.toFixed(1)}s
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">
                    {videoMeta.width}×{videoMeta.height}
                  </span>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isTranscribing || isExporting}
              className="flex items-center gap-1.5 text-xs font-medium text-[#0A84FF] hover:text-[#409CFF] transition cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-40"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Replace Video File</span>
            </button>
          </div>

          {/* Live Video Canvas Preview */}
          <div className="w-full h-[540px]">
            <VideoCanvasPreview
              videoFile={videoFile}
              videoUrl={videoUrl}
              captions={captions}
              style={currentStyle}
              currentTime={currentTime}
              setCurrentTime={setCurrentTime}
              isPlaying={isPlaying}
              setIsPlaying={setIsPlaying}
              videoRef={videoRef}
              canvasRef={canvasRef}
              onVideoLoad={setVideoMeta}
              isExporting={isExporting}
              exportProgress={exportProgress}
            />
          </div>

          {/* Speech Transcription & Translation Inspector Card */}
          <div className="bg-[#1C1C1E]/90 backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-[#F5F5F7] tracking-tight">
                  Speech Recognition & Translation
                </h2>
                <p className="text-xs text-[#86868B] mt-0.5">
                  Configure target language translation and phrasing instructions
                </p>
              </div>
              {targetLanguage !== "original" && (
                <span className="text-xs font-medium text-[#0A84FF]">
                  Translating to {targetLanguage}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Target Language Selector */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-[#86868B]">
                    Target Language
                  </label>
                  <span className="text-[11px] text-[#86868B]">
                    {TARGET_LANGUAGES.find((l) => l.code === targetLanguage)?.nativeName || ""}
                  </span>
                </div>
                <div className="relative">
                  <select
                    value={targetLanguage}
                    onChange={(e) => setTargetLanguage(e.target.value)}
                    disabled={isTranscribing || isExporting}
                    className="w-full bg-[#2C2C2E] border border-white/[0.08] hover:border-white/15 text-[#F5F5F7] text-xs rounded-xl px-3.5 py-2.5 pr-9 appearance-none focus:outline-none focus:border-[#0A84FF] transition cursor-pointer font-medium disabled:opacity-50"
                    aria-label="Select target transcription or translation language"
                  >
                    {TARGET_LANGUAGES.map((lang) => (
                      <option
                        key={lang.code}
                        value={lang.code}
                        className="bg-[#1C1C1E] text-[#F5F5F7] py-1"
                      >
                        [{lang.regionCode}] {lang.name}{" "}
                        {lang.nativeName && lang.nativeName !== lang.name
                          ? `(${lang.nativeName})`
                          : ""}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#86868B]">
                    <Languages className="w-3.5 h-3.5" />
                  </div>
                </div>
                <p className="text-[11px] text-[#86868B] leading-relaxed">
                  {targetLanguage !== "original"
                    ? `Translates spoken audio directly into ${targetLanguage} with synchronized word timing.`
                    : "Transcribes dialogue in its original spoken language without translation."}
                </p>
              </div>

              {/* Prompt Instructions */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#86868B]">
                  Phrasing & Dialect Instructions
                </label>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  disabled={isTranscribing || isExporting}
                  placeholder="e.g., Short 1-2 word punchy phrases, Hinglish phrasing, clean punctuation..."
                  className="w-full h-[76px] bg-[#2C2C2E] border border-white/[0.08] text-[#F5F5F7] text-xs rounded-xl p-3 focus:outline-none focus:border-[#0A84FF] resize-none font-normal placeholder-[#86868B] disabled:opacity-50"
                />
              </div>
            </div>

            {/* Action Footer */}
            <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-4">
              <span className="text-xs text-[#86868B] truncate">
                {videoFile ? `Source: ${videoFile.name}` : "Source: Demo Neon Lights.mp4"}
              </span>

              <button
                type="button"
                onClick={() => triggerTranscription(videoFile)}
                disabled={isTranscribing || isExporting || (!videoFile && !videoUrl)}
                className="flex items-center gap-2 px-4 py-2 bg-[#2C2C2E] hover:bg-[#3A3A3C] text-[#F5F5F7] font-medium text-xs rounded-xl border border-white/[0.08] transition active:scale-[0.98] disabled:opacity-40 cursor-pointer whitespace-nowrap shrink-0"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 text-[#0A84FF] ${
                    isTranscribing ? "animate-spin" : ""
                  }`}
                />
                <span>
                  {isTranscribing
                    ? "Transcribing..."
                    : targetLanguage !== "original"
                    ? `Translate to ${targetLanguage}`
                    : "Re-Transcribe Audio"}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Studio Inspector, Transcript Timeline & Export Suite */}
        <div className="lg:col-span-5 flex flex-col gap-5 w-full">
          {/* Active Transcription Progress Banner */}
          {isTranscribing && (
            <div className="bg-[#1C1C1E]/95 backdrop-blur-2xl border border-[#0A84FF]/40 rounded-2xl p-4 flex flex-col gap-2.5 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#F5F5F7] flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 text-[#0A84FF] animate-spin" />
                  Processing Audio Track
                </span>
                <span className="text-xs font-mono tabular-nums text-[#86868B]">
                  {transcribeProgress}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#0A84FF] rounded-full transition-all duration-300"
                  style={{ width: `${transcribeProgress}%` }}
                />
              </div>
              <p className="text-xs text-[#86868B]">{transcribeStage}</p>
            </div>
          )}

          {/* Error Banner */}
          {apiError && (
            <div className="bg-[#1C1C1E] border border-[#FF453A]/40 rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-[#FF453A] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-[#F5F5F7]">
                    Transcription Issue
                  </h4>
                  <p className="text-xs text-[#86868B] leading-relaxed">
                    {apiError}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 pt-2 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={loadDemoFallback}
                  className="px-3 py-1.5 bg-[#2C2C2E] hover:bg-[#3A3A3C] text-[#F5F5F7] rounded-lg text-xs font-medium transition cursor-pointer"
                >
                  Restore Demo Transcript
                </button>
                <button
                  type="button"
                  onClick={() => setApiError(null)}
                  className="text-xs text-[#86868B] hover:text-[#F5F5F7] transition cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Workspace Mode Segmented Switcher (Inspector vs Transcript vs Export) */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-[#1C1C1E] rounded-xl border border-white/[0.08]">
            {(
              [
                { id: "inspector", label: "Style Inspector" },
                { id: "transcript", label: `Transcript (${captions.length})` },
                { id: "export", label: "Export & Share" },
              ] as const
            ).map((mode) => {
              const active = activeRightPanel === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setActiveRightPanel(mode.id)}
                  className={`py-2 px-3 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0 ${
                    active
                      ? "bg-[#2C2C2E] text-[#F5F5F7] shadow-sm"
                      : "text-[#86868B] hover:text-[#F5F5F7]"
                  }`}
                >
                  {mode.label}
                </button>
              );
            })}
          </div>

          {/* Active Right Panel Viewport */}
          {activeRightPanel === "inspector" && (
            <div className="h-[640px]">
              <StyleSidebar
                currentStyle={currentStyle}
                setCurrentStyle={setCurrentStyle}
                isExporting={isExporting}
              />
            </div>
          )}

          {activeRightPanel === "transcript" && (
            <div className="h-[640px]">
              <CaptionsEditor
                captions={captions}
                setCaptions={setCaptions}
                currentTime={currentTime}
                onSeek={handleSeek}
                isExporting={isExporting}
              />
            </div>
          )}

          {activeRightPanel === "export" && (
            <div className="bg-[#1C1C1E]/90 backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-5 flex flex-col gap-5">
              <div>
                <h2 className="text-sm font-semibold text-[#F5F5F7] tracking-tight">
                  Export Master & Subtitle Tracks
                </h2>
                <p className="text-xs text-[#86868B] mt-0.5">
                  Render burned-in 1080p video or export standalone timecode files
                </p>
              </div>

              {/* Primary Video Render Card */}
              <div className="bg-[#2C2C2E]/60 border border-white/[0.06] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#F5F5F7]">
                    1080p Burned-In Video (.webm)
                  </span>
                  <span className="text-xs font-mono tabular-nums text-[#86868B]">
                    30 fps · VP9
                  </span>
                </div>
                <p className="text-xs text-[#86868B] leading-relaxed">
                  Captures the live canvas stream with your selected font, colors, and{" "}
                  <span className="text-[#F5F5F7] font-medium">
                    {currentStyle.animationType}
                  </span>{" "}
                  motion transitions.
                </p>
                <button
                  type="button"
                  onClick={handleExportVideo}
                  disabled={isTranscribing || isExporting || captions.length === 0}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#0A84FF] hover:bg-[#0071E3] disabled:opacity-40 text-white font-medium text-xs rounded-xl transition active:scale-[0.99] cursor-pointer shadow-sm"
                  id="export-video-big-btn"
                >
                  <Video className="w-4 h-4" />
                  <span>Render & Download 1080p Video</span>
                </button>
              </div>

              {/* Standalone Subtitle Files */}
              <div className="space-y-2.5">
                <span className="text-xs font-medium text-[#86868B] block">
                  Subtitle & Transcript Formats
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={exportSRT}
                    disabled={isTranscribing || isExporting || captions.length === 0}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-[#2C2C2E] hover:bg-[#3A3A3C] border border-white/[0.06] text-[#F5F5F7] rounded-xl text-xs font-medium transition active:scale-95 cursor-pointer disabled:opacity-40"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#86868B]" />
                    <span>SubRip (.SRT)</span>
                  </button>

                  <button
                    type="button"
                    onClick={exportVTT}
                    disabled={isTranscribing || isExporting || captions.length === 0}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-[#2C2C2E] hover:bg-[#3A3A3C] border border-white/[0.06] text-[#F5F5F7] rounded-xl text-xs font-medium transition active:scale-95 cursor-pointer disabled:opacity-40"
                  >
                    <Clock className="w-3.5 h-3.5 text-[#86868B]" />
                    <span>WebVTT (.VTT)</span>
                  </button>

                  <button
                    type="button"
                    onClick={exportJSON}
                    disabled={isTranscribing || isExporting || captions.length === 0}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-[#2C2C2E] hover:bg-[#3A3A3C] border border-white/[0.06] text-[#F5F5F7] rounded-xl text-xs font-medium transition active:scale-95 cursor-pointer disabled:opacity-40"
                  >
                    <Download className="w-3.5 h-3.5 text-[#86868B]" />
                    <span>JSON Data (.JSON)</span>
                  </button>

                  <button
                    type="button"
                    onClick={exportTXT}
                    disabled={isTranscribing || isExporting || captions.length === 0}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-[#2C2C2E] hover:bg-[#3A3A3C] border border-white/[0.06] text-[#F5F5F7] rounded-xl text-xs font-medium transition active:scale-95 cursor-pointer disabled:opacity-40"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#86868B]" />
                    <span>Plain Text (.TXT)</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Quick Export Dock when viewing Inspector or Transcript */}
          {activeRightPanel !== "export" && (
            <div className="bg-[#1C1C1E]/90 backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={exportSRT}
                  disabled={isTranscribing || isExporting || captions.length === 0}
                  className="px-3 py-1.5 bg-[#2C2C2E] hover:bg-[#3A3A3C] text-[#F5F5F7] rounded-lg text-xs font-medium transition cursor-pointer disabled:opacity-40"
                >
                  .SRT
                </button>
                <button
                  type="button"
                  onClick={exportVTT}
                  disabled={isTranscribing || isExporting || captions.length === 0}
                  className="px-3 py-1.5 bg-[#2C2C2E] hover:bg-[#3A3A3C] text-[#F5F5F7] rounded-lg text-xs font-medium transition cursor-pointer disabled:opacity-40"
                >
                  .VTT
                </button>
              </div>

              <button
                type="button"
                onClick={handleExportVideo}
                disabled={isTranscribing || isExporting || captions.length === 0}
                className="flex items-center gap-2 py-2 px-4 bg-[#0A84FF] hover:bg-[#0071E3] disabled:opacity-40 text-white font-medium text-xs rounded-xl transition active:scale-[0.98] cursor-pointer shadow-sm"
                id="export-video-big-btn"
              >
                <Video className="w-3.5 h-3.5" />
                <span>Render 1080p Video</span>
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Quiet Studio Footer */}
      <footer className="w-full border-t border-white/[0.06] bg-[#000000] py-4 mt-auto select-none">
        <div className="max-w-[1440px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#86868B]">
          <span>Caption Studio Pro · Hardware-Accelerated Client-Side Video Renderer</span>
          <span>1080p Canvas Stream · Real-Time Speech Translation</span>
        </div>
      </footer>
    </div>
  );
}
