import React, { useEffect, useRef, useState } from "react";
import { CaptionItem, PresetStyle, VideoMetadata } from "../types";
import { Play, Pause, Loader2, RefreshCw } from "lucide-react";

interface VideoCanvasPreviewProps {
  videoFile: File | null;
  videoUrl: string | null;
  captions: CaptionItem[];
  style: PresetStyle;
  currentTime: number;
  setCurrentTime: (time: number) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  videoRef: React.MutableRefObject<HTMLVideoElement | null>;
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  onVideoLoad: (metadata: VideoMetadata) => void;
  isExporting: boolean;
  exportProgress: number;
}

export default function VideoCanvasPreview({
  videoFile,
  videoUrl,
  captions,
  style,
  currentTime,
  setCurrentTime,
  isPlaying,
  setIsPlaying,
  videoRef,
  canvasRef,
  onVideoLoad,
  isExporting,
  exportProgress,
}: VideoCanvasPreviewProps) {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 360, height: 640 });
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("Loading video player...");
  const [resolvedVideoSrc, setResolvedVideoSrc] = useState<string>("");
  const animationFrameRef = useRef<number | null>(null);

  // Sync refs so parent can access
  useEffect(() => {
    if (localVideoRef.current) {
      videoRef.current = localVideoRef.current;
    }
  }, [localVideoRef.current]);

  // Handle source changes robustly without generating multiple temporary object URLs on every render
  useEffect(() => {
    setVideoLoaded(false);
    setLoadingMsg("Processing video source...");

    let url = "";
    if (videoFile) {
      url = URL.createObjectURL(videoFile);
    } else {
      url = videoUrl || "";
    }

    setResolvedVideoSrc(url);

    if (localVideoRef.current) {
      localVideoRef.current.load();
    }

    return () => {
      if (videoFile && url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [videoFile, videoUrl]);

  // Resize canvas according to video aspect ratio and container boundaries
  const resizeCanvas = () => {
    const video = localVideoRef.current;
    const container = containerRef.current;
    if (!video || !container || video.videoWidth === 0) return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    const videoAspect = video.videoWidth / video.videoHeight;
    const containerAspect = containerWidth / containerHeight;

    let targetWidth = containerWidth;
    let targetHeight = containerHeight;

    if (videoAspect > containerAspect) {
      // Landscape constrained by width
      targetWidth = containerWidth;
      targetHeight = containerWidth / videoAspect;
    } else {
      // Portrait constrained by height
      targetHeight = containerHeight;
      targetWidth = containerHeight * videoAspect;
    }

    setDimensions({
      width: Math.floor(targetWidth),
      height: Math.floor(targetHeight),
    });
  };

  useEffect(() => {
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, []);

  const handleLoadedMetadata = () => {
    const video = localVideoRef.current;
    if (!video) return;

    onVideoLoad({
      name: videoFile ? videoFile.name : "Demo Video.mp4",
      size: videoFile ? videoFile.size : 12400000,
      duration: video.duration,
      width: video.videoWidth,
      height: video.videoHeight,
    });

    resizeCanvas();
    setVideoLoaded(true);
  };

  // The main rendering loop on the Canvas
  useEffect(() => {
    let active = true;

    const renderLoop = () => {
      if (!active) return;

      const video = localVideoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || !videoLoaded) {
        animationFrameRef.current = requestAnimationFrame(renderLoop);
        return;
      }

      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      // Ensure canvas internal resolution matches display size
      if (canvas.width !== dimensions.width || canvas.height !== dimensions.height) {
        canvas.width = dimensions.width;
        canvas.height = dimensions.height;
      }

      const cw = canvas.width;
      const ch = canvas.height;

      // 1. Draw current video frame onto canvas
      try {
        ctx.drawImage(video, 0, 0, cw, ch);
      } catch (err) {
        // Log once or ignore to avoid spamming, but prevent halting render loop
        console.warn("Could not draw video frame onto canvas", err);
      }

      // 2. Find the active caption matching current timestamp
      const time = video.currentTime;
      if (!isExporting) {
        setCurrentTime(time);
      }

      const activeCaption = captions.find(
        (c) => time >= c.start && time <= c.end
      );

      // 3. Render captions if active
      if (activeCaption) {
        const text = activeCaption.text;

        // Custom responsive styling calculation
        const fontSizeInPx = (ch * style.fontSize) / 100;
        
        // Build dynamic font style string
        const fontStyle = [
          style.isItalic ? "italic" : "",
          style.isBold ? "bold" : "",
          `${fontSizeInPx}px`,
          style.fontFamily
        ].filter(Boolean).join(" ");
        ctx.font = fontStyle;
        
        const alignment = style.textAlignment || "center";
        ctx.textAlign = alignment;
        ctx.textBaseline = "middle";

        let centerX = cw / 2;
        if (alignment === "left") {
          centerX = cw * 0.1; // 10% safety margin from left
        } else if (alignment === "right") {
          centerX = cw * 0.9; // 10% safety margin from right
        }
        
        const centerY = (ch * style.yOffset) / 100;

        // Convert casing
        let textToRender = text;
        if (style.textCase === "uppercase") {
          textToRender = text.toUpperCase();
        } else if (style.textCase === "lowercase") {
          textToRender = text.toLowerCase();
        } else if (style.textCase === "capitalize") {
          textToRender = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
        }

        // Draw background pill
        if (style.backgroundOpacity > 0) {
          const metrics = ctx.measureText(textToRender);
          const textWidth = metrics.width;
          const paddingX = fontSizeInPx * (style.backgroundPaddingX ?? 0.45);
          const paddingY = fontSizeInPx * (style.backgroundPaddingY ?? 0.25);
          const pillWidth = textWidth + paddingX * 2;
          const pillHeight = fontSizeInPx + paddingY * 2;

          ctx.save();
          ctx.fillStyle = style.backgroundColor;
          ctx.globalAlpha = style.backgroundOpacity;

          // Drawing rounded rectangle manually for compatibility and alignment
          let rx = centerX - pillWidth / 2;
          if (alignment === "left") {
            rx = centerX - paddingX;
          } else if (alignment === "right") {
            rx = centerX - pillWidth + paddingX;
          }
          const ry = centerY - pillHeight / 2;
          const r = fontSizeInPx * 0.35; // corner radius

          ctx.beginPath();
          ctx.moveTo(rx + r, ry);
          ctx.lineTo(rx + pillWidth - r, ry);
          ctx.quadraticCurveTo(rx + pillWidth, ry, rx + pillWidth, ry + r);
          ctx.lineTo(rx + pillWidth, ry + pillHeight - r);
          ctx.quadraticCurveTo(rx + pillWidth, ry + pillHeight, rx + pillWidth - r, ry + pillHeight);
          ctx.lineTo(rx + r, ry + pillHeight);
          ctx.quadraticCurveTo(rx, ry + pillHeight, rx, ry + pillHeight - r);
          ctx.lineTo(rx, ry + r);
          ctx.quadraticCurveTo(rx, ry, rx + r, ry);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }

        // Apply Drop Shadow (Glow effect for Neon presets)
        ctx.save();
        if (style.shadowBlur > 0) {
          ctx.shadowColor = style.shadowColor;
          ctx.shadowBlur = style.shadowBlur;
          ctx.shadowOffsetX = style.shadowOffsetX ?? 0;
          ctx.shadowOffsetY = style.shadowOffsetY ?? (ch * 0.005);
        }

        // Draw Stroke (Outline text)
        if (style.outlineWidth > 0 && style.outlineColor !== "transparent") {
          ctx.strokeStyle = style.outlineColor;
          ctx.lineWidth = fontSizeInPx * style.outlineWidth;
          ctx.lineJoin = "round";
          ctx.lineCap = "round";
          ctx.strokeText(textToRender, centerX, centerY);
        }

        // Draw Fill (Text highlight overlay logic)
        // Parse comma-separated highlight trigger words from style
        let shouldHighlight = false;
        if (style.highlightTriggerWords) {
          const triggers = style.highlightTriggerWords
            .split(",")
            .map((t) => t.trim().toLowerCase())
            .filter(Boolean);
          const lowerText = textToRender.toLowerCase();
          shouldHighlight = triggers.some((trigger) => lowerText.includes(trigger));
        }

        if (shouldHighlight) {
          ctx.fillStyle = style.highlightColor;
        } else {
          ctx.fillStyle = style.textColor;
        }

        ctx.fillText(textToRender, centerX, centerY);
        ctx.restore();
      }

      animationFrameRef.current = requestAnimationFrame(renderLoop);
    };

    renderLoop();

    return () => {
      active = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [dimensions, videoLoaded, captions, style, isExporting]);

  const togglePlayback = () => {
    const video = localVideoRef.current;
    if (!video || !videoLoaded || isExporting) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play().catch(console.error);
      setIsPlaying(true);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "00:00.00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 100);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-[#09090B] rounded-lg border border-zinc-800 p-4 md:p-6 overflow-hidden select-none">
      {/* Dynamic Canvas Container */}
      <div
        ref={containerRef}
        className="relative flex items-center justify-center w-full flex-1 min-h-[300px] overflow-hidden rounded-md bg-zinc-950"
      >
        {/* Hidden video element that sources the frames */}
        <video
          ref={localVideoRef}
          src={resolvedVideoSrc || undefined}
          crossOrigin="anonymous"
          playsInline
          className="hidden"
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
        />

        {/* High-Performance Rendering Canvas */}
        {videoLoaded && (
          <canvas
            ref={canvasRef}
            onClick={togglePlayback}
            className="cursor-pointer max-w-full max-h-full aspect-video md:aspect-[9/16] bg-black shadow-2xl rounded border border-zinc-800 hover:border-zinc-700 transition duration-300"
            style={{ width: dimensions.width, height: dimensions.height }}
            id="video-caption-canvas"
          />
        )}

        {/* Loader Overlays */}
        {!videoLoaded && (
          <div className="flex flex-col items-center space-y-3 p-6 text-center animate-pulse">
            <Loader2 className="w-10 h-10 text-[#EFFF00] animate-spin" id="canvas-loading-icon" />
            <p className="text-zinc-400 font-bold uppercase tracking-wider text-[10px]">{loadingMsg}</p>
          </div>
        )}

        {/* Play/Pause overlay indicator */}
        {videoLoaded && !isPlaying && !isExporting && (
          <button
            onClick={togglePlayback}
            className="absolute p-4 rounded-full bg-black/80 text-white backdrop-blur-sm border border-zinc-800 hover:scale-110 active:scale-95 transition cursor-pointer"
            id="canvas-play-btn"
          >
            <Play className="w-8 h-8 fill-white ml-0.5" />
          </button>
        )}

        {/* Export Progress overlay */}
        {isExporting && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-10">
            <RefreshCw className="w-12 h-12 text-[#EFFF00] animate-spin mb-4" />
            <h3 className="text-sm font-black text-white uppercase tracking-widest">Exporting 1080p HD Video...</h3>
            <p className="text-[10px] text-zinc-500 max-w-xs mb-6 uppercase tracking-wider font-medium leading-relaxed">
              Synthesizing word timings, drawing layout frames, and encoding hardware-accelerated streams. Please keep this browser window open.
            </p>
            <div className="w-64 h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
              <div
                className="h-full bg-[#EFFF00] rounded transition-all duration-300"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
            <span className="text-xs font-mono font-bold text-[#EFFF00] mt-2 tracking-widest">{exportProgress}% COMPLETE</span>
          </div>
        )}
      </div>

      {/* Video Navigation Bar */}
      <div className="w-full flex items-center justify-between mt-4 bg-zinc-900/50 border border-zinc-800 p-3 rounded">
        <button
          onClick={togglePlayback}
          disabled={!videoLoaded || isExporting}
          className="flex items-center justify-center w-10 h-10 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white transition active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          id="toolbar-play-toggle-btn"
        >
          {isPlaying ? <Pause className="w-5 h-5 fill-zinc-200" /> : <Play className="w-5 h-5 fill-zinc-200 ml-0.5" />}
        </button>

        {/* Audio Timing Playhead */}
        <span className="text-xs font-mono font-bold text-zinc-400 select-none">
          {formatTime(currentTime)} / {formatTime(localVideoRef.current?.duration || 0)}
        </span>

        {/* Quick seeker or scrub slider */}
        <div className="flex-1 mx-4">
          <input
            type="range"
            min={0}
            max={localVideoRef.current?.duration || 100}
            step={0.01}
            value={currentTime}
            onChange={(e) => {
              const video = localVideoRef.current;
              if (video && !isExporting) {
                const targetTime = parseFloat(e.target.value);
                video.currentTime = targetTime;
                setCurrentTime(targetTime);
              }
            }}
            disabled={!videoLoaded || isExporting}
            className="w-full h-1.5 bg-zinc-800 rounded appearance-none cursor-pointer accent-[#EFFF00] focus:outline-none disabled:opacity-40"
            id="toolbar-timeline-scrubber"
          />
        </div>
      </div>
    </div>
  );
}
