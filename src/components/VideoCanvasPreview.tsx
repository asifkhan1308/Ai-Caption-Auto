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

        if ("letterSpacing" in ctx && style.letterSpacing !== undefined) {
          try {
            (ctx as any).letterSpacing = `${style.letterSpacing}px`;
          } catch {
            // ignore if unsupported
          }
        }

        let centerX = cw / 2;
        if (alignment === "left") {
          centerX = cw * 0.1; // 10% safety margin from left
        } else if (alignment === "right") {
          centerX = cw * 0.9; // 10% safety margin from right
        }
        // Apply horizontal xOffset percentage (-40% to +40%)
        centerX += (cw * (style.xOffset ?? 0)) / 100;
        
        const centerY = (ch * style.yOffset) / 100;

        // Convert casing
        let fullText = text;
        if (style.textCase === "uppercase") {
          fullText = text.toUpperCase();
        } else if (style.textCase === "lowercase") {
          fullText = text.toLowerCase();
        } else if (style.textCase === "capitalize") {
          fullText = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
        }

        // --- ANIMATION / TRANSITION TIMING MATH ---
        const animType = style.animationType || "pop";
        const animDuration = Math.max(0.05, style.animationDuration ?? 0.22);
        const elapsed = Math.max(0, time - activeCaption.start);
        const remaining = Math.max(0, activeCaption.end - time);

        // Entrance normalized progression (0 to 1)
        const tIn = Math.min(1, elapsed / animDuration);

        // Exit normalized factor (last 0.14s of caption)
        let exitFactor = 1.0;
        if (style.exitTransition && remaining < 0.14) {
          exitFactor = Math.max(0, remaining / 0.14);
        }

        let textToRender = fullText;
        let scaleX = 1.0;
        let scaleY = 1.0;
        let animOffsetX = 0;
        let animOffsetY = 0;
        let animRotationDeg = 0;
        let animBlurPx = 0;
        let animAlpha = 1.0;
        let dynamicShadowBlur = style.shadowBlur;

        switch (animType) {
          case "pop": {
            if (tIn < 1) {
              const c4 = 1.70158;
              const overshoot = 1 + (c4 + 1) * Math.pow(tIn - 1, 3) + c4 * Math.pow(tIn - 1, 2);
              scaleX = scaleY = 0.35 + 0.65 * overshoot;
              animAlpha = Math.min(1, tIn * 3);
            }
            break;
          }
          case "bounce": {
            if (tIn < 1) {
              const bounceEaseOut = (x: number) => {
                const n1 = 7.5625;
                const d1 = 2.75;
                if (x < 1 / d1) return n1 * x * x;
                if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
                if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
                return n1 * (x -= 2.625 / d1) * x + 0.984375;
              };
              const b = bounceEaseOut(tIn);
              scaleX = scaleY = 0.5 + 0.5 * b;
              animOffsetY = (1 - b) * -(fontSizeInPx * 0.45);
              animAlpha = Math.min(1, tIn * 2.5);
            }
            break;
          }
          case "slide-up": {
            const easeOutCubic = 1 - Math.pow(1 - tIn, 3);
            animOffsetY = (1 - easeOutCubic) * (fontSizeInPx * 0.65);
            animAlpha = easeOutCubic;
            scaleX = scaleY = 0.92 + 0.08 * easeOutCubic;
            break;
          }
          case "slide-down": {
            const easeOutCubic = 1 - Math.pow(1 - tIn, 3);
            animOffsetY = -(1 - easeOutCubic) * (fontSizeInPx * 0.65);
            animAlpha = easeOutCubic;
            scaleX = scaleY = 0.92 + 0.08 * easeOutCubic;
            break;
          }
          case "fade-scale": {
            const easeOutQuad = 1 - (1 - tIn) * (1 - tIn);
            scaleX = scaleY = 0.78 + 0.22 * easeOutQuad;
            animAlpha = easeOutQuad;
            break;
          }
          case "pulse-glow": {
            const ease = 1 - Math.pow(1 - tIn, 2);
            const cycle = Math.sin(elapsed * 12);
            scaleX = scaleY = (0.85 + 0.15 * ease) + (tIn >= 1 ? cycle * 0.03 : 0);
            dynamicShadowBlur = style.shadowBlur + (1 - ease) * 22 + Math.abs(cycle) * 10;
            animAlpha = ease;
            break;
          }
          case "kinetic-zoom": {
            if (tIn < 1) {
              const punch = 1 - Math.pow(tIn, 2);
              scaleX = scaleY = 1.0 + 0.45 * punch;
              animAlpha = Math.min(1, tIn * 3.5);
            }
            break;
          }
          case "typewriter": {
            const charCount = Math.max(1, Math.ceil(tIn * fullText.length));
            textToRender = fullText.slice(0, charCount);
            animAlpha = 1.0;
            break;
          }
          case "blur-reveal": {
            const easeOut = 1 - Math.pow(1 - tIn, 3);
            animBlurPx = (1 - easeOut) * 10;
            scaleX = scaleY = 1.08 - 0.08 * easeOut;
            animAlpha = easeOut;
            break;
          }
          case "whip-pan": {
            const easeOutExpo = tIn === 1 ? 1 : 1 - Math.pow(2, -10 * tIn);
            animOffsetX = -(1 - easeOutExpo) * (cw * 0.22);
            scaleX = 1.18 - 0.18 * easeOutExpo;
            animAlpha = Math.min(1, tIn * 2.5);
            break;
          }
          case "swing": {
            if (tIn < 1) {
              const decay = 1 - tIn;
              animRotationDeg = Math.sin(tIn * Math.PI * 3) * 12 * decay;
              scaleX = scaleY = 0.7 + 0.3 * (1 - Math.pow(1 - tIn, 2));
              animAlpha = Math.min(1, tIn * 3);
            }
            break;
          }
          case "none":
          default:
            scaleX = scaleY = 1.0;
            animAlpha = 1.0;
            break;
        }

        // Apply exit transition (smoothly shrink & fade out)
        if (exitFactor < 1.0) {
          scaleX *= 0.85 + 0.15 * exitFactor;
          scaleY *= 0.85 + 0.15 * exitFactor;
          animAlpha *= exitFactor;
          animOffsetY -= (1 - exitFactor) * (fontSizeInPx * 0.15);
        }

        const totalRotationRad = (((style.rotation ?? 0) + animRotationDeg) * Math.PI) / 180;
        const masterOpacity = style.textOpacity ?? 1.0;

        // Save canvas state and apply global subtitle transform around center
        ctx.save();
        ctx.translate(centerX + animOffsetX, centerY + animOffsetY);
        if (totalRotationRad !== 0) {
          ctx.rotate(totalRotationRad);
        }
        ctx.scale(Math.max(0.01, scaleX), Math.max(0.01, scaleY));
        ctx.translate(-centerX, -centerY);
        ctx.globalAlpha = Math.max(0, Math.min(1, animAlpha * masterOpacity));

        if (animBlurPx > 0.2) {
          try {
            ctx.filter = `blur(${animBlurPx.toFixed(1)}px)`;
          } catch {
            // ignore if unsupported
          }
        }

        // Draw background plate
        if (style.backgroundOpacity > 0) {
          const metrics = ctx.measureText(textToRender);
          const textWidth = metrics.width;
          const paddingX = fontSizeInPx * (style.backgroundPaddingX ?? 0.45);
          const paddingY = fontSizeInPx * (style.backgroundPaddingY ?? 0.25);
          const pillWidth = textWidth + paddingX * 2;
          const pillHeight = fontSizeInPx + paddingY * 2;

          ctx.save();
          ctx.fillStyle = style.backgroundColor;
          ctx.globalAlpha = Math.max(0, Math.min(1, style.backgroundOpacity * animAlpha * masterOpacity));

          let rx = centerX - pillWidth / 2;
          if (alignment === "left") {
            rx = centerX - paddingX;
          } else if (alignment === "right") {
            rx = centerX - pillWidth + paddingX;
          }
          const ry = centerY - pillHeight / 2;
          const radiusFactor = style.backgroundCornerRadius ?? 0.35;
          const r = Math.min(pillHeight / 2, fontSizeInPx * radiusFactor);

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
        if (dynamicShadowBlur > 0 || style.shadowOffsetX !== 0 || style.shadowOffsetY !== 0) {
          ctx.shadowColor = style.shadowColor;
          ctx.shadowBlur = dynamicShadowBlur;
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
        ctx.restore(); // Drop shadow save
        ctx.restore(); // Subtitle transform save
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
    <div className="flex flex-col items-center justify-between w-full h-full bg-[#1C1C1E]/90 backdrop-blur-2xl rounded-2xl border border-white/[0.08] p-4 md:p-5 overflow-hidden select-none shadow-[0_24px_48px_-12px_rgba(0,0,0,0.6)]">
      {/* Top Studio Viewer Header */}
      <div className="w-full flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2 text-xs text-[#86868B] font-medium">
          <span className="text-[#F5F5F7] font-semibold">Canvas Viewer</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums text-[11px]">
            {dimensions.width} × {dimensions.height}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-[#86868B]">
          <span>30 fps</span>
          <span aria-hidden="true">·</span>
          <span className="text-[#F5F5F7] font-medium capitalize">{style.animationType || "pop"} transition</span>
        </div>
      </div>

      {/* Dynamic Canvas Container */}
      <div
        ref={containerRef}
        className="relative flex items-center justify-center w-full flex-1 min-h-[340px] overflow-hidden rounded-xl bg-[#000000] ring-1 ring-white/[0.07] shadow-inner"
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
            className="cursor-pointer max-w-full max-h-full aspect-video md:aspect-[9/16] bg-black rounded-lg shadow-[0_12px_36px_rgba(0,0,0,0.85)] ring-1 ring-white/10 transition-opacity duration-200"
            style={{ width: dimensions.width, height: dimensions.height }}
            id="video-caption-canvas"
          />
        )}

        {/* Loader Overlays */}
        {!videoLoaded && (
          <div className="flex flex-col items-center space-y-3 p-6 text-center">
            <Loader2 className="w-8 h-8 text-[#0A84FF] animate-spin" id="canvas-loading-icon" />
            <p className="text-[#86868B] font-medium text-xs tracking-tight">{loadingMsg}</p>
          </div>
        )}

        {/* Play/Pause Apple Glass Overlay */}
        {videoLoaded && !isPlaying && !isExporting && (
          <button
            onClick={togglePlayback}
            aria-label="Play video"
            className="absolute flex items-center justify-center w-16 h-16 rounded-full bg-black/55 text-white backdrop-blur-xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.5)] hover:bg-black/70 hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer"
            id="canvas-play-btn"
          >
            <Play className="w-7 h-7 fill-white ml-1" />
          </button>
        )}

        {/* Export Progress Apple Sheet Overlay */}
        {isExporting && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center z-10">
            <div className="w-12 h-12 rounded-2xl bg-[#0A84FF]/15 border border-[#0A84FF]/30 flex items-center justify-center mb-4">
              <RefreshCw className="w-6 h-6 text-[#0A84FF] animate-spin" />
            </div>
            <h3 className="text-base font-semibold text-[#F5F5F7] tracking-tight">Rendering 1080p Master</h3>
            <p className="text-xs text-[#86868B] max-w-xs mt-1.5 mb-6 leading-relaxed">
              Encoding frame-accurate captions and transitions directly from the canvas stream. Keep this window active.
            </p>
            <div className="w-64 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#0A84FF] rounded-full transition-all duration-200"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
            <span className="text-xs font-mono tabular-nums font-medium text-[#F5F5F7] mt-2.5">
              {exportProgress}% completed
            </span>
          </div>
        )}
      </div>

      {/* QuickTime-Style Transport Bar */}
      <div className="w-full flex items-center gap-3.5 mt-3.5 bg-[#2C2C2E]/75 backdrop-blur-xl border border-white/[0.08] px-3.5 py-2.5 rounded-xl">
        <button
          onClick={togglePlayback}
          disabled={!videoLoaded || isExporting}
          aria-label={isPlaying ? "Pause" : "Play"}
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 hover:bg-white/15 text-[#F5F5F7] transition-all duration-150 active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer shrink-0"
          id="toolbar-play-toggle-btn"
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current ml-0.5" />
          )}
        </button>

        {/* Current Playhead Timestamp */}
        <span className="text-xs font-mono tabular-nums font-medium text-[#F5F5F7] select-none shrink-0">
          {formatTime(currentTime)}
        </span>

        {/* Precision Scrubber */}
        <div className="flex-1 flex items-center">
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
            className="w-full apple-slider cursor-pointer focus:outline-none disabled:opacity-40"
            id="toolbar-timeline-scrubber"
          />
        </div>

        {/* Total Duration Timestamp */}
        <span className="text-xs font-mono tabular-nums text-[#86868B] select-none shrink-0">
          {formatTime(localVideoRef.current?.duration || 0)}
        </span>
      </div>
    </div>
  );
}
