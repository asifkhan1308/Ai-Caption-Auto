import React, { useState } from "react";
import { PresetStyle, TextCaseType } from "../types";
import { DEFAULT_PRESETS } from "../constants/presets";
import { Type, Sparkles, Sliders, Palette, Move, UploadCloud, AlignLeft, AlignCenter, AlignRight, Bold, Italic, Layers, Moon } from "lucide-react";

interface StyleSidebarProps {
  currentStyle: PresetStyle;
  setCurrentStyle: React.Dispatch<React.SetStateAction<PresetStyle>>;
  isExporting: boolean;
}

const FONTS_LIST = [
  { value: '"Impact", "Arial Black", sans-serif', label: "Impact Bold (Hormozi)" },
  { value: '"Inter", system-ui, sans-serif', label: "Inter (Modern Sans)" },
  { value: '"Trebuchet MS", "Outfit", sans-serif', label: "Outfit / Trebuchet (Round Tech)" },
  { value: '"Arial Black", sans-serif', label: "Arial Black (Retro)" },
  { value: '"Courier New", Courier, monospace', label: "Monospace (Tech Logs)" },
];

export default function StyleSidebar({
  currentStyle,
  setCurrentStyle,
  isExporting,
}: StyleSidebarProps) {
  // State for dynamically uploaded custom fonts
  const [uploadedFonts, setUploadedFonts] = useState<{ value: string; label: string }[]>([]);
  const [fontError, setFontError] = useState<string | null>(null);

  // Apply a premade Preset
  const applyPreset = (preset: PresetStyle) => {
    if (isExporting) return;
    setCurrentStyle({ ...preset });
  };

  // Generic tweak helper
  const updateStyleParam = (key: keyof PresetStyle, value: any) => {
    if (isExporting) return;
    setCurrentStyle((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Handle local font upload and registration
  const handleFontUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFontError(null);

    try {
      const extension = file.name.split(".").pop()?.toLowerCase();
      if (!["ttf", "otf", "woff", "woff2"].includes(extension || "")) {
        setFontError("Only TTF, OTF, WOFF, or WOFF2 files are supported.");
        return;
      }

      const fontCleanName = file.name.split(".")[0].replace(/[^a-zA-Z0-9]/g, "_");
      const fontUrl = URL.createObjectURL(file);

      // Dynamically load font into the browser context so the <canvas> can draw it!
      const fontFace = new FontFace(fontCleanName, `url(${fontUrl})`);
      const loadedFace = await fontFace.load();
      document.fonts.add(loadedFace);

      const fontValue = `"${fontCleanName}"`;
      const fontLabel = `⭐ Custom: ${file.name.split(".")[0]}`;

      // Update local state list and immediately select it
      setUploadedFonts((prev) => [...prev, { value: fontValue, label: fontLabel }]);
      updateStyleParam("fontFamily", fontValue);
    } catch (err) {
      console.error("Font loading failed:", err);
      setFontError("Failed to parse this font file. Try another one.");
    }
  };

  const TEXT_CASES: { value: TextCaseType; label: string }[] = [
    { value: "uppercase", label: "ALL CAPS" },
    { value: "lowercase", label: "all small" },
    { value: "capitalize", label: "First Cap" },
    { value: "normal", label: "Normal" },
  ];

  const allFontsList = [...FONTS_LIST, ...uploadedFonts];

  return (
    <div className="flex flex-col h-full bg-[#09090B] border border-zinc-800 rounded-lg p-4 md:p-5 overflow-y-auto space-y-6">
      {/* Sidebar title */}
      <div>
        <h2 className="text-sm font-black text-zinc-100 tracking-widest uppercase flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#EFFF00]" />
          Visual Style
        </h2>
        <p className="text-[10px] text-zinc-500 tracking-tight mt-0.5 font-sans">Choose custom styles or tailor your brand metrics manually.</p>
      </div>

      {/* Preset Styles Section */}
      <div className="space-y-3">
        <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5 text-zinc-600" />
          Design Presets
        </h3>
        <div className="grid grid-cols-2 gap-2.5">
          {DEFAULT_PRESETS.map((preset) => {
            const isSelected = currentStyle.id === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset)}
                disabled={isExporting}
                className={`flex flex-col items-start p-3 rounded border text-left transition active:scale-95 cursor-pointer disabled:opacity-40 ${
                  isSelected
                    ? "bg-[#EFFF00]/10 border-[#EFFF00] text-[#EFFF00]"
                    : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900"
                }`}
                id={`preset-btn-${preset.id}`}
              >
                <span className="text-xs font-black uppercase tracking-tight italic">{preset.name}</span>
                <span className="text-[9px] text-zinc-500 mt-1 font-mono tracking-tighter">{preset.fontFamily.split(",")[0].replace(/"/g, "")}</span>
              </button>
            );
          })}
        </div>
      </div>

      <hr className="border-zinc-800" />

      {/* Manual Customization Controls */}
      <div className="space-y-5">
        <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-zinc-600" />
          Text Settings
        </h3>

        {/* Font Family Selection */}
        <div className="space-y-2">
          <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 flex items-center gap-1.5">
            <Type className="w-3.5 h-3.5 text-zinc-500" />
            Font Family
          </label>
          <select
            value={currentStyle.fontFamily}
            onChange={(e) => updateStyleParam("fontFamily", e.target.value)}
            disabled={isExporting}
            className="w-full bg-zinc-950 border border-zinc-850 text-zinc-200 text-xs rounded p-2.5 focus:outline-none focus:border-[#EFFF00]/50 transition cursor-pointer font-bold uppercase tracking-wider"
            id="style-font-family-select"
          >
            {allFontsList.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        {/* Upload Custom Font Option */}
        <div className="p-3 bg-zinc-950 border border-zinc-850 rounded space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-1">
              <UploadCloud className="w-3.5 h-3.5 text-zinc-500" />
              Upload Custom Font File
            </span>
          </div>
          <p className="text-[9px] text-zinc-600 leading-normal uppercase font-mono">
            Support TTF, OTF, WOFF, or WOFF2 files. Loads instantly on the render playhead.
          </p>
          <label className="flex items-center justify-center gap-1.5 w-full py-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-850 text-[10px] font-bold uppercase text-zinc-300 rounded cursor-pointer transition">
            <span>Select Font File</span>
            <input
              type="file"
              accept=".ttf,.otf,.woff,.woff2"
              onChange={handleFontUpload}
              disabled={isExporting}
              className="hidden"
            />
          </label>
          {fontError && (
            <p className="text-[9px] text-rose-400 font-mono uppercase mt-1">{fontError}</p>
          )}
        </div>

        {/* Basic Text Options (Bold, Italic, Alignment) */}
        <div className="p-3 bg-zinc-950 border border-zinc-850 rounded space-y-3">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Formatting & Alignment</span>
          
          <div className="grid grid-cols-2 gap-2">
            {/* Bold Toggle */}
            <button
              onClick={() => updateStyleParam("isBold", !currentStyle.isBold)}
              disabled={isExporting}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-bold uppercase transition cursor-pointer ${
                currentStyle.isBold
                  ? "bg-[#EFFF00]/20 border border-[#EFFF00] text-[#EFFF00]"
                  : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:border-zinc-700"
              }`}
            >
              <Bold className="w-3.5 h-3.5" />
              Bold
            </button>

            {/* Italic Toggle */}
            <button
              onClick={() => updateStyleParam("isItalic", !currentStyle.isItalic)}
              disabled={isExporting}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-bold uppercase transition cursor-pointer ${
                currentStyle.isItalic
                  ? "bg-[#EFFF00]/20 border border-[#EFFF00] text-[#EFFF00]"
                  : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:border-zinc-700"
              }`}
            >
              <Italic className="w-3.5 h-3.5" />
              Italic
            </button>
          </div>

          {/* Text Alignment */}
          <div className="space-y-1.5">
            <label className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">Text Alignment</label>
            <div className="grid grid-cols-3 gap-1 bg-zinc-900 p-1 rounded border border-zinc-800">
              {(["left", "center", "right"] as const).map((align) => {
                const isSelected = currentStyle.textAlignment === align;
                return (
                  <button
                    key={align}
                    onClick={() => updateStyleParam("textAlignment", align)}
                    disabled={isExporting}
                    className={`py-1 rounded text-[9px] font-black uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1 ${
                      isSelected
                        ? "bg-[#EFFF00] text-black"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    {align === "left" && <AlignLeft className="w-3 h-3" />}
                    {align === "center" && <AlignCenter className="w-3 h-3" />}
                    {align === "right" && <AlignRight className="w-3 h-3" />}
                    {align}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Font Size & Letter Spacing Slider */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 flex justify-between">
              <span>Font Size</span>
              <span className="text-[#EFFF00] font-mono font-bold">{currentStyle.fontSize.toFixed(1)}%</span>
            </label>
            <input
              type="range"
              min={3}
              max={15}
              step={0.1}
              value={currentStyle.fontSize}
              onChange={(e) => updateStyleParam("fontSize", parseFloat(e.target.value))}
              disabled={isExporting}
              className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-[#EFFF00] focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 flex justify-between">
              <span>Spacing</span>
              <span className="text-[#EFFF00] font-mono font-bold">{currentStyle.letterSpacing}px</span>
            </label>
            <input
              type="range"
              min={-2}
              max={10}
              step={0.5}
              value={currentStyle.letterSpacing}
              onChange={(e) => updateStyleParam("letterSpacing", parseFloat(e.target.value))}
              disabled={isExporting}
              className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-[#EFFF00] focus:outline-none"
            />
          </div>
        </div>

        {/* Font Colors Section */}
        <div className="space-y-3.5">
          <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Color Palette</label>
          
          <div className="grid grid-cols-2 gap-3">
            {/* Main Text Color */}
            <div className="flex items-center justify-between bg-zinc-950 border border-zinc-850 p-2 rounded">
              <span className="text-[10px] uppercase font-bold tracking-tight text-zinc-500">Fill Color</span>
              <input
                type="color"
                value={currentStyle.textColor.startsWith("#") ? currentStyle.textColor : "#ffffff"}
                onChange={(e) => updateStyleParam("textColor", e.target.value)}
                disabled={isExporting}
                className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                title="Edit fill color"
              />
            </div>

            {/* Highlight Emphasis Color */}
            <div className="flex items-center justify-between bg-zinc-950 border border-zinc-850 p-2 rounded">
              <span className="text-[10px] uppercase font-bold tracking-tight text-zinc-500">Highlight</span>
              <input
                type="color"
                value={currentStyle.highlightColor.startsWith("#") ? currentStyle.highlightColor : "#EFFF00"}
                onChange={(e) => updateStyleParam("highlightColor", e.target.value)}
                disabled={isExporting}
                className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                title="Edit emphasis color"
              />
            </div>
          </div>
        </div>

        {/* Dynamic Highlighting Setup */}
        <div className="space-y-3 p-3 bg-zinc-950 rounded border border-zinc-850">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center justify-between">
            <span>Highlight trigger words</span>
          </label>
          <p className="text-[9px] text-zinc-600 leading-normal uppercase font-mono">
            Comma-separated words that should automatically trigger the Highlight color on the video frame.
          </p>
          <input
            type="text"
            value={currentStyle.highlightTriggerWords}
            onChange={(e) => updateStyleParam("highlightTriggerWords", e.target.value)}
            disabled={isExporting}
            placeholder="e.g. crazy, viral, 🔥, ⚡, magic"
            className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded p-2.5 focus:outline-none focus:border-[#EFFF00]/50 transition font-mono uppercase tracking-wide"
          />
        </div>

        {/* Outline Settings */}
        <div className="space-y-3 p-3 bg-zinc-950 rounded border border-zinc-850">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Outline / Stroke</label>
          <div className="grid grid-cols-2 gap-3 items-center">
            <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800 px-2 py-1 rounded">
              <span className="text-[10px] text-zinc-500 uppercase font-bold">Color</span>
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
            <div className="space-y-1">
              <label className="text-[9px] text-zinc-500 font-bold flex justify-between">
                <span>Stroke</span>
                <span>{(currentStyle.outlineWidth * 100).toFixed(0)}%</span>
              </label>
              <input
                type="range"
                min={0}
                max={0.3}
                step={0.01}
                value={currentStyle.outlineWidth}
                onChange={(e) => updateStyleParam("outlineWidth", parseFloat(e.target.value))}
                disabled={isExporting}
                className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-[#EFFF00] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Shadow Settings (Color, Blur, OffsetX, OffsetY) */}
        <div className="space-y-3 p-3 bg-zinc-950 rounded border border-zinc-850">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Drop Shadow & Glow</label>
          
          <div className="grid grid-cols-2 gap-3 mb-2">
            <div className="flex items-center justify-between bg-zinc-900 border border-zinc-850 px-2 py-1 rounded">
              <span className="text-[10px] text-zinc-500 uppercase font-bold">Color</span>
              <input
                type="color"
                value={currentStyle.shadowColor.startsWith("#") ? currentStyle.shadowColor : "#000000"}
                onChange={(e) => updateStyleParam("shadowColor", e.target.value)}
                disabled={isExporting}
                className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-[9px] text-zinc-500 font-bold flex justify-between">
                <span>Blur</span>
                <span>{currentStyle.shadowBlur}px</span>
              </label>
              <input
                type="range"
                min={0}
                max={30}
                step={1}
                value={currentStyle.shadowBlur}
                onChange={(e) => updateStyleParam("shadowBlur", parseInt(e.target.value))}
                disabled={isExporting}
                className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-[#EFFF00] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[9px] text-zinc-500 font-bold flex justify-between">
                <span>Offset X</span>
                <span>{currentStyle.shadowOffsetX}px</span>
              </label>
              <input
                type="range"
                min={-20}
                max={20}
                step={1}
                value={currentStyle.shadowOffsetX}
                onChange={(e) => updateStyleParam("shadowOffsetX", parseInt(e.target.value))}
                disabled={isExporting}
                className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-[#EFFF00] focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] text-zinc-500 font-bold flex justify-between">
                <span>Offset Y</span>
                <span>{currentStyle.shadowOffsetY}px</span>
              </label>
              <input
                type="range"
                min={-20}
                max={20}
                step={1}
                value={currentStyle.shadowOffsetY}
                onChange={(e) => updateStyleParam("shadowOffsetY", parseInt(e.target.value))}
                disabled={isExporting}
                className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-[#EFFF00] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Background Pills / Highlighter & Paddings */}
        <div className="space-y-3 p-3 bg-zinc-950 rounded border border-zinc-850">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Background Pill Layer</label>
          
          <div className="flex items-center justify-between bg-zinc-900 border border-zinc-850 px-2 py-1 rounded mb-2">
            <span className="text-[10px] text-zinc-500 uppercase font-bold">Pill Color</span>
            <input
              type="color"
              value={currentStyle.backgroundColor.startsWith("#") ? currentStyle.backgroundColor : "#000000"}
              onChange={(e) => updateStyleParam("backgroundColor", e.target.value)}
              disabled={isExporting}
              className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
            />
          </div>

          <div className="space-y-1.5 mb-2">
            <label className="text-[9px] text-zinc-500 font-bold flex justify-between">
              <span>Opacity</span>
              <span>{Math.round(currentStyle.backgroundOpacity * 100)}%</span>
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={currentStyle.backgroundOpacity}
              onChange={(e) => updateStyleParam("backgroundOpacity", parseFloat(e.target.value))}
              disabled={isExporting}
              className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-[#EFFF00] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[9px] text-zinc-500 font-bold flex justify-between">
                <span>Pad X</span>
                <span>{Math.round((currentStyle.backgroundPaddingX ?? 0.45) * 100)}%</span>
              </label>
              <input
                type="range"
                min={0.1}
                max={1.5}
                step={0.05}
                value={currentStyle.backgroundPaddingX ?? 0.45}
                onChange={(e) => updateStyleParam("backgroundPaddingX", parseFloat(e.target.value))}
                disabled={isExporting}
                className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-[#EFFF00] focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] text-zinc-500 font-bold flex justify-between">
                <span>Pad Y</span>
                <span>{Math.round((currentStyle.backgroundPaddingY ?? 0.25) * 100)}%</span>
              </label>
              <input
                type="range"
                min={0.05}
                max={1.0}
                step={0.05}
                value={currentStyle.backgroundPaddingY ?? 0.25}
                onChange={(e) => updateStyleParam("backgroundPaddingY", parseFloat(e.target.value))}
                disabled={isExporting}
                className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-[#EFFF00] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Casing Text transform */}
        <div className="space-y-2">
          <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Casing / Transform</label>
          <div className="grid grid-cols-4 gap-1 bg-zinc-950 p-1 rounded border border-zinc-850">
            {TEXT_CASES.map((tc) => {
              const active = currentStyle.textCase === tc.value;
              return (
                <button
                  key={tc.value}
                  onClick={() => updateStyleParam("textCase", tc.value)}
                  disabled={isExporting}
                  className={`py-1.5 rounded text-[9px] font-black tracking-wider transition uppercase cursor-pointer ${
                    active
                      ? "bg-[#EFFF00] text-black shadow font-black"
                      : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900"
                  }`}
                >
                  {tc.value.substr(0, 4)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Vertical Align Offset Slider */}
        <div className="space-y-2 p-3 bg-zinc-950 rounded border border-zinc-850">
          <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 flex items-center justify-between">
            <span className="flex items-center gap-1 font-bold uppercase">
              <Move className="w-3.5 h-3.5 text-zinc-500" />
              Y-Axis Offset
            </span>
            <span className="text-[#EFFF00] font-mono font-bold">{currentStyle.yOffset}%</span>
          </label>
          <input
            type="range"
            min={10}
            max={90}
            step={1}
            value={currentStyle.yOffset}
            onChange={(e) => updateStyleParam("yOffset", parseInt(e.target.value))}
            disabled={isExporting}
            className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-[#EFFF00] focus:outline-none"
          />
          <div className="flex justify-between text-[9px] text-zinc-600 font-bold uppercase tracking-wider mt-1 font-mono">
            <span>Top header</span>
            <span>Bottom footer</span>
          </div>
        </div>
      </div>
    </div>
  );
}
