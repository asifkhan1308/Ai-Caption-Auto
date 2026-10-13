import React, { useState, useRef, useEffect } from "react";
import { CaptionItem, PresetStyle, VideoMetadata } from "./types";
import { DEFAULT_PRESETS } from "./constants/presets";
import { extractWavAudio } from "./utils/audioExtractor";
import StyleSidebar from "./components/StyleSidebar";
import VideoCanvasPreview from "./components/VideoCanvasPreview";
import CaptionsEditor from "./components/CaptionsEditor";
import {
  Upload,
  Sparkles,
  Download,
  FileVideo,
  Video,
  Info,
  X,
  Play,
  RotateCcw,
  CheckCircle2,
  FileText,
  Clock,
  Code,
  Sliders,
  Wand2,
  AlertCircle
} from "lucide-react";

const DEMO_VIDEO_URL = "https://assets.mixkit.co/videos/preview/mixkit-girl-in-neon-sign-city-40011-large.mp4";

const DEMO_CAPTIONS: CaptionItem[] = [
  { id: "d1", text: "Yo! 🌟", start: 0.1, end: 1.2 },
  { id: "d2", text: "Welcome", start: 1.2, end: 1.8 },
  { id: "d3", text: "to AI Auto Captioner! 🔥", start: 1.8, end: 3.2 },
  { id: "d4", text: "This is a", start: 3.2, end: 3.8 },
  { id: "d5", text: "zero-cost", start: 3.8, end: 4.5 },
  { id: "d6", text: "client-side editor! 💻", start: 4.5, end: 5.8 },
  { id: "d7", text: "Look at", start: 5.8, end: 6.4 },
  { id: "d8", text: "these animated", start: 6.4, end: 7.1 },
  { id: "d9", text: "Hormozi subtitles! ⚡", start: 7.1, end: 8.5 },
  { id: "d10", text: "Aap easily", start: 8.5, end: 9.3 },
  { id: "d11", text: "apne captions", start: 9.3, end: 10.2 },
  { id: "d12", text: "ko edit,", start: 10.2, end: 10.9 },
  { id: "d13", text: "style,", start: 10.9, end: 11.5 },
  { id: "d14", text: "aur modify", start: 11.5, end: 12.1 },
  { id: "d15", text: "kar sakte ho! 📈", start: 12.1, end: 13.5 },
  { id: "d16", text: "Click export", start: 13.5, end: 14.3 },
  { id: "d17", text: "to download", start: 14.3, end: 15.0 },
  { id: "d18", text: "your 1080p video! 🎬", start: 15.0, end: 16.5 },
];

export default function App() {
  // Master states
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

  // Transcription & API states
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribeStage, setTranscribeStage] = useState("");
  const [transcribeProgress, setTranscribeProgress] = useState(0);
  const [apiError, setApiError] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState(
    "Transcribe with Hinglish support, short punchy captions (1-2 words), and insert relevant viral emojis naturally."
  );

  // Export states
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // Parent shared references
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Seek helper
  const handleSeek = (time: number) => {
    if (videoRef.current && !isExporting) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  // Drag and drop video upload
  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith("video/") && !file.type.startsWith("audio/")) {
      alert("Invalid file type. Please upload an MP4, Mov, WebM, or valid video format.");
      return;
    }
    setVideoFile(file);
    setVideoUrl(null);
    setCaptions([]);
    setVideoMeta(null);
    setApiError(null);
    setIsPlaying(false);
    
    // Auto initiate audio extraction and transcription!
    triggerTranscription(file);
  };

  // Convert captions to SRT
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

  // Convert captions to WebVTT
  const exportVTT = () => {
    const vttContent = "WEBVTT\n\n" + captions
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

  // Convert captions to JSON
  const exportJSON = () => {
    triggerDownload(
      JSON.stringify(captions, null, 2),
      "captions.json",
      "application/json"
    );
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

  // Client-Side Hardware-Accelerated Video Rendering & Recording
  const handleExportVideo = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    setIsExporting(true);
    setExportProgress(0);
    setIsPlaying(false);
    video.pause();

    // 1. Seek back to 0
    video.currentTime = 0;

    await new Promise<void>((resolve) => {
      const onSeeked = () => {
        video.removeEventListener("seeked", onSeeked);
        resolve();
      };
      video.addEventListener("seeked", onSeeked);
    });

    const chunks: BlobPart[] = [];

    // 2. Capture high-performance frame stream
    const canvasStream = canvas.captureStream(30); // 30 FPS stream

    let combinedStream = canvasStream;
    let audioContext: AudioContext | null = null;
    let sourceNode: MediaElementAudioSourceNode | null = null;
    let destNode: MediaStreamAudioDestinationNode | null = null;

    try {
      // 3. Connect audio channel
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      sourceNode = audioContext.createMediaElementSource(video);
      destNode = audioContext.createMediaStreamDestination();

      sourceNode.connect(destNode);
      sourceNode.connect(audioContext.destination); // Play out loud so user can audit audio

      // Combine canvas video track and virtual audio track
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

        // Disconnect and clean Web Audio contexts
        if (sourceNode && destNode && audioContext) {
          sourceNode.disconnect();
          audioContext.close();
        }

        setIsExporting(false);
        setExportProgress(100);
      };

      // Start recording
      recorder.start();

      // Unmute/play the video to drive the canvas render loop
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
      alert("Failed to initialize MediaRecorder on your browser. Please ensure you are using a modern desktop browser like Chrome or Microsoft Edge.");
      setIsExporting(false);
    }
  };

  // Perform client-side audio extraction + backend Gemini API speech translation
  const triggerTranscription = async (file: File) => {
    setIsTranscribing(true);
    setApiError(null);
    setTranscribeProgress(0);

    try {
      // Step 1: Extract WAV payload client-side
      const { base64, duration } = await extractWavAudio(file, (stage, prog) => {
        setTranscribeStage(stage);
        setTranscribeProgress(prog);
      });

      // Step 2: Post base64 payload to server-side Gemini Proxy API
      setTranscribeStage("Interpreting accents via Server-Side Gemini AI...");
      setTranscribeProgress(80);

      const response = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audio: base64,
          mimeType: "audio/wav",
          promptContext: customPrompt,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to transcribe audio.");
      }

      const { transcript } = await response.json();

      if (!transcript || !Array.isArray(transcript)) {
        throw new Error("Invalid transcription format returned by the AI.");
      }

      // Format transcripts with unique keys
      const formattedCaptions: CaptionItem[] = transcript.map((item: any, idx: number) => ({
        id: `gemini_word_${idx}_${Date.now()}`,
        text: item.text,
        start: parseFloat(item.start),
        end: parseFloat(item.end),
      }));

      setCaptions(formattedCaptions);
      setTranscribeProgress(100);
      setTranscribeStage("AI Transcription Successful!");
      
      // Auto seek to start
      handleSeek(0);

    } catch (err: any) {
      console.error("Master transcription failure:", err);
      setApiError(
        err.message ||
        "An unexpected error occurred. Please verify your GEMINI_API_KEY inside the Settings > Secrets panel."
      );
    } finally {
      setIsTranscribing(false);
    }
  };

  // Load sample demo transcript fallback
  const loadDemoFallback = () => {
    setCaptions(DEMO_CAPTIONS);
    setApiError(null);
    handleSeek(0);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-zinc-100 font-sans flex flex-col antialiased">
      {/* Header Bar */}
      <header className="sticky top-0 z-20 w-full border-b border-zinc-800 bg-[#0A0A0A]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded bg-[#EFFF00] text-black shadow-lg shadow-[#EFFF00]/10">
              <Sparkles className="w-5 h-5 fill-black" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-widest text-white flex items-center gap-2 uppercase">
                AI Auto Captioner
                <span className="text-[9px] bg-[#EFFF00]/10 border border-[#EFFF00]/30 text-[#EFFF00] font-black px-1.5 py-0.5 rounded tracking-normal">
                  FREE / CLIENT-SIDE
                </span>
              </h1>
              <p className="text-[10px] font-mono uppercase tracking-tighter text-zinc-500">Short-form subtitles with zero server costs</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Quick stats on the loaded video */}
            {videoMeta && (
              <div className="hidden md:flex items-center space-x-2 bg-zinc-900/50 border border-zinc-800 px-3 py-1.5 rounded text-xs font-mono text-zinc-400">
                <FileVideo className="w-3.5 h-3.5 text-zinc-500" />
                <span className="truncate max-w-[140px] uppercase font-bold" title={videoMeta.name}>
                  {videoMeta.name}
                </span>
                <span className="text-zinc-700">|</span>
                <span className="font-bold">{videoMeta.duration.toFixed(1)}S</span>
              </div>
            )}

            {/* Custom file input */}
            <label className="flex items-center gap-1.5 px-4 py-2 bg-[#EFFF00] hover:bg-[#EFFF00]/90 text-black font-black uppercase text-xs rounded tracking-wider transition active:scale-95 cursor-pointer">
              <Upload className="w-4 h-4" />
              Upload Video
              <input
                type="file"
                accept="video/*,audio/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
                disabled={isTranscribing || isExporting}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col lg:flex-row gap-6 overflow-hidden">
        
        {/* Left Side: Video Canvas Live Render Frame */}
        <div className="flex-1 flex flex-col justify-between max-w-xl mx-auto w-full">
          <div className="h-full">
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

          {/* Prompt context edit area */}
          <div className="mt-4 bg-zinc-900/50 border border-zinc-800 rounded p-4">
            <label className="text-xs font-black text-zinc-300 uppercase tracking-widest flex items-center gap-1.5 mb-2">
              <Wand2 className="w-4 h-4 text-[#EFFF00]" />
              AI Prompt Instructions
            </label>
            <p className="text-[10px] uppercase font-mono tracking-tighter text-zinc-500 mb-2">
              Guide the server-side Gemini AI model on how to transcribe, insert custom slang, or generate auto-emojis.
            </p>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              disabled={isTranscribing || isExporting}
              placeholder="e.g., Use heavy Hinglish slang, add plenty of emojis, split by individual words."
              className="w-full h-16 bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs rounded p-2.5 focus:outline-none focus:border-[#EFFF00]/50 resize-none font-medium"
            />
          </div>
        </div>

        {/* Right Side: Tabular Workspaces & Editor Panels */}
        <div className="w-full lg:w-[480px] flex flex-col gap-6">
          
          {/* AI Transcription Progress Tracker */}
          {isTranscribing && (
            <div className="bg-zinc-900 border border-zinc-800 rounded p-4 flex flex-col space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#EFFF00] tracking-widest uppercase flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#EFFF00] animate-ping" />
                  AI Transcription In Progress...
                </span>
                <span className="text-xs font-mono font-bold text-zinc-400">{transcribeProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-zinc-950 border border-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#EFFF00] rounded-full transition-all duration-300"
                  style={{ width: `${transcribeProgress}%` }}
                />
              </div>
              <p className="text-[10px] text-zinc-400 italic font-mono uppercase tracking-tighter">{transcribeStage}</p>
            </div>
          )}

          {/* Missing API Key Error Notification Banner */}
          {apiError && (
            <div className="bg-rose-950/20 border border-rose-900/40 rounded p-4 flex flex-col space-y-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">AI Transcription Failed</h4>
                  <p className="text-[10px] text-rose-300/90 leading-relaxed mt-1">
                    {apiError}
                  </p>
                  <p className="text-[10px] text-zinc-500 leading-relaxed mt-1.5 uppercase font-mono tracking-tighter">
                    To resolve, confirm your <code className="bg-zinc-950 text-rose-300 px-1 py-0.5 rounded text-[9px]">GEMINI_API_KEY</code> is correctly set inside the <span className="font-bold text-zinc-300">Settings &gt; Secrets</span> panel of the AI Studio UI.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1 border-t border-rose-900/20">
                <button
                  onClick={loadDemoFallback}
                  className="px-3 py-1.5 bg-rose-900/30 hover:bg-rose-900 text-rose-200 hover:text-white rounded text-[10px] font-black uppercase tracking-wider transition active:scale-95 cursor-pointer"
                >
                  Load Demo Subtitles
                </button>
                <span className="text-[10px] text-zinc-500 uppercase font-mono">or try uploading another file</span>
              </div>
            </div>
          )}

          {/* Preset Styles Panel */}
          <div className="shrink-0">
            <StyleSidebar
              currentStyle={currentStyle}
              setCurrentStyle={setCurrentStyle}
              isExporting={isExporting}
            />
          </div>

          {/* Caption List Timeline Editor */}
          <div className="flex-1 min-h-[300px]">
            <CaptionsEditor
              captions={captions}
              setCaptions={setCaptions}
              currentTime={currentTime}
              onSeek={handleSeek}
              isExporting={isExporting}
            />
          </div>

          {/* Downloader / Exporter Hub */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded p-4 flex flex-col gap-3">
            <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
              <Download className="w-4 h-4 text-zinc-500" />
              Creator Export Center
            </h3>

            <div className="grid grid-cols-2 gap-2">
              {/* Export Full Video */}
              <button
                onClick={handleExportVideo}
                disabled={isTranscribing || isExporting || captions.length === 0}
                className="col-span-2 flex items-center justify-center gap-2 py-3 bg-[#EFFF00] hover:bg-[#EFFF00]/95 disabled:bg-zinc-800 disabled:opacity-40 disabled:text-zinc-600 text-black font-black uppercase tracking-wider rounded transition duration-300 shadow-lg hover:shadow-[#EFFF00]/10 active:scale-95 cursor-pointer text-xs"
                id="export-video-big-btn"
              >
                <Video className="w-4 h-4 fill-black" />
                Render & Export 1080p Video
              </button>

              {/* Export Subtitles (.SRT) */}
              <button
                onClick={exportSRT}
                disabled={isTranscribing || isExporting || captions.length === 0}
                className="flex items-center justify-center gap-1.5 py-2.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white rounded text-[10px] font-black uppercase tracking-wider transition active:scale-95 cursor-pointer"
                title="Download SRT"
              >
                <FileText className="w-3.5 h-3.5 text-zinc-500" />
                Download SRT
              </button>

              {/* Export WebVTT */}
              <button
                onClick={exportVTT}
                disabled={isTranscribing || isExporting || captions.length === 0}
                className="flex items-center justify-center gap-1.5 py-2.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white rounded text-[10px] font-black uppercase tracking-wider transition active:scale-95 cursor-pointer"
                title="Download WebVTT"
              >
                <Clock className="w-3.5 h-3.5 text-zinc-500" />
                Download VTT
              </button>
            </div>
          </div>

        </div>
      </main>

      {/* Info footer */}
      <footer className="w-full border-t border-zinc-800 bg-[#0A0A0A] py-4 mt-auto select-none">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-[9px] text-zinc-600 uppercase font-mono tracking-tighter flex items-center justify-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-zinc-700" />
            Designed with absolute zero-cost server hosting. Auto-transcribed via server-side Gemini 3.5 Flash proxy. Captions rendered at 1080p canvas and recorded client-side.
          </p>
        </div>
      </footer>
    </div>
  );
}
