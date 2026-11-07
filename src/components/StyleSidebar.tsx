import React, { useState } from "react";
import { PresetStyle, TextCaseType, AnimationType } from "../types";
import { DEFAULT_PRESETS } from "../constants/presets";
import {
  UploadCloud,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  RotateCcw,
} from "lucide-react";

interface StyleSidebarProps {
  currentStyle: PresetStyle;
  setCurrentStyle: React.Dispatch<React.SetStateAction<PresetStyle>>;
  isExporting: boolean;
}

const ANIMATION_OPTIONS: {
  value: AnimationType;
  label: string;
  desc: string;
}[] = [
  { value: "pop", label: "Spring Pop", desc: "Elastic spring overshoot" },
  { value: "bounce", label: "Bounce Drop", desc: "Multi-stage rebound" },
  { value: "slide-up", label: "Smooth Rise", desc: "Upward cubic ease-out" },
  { value: "slide-down", label: "Slide Down", desc: "Top-down smooth drop" },
  { value: "fade-scale", label: "Dissolve Scale", desc: "Cinematic zoom & fade" },
  { value: "blur-reveal", label: "Blur Reveal", desc: "Apple Keynote focus pull" },
  { value: "pulse-glow", label: "Luminous Pulse", desc: "Oscillating aura wave" },
  { value: "kinetic-zoom", label: "Kinetic Snap", desc: "1.45× beat impact" },
  { value: "typewriter", label: "Typewriter", desc: "Progressive character reveal" },
  { value: "whip-pan", label: "Whip Pan", desc: "High-velocity horizontal slide" },
  { value: "swing", label: "Pendulum Swing", desc: "Damped rotation settle" },
  { value: "none", label: "Direct Cut", desc: "Instant frame switch" },
];

const FONTS_LIST = [
  { value: '"Impact", "Arial Black", sans-serif', label: "Impact Heavy" },
  { value: '"Plus Jakarta Sans", -apple-system, sans-serif', label: "SF Pro / Jakarta Sans" },
  { value: '"Trebuchet MS", "Outfit", sans-serif', label: "Geometric Rounded" },
  { value: '"Arial Black", sans-serif', label: "Display Black" },
  { value: '"Georgia", "Times New Roman", serif', label: "Editorial Serif" },
  { value: '"Verdana", Geneva, sans-serif', label: "Wide Grotesque" },
  { value: '"JetBrains Mono", "Courier New", monospace', label: "SF Mono / Technical" },
];

export default function StyleSidebar({
  currentStyle,
  setCurrentStyle,
  isExporting,
}: StyleSidebarProps) {
  const [uploadedFonts, setUploadedFonts] = useState<{ value: string; label: string }[]>([]);
  const [fontError, setFontError] = useState<string | null>(null);
  const [inspectorTab, setInspectorTab] = useState<"presets" | "typography" | "effects">("presets");

  const applyPreset = (preset: PresetStyle) => {
    if (isExporting) return;
    setCurrentStyle({ ...preset });
  };

  const updateStyleParam = (key: keyof PresetStyle, value: any) => {
    if (isExporting) return;
    setCurrentStyle((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const resetPositionAndAngle = () => {
    if (isExporting) return;
    setCurrentStyle((prev) => ({
      ...prev,
      xOffset: 0,
      yOffset: 75,
      rotation: 0,
    }));
  };

  const handleFontUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFontError(null);

    try {
      const extension = file.name.split(".").pop()?.toLowerCase();
      if (!["ttf", "otf", "woff", "woff2"].includes(extension || "")) {
        setFontError("Supported formats: TTF, OTF, WOFF, WOFF2.");
        return;
      }

      const fontCleanName = file.name.split(".")[0].replace(/[^a-zA-Z0-9]/g, "_");
      const fontUrl = URL.createObjectURL(file);

      const fontFace = new FontFace(fontCleanName, `url(${fontUrl})`);
      const loadedFace = await fontFace.load();
      document.fonts.add(loadedFace);

      const fontValue = `"${fontCleanName}"`;
      const fontLabel = `Custom: ${file.name.split(".")[0]}`;

      setUploadedFonts((prev) => [...prev, { value: fontValue, label: fontLabel }]);
      updateStyleParam("fontFamily", fontValue);
    } catch (err) {
      console.error("Font loading failed:", err);
      setFontError("Unable to load this font file. Please try another.");
    }
  };

  const TEXT_CASES: { value: TextCaseType; label: string }[] = [
    { value: "uppercase", label: "AA" },
    { value: "lowercase", label: "aa" },
    { value: "capitalize", label: "Aa" },
    { value: "normal", label: "Default" },
  ];

  const allFontsList = [...FONTS_LIST, ...uploadedFonts];

  return (
    <div className="flex flex-col h-full bg-[#1C1C1E]/90 backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-4 md:p-5 overflow-hidden">
      {/* Inspector Header & Segmented Sub-Navigation */}
      <div className="flex flex-col gap-3 mb-4 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[#F5F5F7] tracking-tight">
              Title Inspector
            </h2>
            <p className="text-xs text-[#86868B] mt-0.5">
              Customize presets, motion transitions, and typography
            </p>
          </div>
          <span className="text-xs text-[#86868B] font-medium">
            {currentStyle.name}
          </span>
        </div>

        {/* Apple Segmented Control */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-[#2C2C2E] rounded-xl border border-white/[0.05]">
          {(
            [
              { id: "presets", label: "Presets & Motion" },
              { id: "typography", label: "Typography & Layout" },
              { id: "effects", label: "Appearance" },
            ] as const
          ).map((tab) => {
            const active = inspectorTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setInspectorTab(tab.id)}
                className={`py-1.5 px-3 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0 ${
                  active
                    ? "bg-[#3A3A3C] text-[#F5F5F7] shadow-sm"
                    : "text-[#86868B] hover:text-[#F5F5F7]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrollable Inspector Body */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-5">
        {inspectorTab === "presets" && (
          <>
            {/* Preset Styles Group */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-0.5">
                <h3 className="text-xs font-medium text-[#86868B]">Style Templates</h3>
                <span className="text-[11px] text-[#86868B] font-mono tabular-nums">
                  {DEFAULT_PRESETS.length} styles
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {DEFAULT_PRESETS.map((preset) => {
                  const isSelected = currentStyle.id === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      disabled={isExporting}
                      className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all duration-150 active:scale-[0.98] cursor-pointer disabled:opacity-40 ${
                        isSelected
                          ? "bg-[#0A84FF]/15 border-[#0A84FF] text-[#F5F5F7]"
                          : "bg-[#2C2C2E]/60 border-white/[0.06] text-[#F5F5F7] hover:bg-[#2C2C2E] hover:border-white/15"
                      }`}
                      id={`preset-btn-${preset.id}`}
                    >
                      <span className="text-xs font-semibold tracking-tight text-[#F5F5F7]">
                        {preset.name}
                      </span>
                      <div className="flex items-center gap-1.5 text-[11px] text-[#86868B] mt-1">
                        <span>{preset.fontFamily.split(",")[0].replace(/"/g, "")}</span>
                        <span aria-hidden="true">·</span>
                        <span className="capitalize">{preset.animationType}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="h-px bg-white/[0.07]" />

            {/* Motion & Transitions Group */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-0.5">
                <h3 className="text-xs font-medium text-[#86868B]">Motion Transitions</h3>
                <span className="text-xs text-[#F5F5F7] font-medium capitalize">
                  {currentStyle.animationType || "pop"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {ANIMATION_OPTIONS.map((anim) => {
                  const isSelected = (currentStyle.animationType || "pop") === anim.value;
                  return (
                    <button
                      key={anim.value}
                      type="button"
                      onClick={() => updateStyleParam("animationType", anim.value)}
                      disabled={isExporting}
                      className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all duration-150 active:scale-[0.98] cursor-pointer disabled:opacity-40 ${
                        isSelected
                          ? "bg-[#0A84FF]/15 border-[#0A84FF] text-[#F5F5F7]"
                          : "bg-[#2C2C2E]/60 border-white/[0.06] text-[#F5F5F7] hover:bg-[#2C2C2E] hover:border-white/15"
                      }`}
                      id={`anim-opt-${anim.value}`}
                    >
                      <span className="text-xs font-semibold tracking-tight text-[#F5F5F7]">
                        {anim.label}
                      </span>
                      <span className="text-[11px] text-[#86868B] mt-0.5 line-clamp-1">
                        {anim.desc}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Transition Duration & Exit Dissolve Grouped Card */}
              <div className="bg-[#2C2C2E]/50 border border-white/[0.06] rounded-xl p-3.5 space-y-3.5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-[#F5F5F7]">
                      Transition Duration
                    </label>
                    <span className="text-xs font-mono tabular-nums text-[#86868B]">
                      {Math.round((currentStyle.animationDuration ?? 0.22) * 1000)} ms
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.06}
                    max={0.6}
                    step={0.02}
                    value={currentStyle.animationDuration ?? 0.22}
                    onChange={(e) => updateStyleParam("animationDuration", parseFloat(e.target.value))}
                    disabled={isExporting}
                    className="w-full apple-slider cursor-pointer focus:outline-none"
                    id="anim-duration-slider"
                  />
                  <div className="flex justify-between text-[11px] text-[#86868B]">
                    <span>Snappy (60 ms)</span>
                    <span>Balanced</span>
                    <span>Smooth (600 ms)</span>
                  </div>
                </div>

                <div className="h-px bg-white/[0.06]" />

                {/* Apple iOS/macOS Switch */}
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-medium text-[#F5F5F7] block">
                      Smooth Exit Dissolve
                    </span>
                    <span className="text-[11px] text-[#86868B]">
                      Fade and scale out before next spoken phrase
                    </span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={currentStyle.exitTransition}
                    onClick={() => updateStyleParam("exitTransition", !currentStyle.exitTransition)}
                    disabled={isExporting}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      currentStyle.exitTransition ? "bg-[#30D158]" : "bg-white/15"
                    }`}
                    id="toggle-exit-transition-btn"
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                        currentStyle.exitTransition ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {inspectorTab === "typography" && (
          <>
            {/* Font Family & Custom Font Upload */}
            <div className="bg-[#2C2C2E]/50 border border-white/[0.06] rounded-xl p-3.5 space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#86868B] block">
                  Typeface
                </label>
                <select
                  value={currentStyle.fontFamily}
                  onChange={(e) => updateStyleParam("fontFamily", e.target.value)}
                  disabled={isExporting}
                  className="w-full bg-[#1C1C1E] border border-white/10 text-[#F5F5F7] text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#0A84FF] transition cursor-pointer font-medium"
                  id="style-font-family-select"
                >
                  {allFontsList.map((f) => (
                    <option key={f.value} value={f.value} className="bg-[#1C1C1E] text-[#F5F5F7]">
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="h-px bg-white/[0.06]" />

              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-xs font-medium text-[#F5F5F7] block">
                    Custom Font File
                  </span>
                  <span className="text-[11px] text-[#86868B] block truncate">
                    Supports .ttf, .otf, .woff, .woff2
                  </span>
                </div>
                <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/15 text-xs font-medium text-[#F5F5F7] rounded-lg cursor-pointer transition whitespace-nowrap shrink-0">
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Import Font</span>
                  <input
                    type="file"
                    accept=".ttf,.otf,.woff,.woff2"
                    onChange={handleFontUpload}
                    disabled={isExporting}
                    className="hidden"
                  />
                </label>
              </div>
              {fontError && (
                <p className="text-xs text-[#FF453A] mt-1">{fontError}</p>
              )}
            </div>

            {/* Weight, Alignment & Case */}
            <div className="bg-[#2C2C2E]/50 border border-white/[0.06] rounded-xl p-3.5 space-y-3.5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-[#86868B]">Style & Alignment</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => updateStyleParam("isBold", !currentStyle.isBold)}
                    disabled={isExporting}
                    className={`flex items-center justify-center w-8 h-8 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                      currentStyle.isBold
                        ? "bg-[#0A84FF] border-[#0A84FF] text-white"
                        : "bg-[#1C1C1E] border-white/10 text-[#86868B] hover:text-[#F5F5F7]"
                    }`}
                    title="Bold"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => updateStyleParam("isItalic", !currentStyle.isItalic)}
                    disabled={isExporting}
                    className={`flex items-center justify-center w-8 h-8 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                      currentStyle.isItalic
                        ? "bg-[#0A84FF] border-[#0A84FF] text-white"
                        : "bg-[#1C1C1E] border-white/10 text-[#86868B] hover:text-[#F5F5F7]"
                    }`}
                    title="Italic"
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center bg-[#1C1C1E] p-0.5 rounded-lg border border-white/10 ml-1">
                    {(["left", "center", "right"] as const).map((align) => {
                      const isSelected = currentStyle.textAlignment === align;
                      return (
                        <button
                          key={align}
                          type="button"
                          onClick={() => updateStyleParam("textAlignment", align)}
                          disabled={isExporting}
                          className={`p-1.5 rounded-md transition cursor-pointer ${
                            isSelected
                              ? "bg-[#3A3A3C] text-[#F5F5F7]"
                              : "text-[#86868B] hover:text-[#F5F5F7]"
                          }`}
                          title={`Align ${align}`}
                        >
                          {align === "left" && <AlignLeft className="w-3.5 h-3.5" />}
                          {align === "center" && <AlignCenter className="w-3.5 h-3.5" />}
                          {align === "right" && <AlignRight className="w-3.5 h-3.5" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="h-px bg-white/[0.06]" />

              {/* Casing Segmented Control */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#86868B] block">Case Transform</label>
                <div className="grid grid-cols-4 gap-1 bg-[#1C1C1E] p-1 rounded-lg border border-white/[0.06]">
                  {TEXT_CASES.map((tc) => {
                    const active = currentStyle.textCase === tc.value;
                    return (
                      <button
                        key={tc.value}
                        type="button"
                        onClick={() => updateStyleParam("textCase", tc.value)}
                        disabled={isExporting}
                        className={`py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
                          active
                            ? "bg-[#3A3A3C] text-[#F5F5F7] shadow-sm"
                            : "text-[#86868B] hover:text-[#F5F5F7]"
                        }`}
                      >
                        {tc.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Size, Tracking, X/Y Position & Rotation Angle */}
            <div className="bg-[#2C2C2E]/50 border border-white/[0.06] rounded-xl p-3.5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#86868B]">Geometry & Placement</span>
                <button
                  type="button"
                  onClick={resetPositionAndAngle}
                  disabled={isExporting}
                  className="flex items-center gap-1 text-[11px] text-[#0A84FF] hover:text-[#409CFF] transition cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Placement</span>
                </button>
              </div>

              {/* Quick Safe-Zone Placement Presets */}
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { label: "Top Third", y: 20 },
                  { label: "Center Stage", y: 50 },
                  { label: "Lower Third", y: 78 },
                ].map((pos) => (
                  <button
                    key={pos.label}
                    type="button"
                    onClick={() => updateStyleParam("yOffset", pos.y)}
                    disabled={isExporting}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-medium border transition cursor-pointer ${
                      Math.abs(currentStyle.yOffset - pos.y) <= 3
                        ? "bg-[#0A84FF]/15 border-[#0A84FF] text-[#F5F5F7]"
                        : "bg-[#1C1C1E] border-white/[0.06] text-[#86868B] hover:text-[#F5F5F7]"
                    }`}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-[#F5F5F7]">Scale Size</span>
                  <span className="font-mono tabular-nums text-[#86868B]">
                    {currentStyle.fontSize.toFixed(1)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={3}
                  max={15}
                  step={0.1}
                  value={currentStyle.fontSize}
                  onChange={(e) => updateStyleParam("fontSize", parseFloat(e.target.value))}
                  disabled={isExporting}
                  className="w-full apple-slider cursor-pointer focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-[#F5F5F7]">Character Tracking</span>
                  <span className="font-mono tabular-nums text-[#86868B]">
                    {currentStyle.letterSpacing} px
                  </span>
                </div>
                <input
                  type="range"
                  min={-2}
                  max={12}
                  step={0.5}
                  value={currentStyle.letterSpacing}
                  onChange={(e) => updateStyleParam("letterSpacing", parseFloat(e.target.value))}
                  disabled={isExporting}
                  className="w-full apple-slider cursor-pointer focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-[#F5F5F7]">Vertical (Y)</span>
                    <span className="font-mono tabular-nums text-[#86868B]">
                      {currentStyle.yOffset}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={90}
                    step={1}
                    value={currentStyle.yOffset}
                    onChange={(e) => updateStyleParam("yOffset", parseInt(e.target.value))}
                    disabled={isExporting}
                    className="w-full apple-slider cursor-pointer focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-[#F5F5F7]">Horizontal (X)</span>
                    <span className="font-mono tabular-nums text-[#86868B]">
                      {currentStyle.xOffset ?? 0}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-40}
                    max={40}
                    step={1}
                    value={currentStyle.xOffset ?? 0}
                    onChange={(e) => updateStyleParam("xOffset", parseInt(e.target.value))}
                    disabled={isExporting}
                    className="w-full apple-slider cursor-pointer focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-[#F5F5F7]">Rotation Tilt Angle</span>
                  <span className="font-mono tabular-nums text-[#86868B]">
                    {currentStyle.rotation ?? 0}°
                  </span>
                </div>
                <input
                  type="range"
                  min={-20}
                  max={20}
                  step={1}
                  value={currentStyle.rotation ?? 0}
                  onChange={(e) => updateStyleParam("rotation", parseInt(e.target.value))}
                  disabled={isExporting}
                  className="w-full apple-slider cursor-pointer focus:outline-none"
                />
              </div>
            </div>
          </>
        )}

        {inspectorTab === "effects" && (
          <>
            {/* Text Fill, Master Opacity & Keyword Highlight Colors */}
            <div className="bg-[#2C2C2E]/50 border border-white/[0.06] rounded-xl p-3.5 space-y-3.5">
              <span className="text-xs font-medium text-[#86868B] block">Color & Opacity</span>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="flex items-center justify-between bg-[#1C1C1E] border border-white/[0.06] px-3 py-2 rounded-lg">
                  <span className="text-xs font-medium text-[#F5F5F7]">Primary Fill</span>
                  <input
                    type="color"
                    value={currentStyle.textColor.startsWith("#") ? currentStyle.textColor : "#ffffff"}
                    onChange={(e) => updateStyleParam("textColor", e.target.value)}
                    disabled={isExporting}
                    className="w-6 h-6 rounded-md cursor-pointer bg-transparent border-0"
                  />
                </div>
                <div className="flex items-center justify-between bg-[#1C1C1E] border border-white/[0.06] px-3 py-2 rounded-lg">
                  <span className="text-xs font-medium text-[#F5F5F7]">Keyword Tint</span>
                  <input
                    type="color"
                    value={currentStyle.highlightColor.startsWith("#") ? currentStyle.highlightColor : "#FFD60A"}
                    onChange={(e) => updateStyleParam("highlightColor", e.target.value)}
                    disabled={isExporting}
                    className="w-6 h-6 rounded-md cursor-pointer bg-transparent border-0"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-[#F5F5F7]">Master Text Opacity</span>
                  <span className="font-mono tabular-nums text-[#86868B]">
                    {Math.round((currentStyle.textOpacity ?? 1) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.2}
                  max={1}
                  step={0.05}
                  value={currentStyle.textOpacity ?? 1}
                  onChange={(e) => updateStyleParam("textOpacity", parseFloat(e.target.value))}
                  disabled={isExporting}
                  className="w-full apple-slider cursor-pointer focus:outline-none"
                />
              </div>

              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-medium text-[#86868B] block">
                  Highlighted Trigger Keywords
                </label>
                <input
                  type="text"
                  value={currentStyle.highlightTriggerWords}
                  onChange={(e) => updateStyleParam("highlightTriggerWords", e.target.value)}
                  disabled={isExporting}
                  placeholder="crazy, viral, pro, studio, 1080p"
                  className="w-full bg-[#1C1C1E] border border-white/10 text-[#F5F5F7] text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-[#0A84FF] transition"
                />
              </div>
            </div>

            {/* Outline Stroke */}
            <div className="bg-[#2C2C2E]/50 border border-white/[0.06] rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#F5F5F7]">Stroke Outline</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono tabular-nums text-[#86868B]">
                    {(currentStyle.outlineWidth * 100).toFixed(0)}%
                  </span>
                  <input
                    type="color"
                    value={currentStyle.outlineColor.startsWith("#") ? currentStyle.outlineColor : "#000000"}
                    onChange={(e) => {
                      updateStyleParam("outlineColor", e.target.value);
                      if (currentStyle.outlineWidth === 0) {
                        updateStyleParam("outlineWidth", 0.12);
                      }
                    }}
                    disabled={isExporting}
                    className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                  />
                </div>
              </div>
              <input
                type="range"
                min={0}
                max={0.3}
                step={0.01}
                value={currentStyle.outlineWidth}
                onChange={(e) => updateStyleParam("outlineWidth", parseFloat(e.target.value))}
                disabled={isExporting}
                className="w-full apple-slider cursor-pointer focus:outline-none"
              />
            </div>

            {/* Drop Shadow & Glow */}
            <div className="bg-[#2C2C2E]/50 border border-white/[0.06] rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#F5F5F7]">Drop Shadow & Glow</span>
                <input
                  type="color"
                  value={currentStyle.shadowColor.startsWith("#") ? currentStyle.shadowColor : "#000000"}
                  onChange={(e) => updateStyleParam("shadowColor", e.target.value)}
                  disabled={isExporting}
                  className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-[#86868B]">
                  <span>Blur Radius</span>
                  <span className="font-mono tabular-nums">{currentStyle.shadowBlur} px</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={35}
                  step={1}
                  value={currentStyle.shadowBlur}
                  onChange={(e) => updateStyleParam("shadowBlur", parseInt(e.target.value))}
                  disabled={isExporting}
                  className="w-full apple-slider cursor-pointer focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-[#86868B]">
                    <span>Offset X</span>
                    <span className="font-mono tabular-nums">{currentStyle.shadowOffsetX} px</span>
                  </div>
                  <input
                    type="range"
                    min={-25}
                    max={25}
                    step={1}
                    value={currentStyle.shadowOffsetX}
                    onChange={(e) => updateStyleParam("shadowOffsetX", parseInt(e.target.value))}
                    disabled={isExporting}
                    className="w-full apple-slider cursor-pointer focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-[#86868B]">
                    <span>Offset Y</span>
                    <span className="font-mono tabular-nums">{currentStyle.shadowOffsetY} px</span>
                  </div>
                  <input
                    type="range"
                    min={-25}
                    max={25}
                    step={1}
                    value={currentStyle.shadowOffsetY}
                    onChange={(e) => updateStyleParam("shadowOffsetY", parseInt(e.target.value))}
                    disabled={isExporting}
                    className="w-full apple-slider cursor-pointer focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Backing Plate / Background Box */}
            <div className="bg-[#2C2C2E]/50 border border-white/[0.06] rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#F5F5F7]">Backdrop Plate</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono tabular-nums text-[#86868B]">
                    {Math.round(currentStyle.backgroundOpacity * 100)}%
                  </span>
                  <input
                    type="color"
                    value={currentStyle.backgroundColor.startsWith("#") ? currentStyle.backgroundColor : "#000000"}
                    onChange={(e) => updateStyleParam("backgroundColor", e.target.value)}
                    disabled={isExporting}
                    className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                  />
                </div>
              </div>

              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={currentStyle.backgroundOpacity}
                onChange={(e) => updateStyleParam("backgroundOpacity", parseFloat(e.target.value))}
                disabled={isExporting}
                className="w-full apple-slider cursor-pointer focus:outline-none"
              />

              <div className="grid grid-cols-3 gap-2.5 pt-1">
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-[#86868B]">
                    <span>Pad X</span>
                    <span className="font-mono tabular-nums">
                      {Math.round((currentStyle.backgroundPaddingX ?? 0.45) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.1}
                    max={1.5}
                    step={0.05}
                    value={currentStyle.backgroundPaddingX ?? 0.45}
                    onChange={(e) => updateStyleParam("backgroundPaddingX", parseFloat(e.target.value))}
                    disabled={isExporting}
                    className="w-full apple-slider cursor-pointer focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-[#86868B]">
                    <span>Pad Y</span>
                    <span className="font-mono tabular-nums">
                      {Math.round((currentStyle.backgroundPaddingY ?? 0.25) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.05}
                    max={1.0}
                    step={0.05}
                    value={currentStyle.backgroundPaddingY ?? 0.25}
                    onChange={(e) => updateStyleParam("backgroundPaddingY", parseFloat(e.target.value))}
                    disabled={isExporting}
                    className="w-full apple-slider cursor-pointer focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-[#86868B]">
                    <span>Corner</span>
                    <span className="font-mono tabular-nums">
                      {Math.round((currentStyle.backgroundCornerRadius ?? 0.35) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1.0}
                    step={0.05}
                    value={currentStyle.backgroundCornerRadius ?? 0.35}
                    onChange={(e) => updateStyleParam("backgroundCornerRadius", parseFloat(e.target.value))}
                    disabled={isExporting}
                    className="w-full apple-slider cursor-pointer focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
