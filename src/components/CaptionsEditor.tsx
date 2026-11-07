import React, { useState, useEffect, useRef } from "react";
import { CaptionItem } from "../types";
import { Search, Plus, Trash2, Play, RotateCcw, AlertCircle } from "lucide-react";

interface CaptionsEditorProps {
  captions: CaptionItem[];
  setCaptions: React.Dispatch<React.SetStateAction<CaptionItem[]>>;
  currentTime: number;
  onSeek: (time: number) => void;
  isExporting: boolean;
}

export default function CaptionsEditor({
  captions,
  setCaptions,
  currentTime,
  onSeek,
  isExporting,
}: CaptionsEditorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const listContainerRef = useRef<HTMLDivElement | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (!autoScroll || editingId) return;

    const activeCaption = captions.find(
      (c) => currentTime >= c.start && currentTime <= c.end
    );

    if (activeCaption) {
      const element = document.getElementById(`caption-card-${activeCaption.id}`);
      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }
    }
  }, [currentTime, captions, autoScroll, editingId]);

  const handleTextChange = (id: string, text: string) => {
    setCaptions((prev) =>
      prev.map((c) => (c.id === id ? { ...c, text } : c))
    );
  };

  const adjustTiming = (
    id: string,
    field: "start" | "end",
    amount: number
  ) => {
    setCaptions((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const newVal = Math.max(0, parseFloat((c[field] + amount).toFixed(2)));
          if (field === "start" && newVal > c.end) return c;
          if (field === "end" && newVal < c.start) return c;
          return { ...c, [field]: newVal };
        }
        return c;
      })
    );
  };

  // Batch shift all timestamps forward or backward
  const shiftAllTimings = (deltaSeconds: number) => {
    if (isExporting) return;
    setCaptions((prev) =>
      prev.map((c) => {
        const nextStart = Math.max(0, parseFloat((c.start + deltaSeconds).toFixed(2)));
        const duration = Math.max(0.1, c.end - c.start);
        const nextEnd = parseFloat((nextStart + duration).toFixed(2));
        return { ...c, start: nextStart, end: nextEnd };
      })
    );
  };

  // Remove any emojis or special symbols across all segments
  const stripSpecialCharacters = () => {
    if (isExporting) return;
    setCaptions((prev) =>
      prev.map((c) => ({
        ...c,
        text: c.text
          .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
          .replace(/\s+/g, " ")
          .trim(),
      }))
    );
  };

  const deleteCaption = (id: string) => {
    setCaptions((prev) => prev.filter((c) => c.id !== id));
  };

  const insertCaptionAfter = (index: number) => {
    setCaptions((prev) => {
      const current = prev[index];
      const next = prev[index + 1];

      const start = current ? parseFloat((current.end + 0.05).toFixed(2)) : 0;
      const end = next
        ? parseFloat((next.start - 0.05).toFixed(2))
        : parseFloat((start + 1.2).toFixed(2));

      const newCaption: CaptionItem = {
        id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        text: "New caption phrase",
        start,
        end: end > start ? end : parseFloat((start + 1.0).toFixed(2)),
      };

      const copy = [...prev];
      copy.splice(index + 1, 0, newCaption);
      return copy;
    });
  };

  const sortCaptions = () => {
    setCaptions((prev) => [...prev].sort((a, b) => a.start - b.start));
  };

  const filteredCaptions = captions.filter((c) =>
    c.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-[#1C1C1E]/90 backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-4 md:p-5 overflow-hidden">
      {/* Header and Controls */}
      <div className="flex items-center justify-between gap-4 mb-3 shrink-0">
        <div>
          <h2 className="text-sm font-semibold text-[#F5F5F7] tracking-tight">
            Transcript Timeline
          </h2>
          <p className="text-xs text-[#86868B] mt-0.5 font-mono tabular-nums">
            {captions.length} segments · Click playhead to seek
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={sortCaptions}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#2C2C2E] hover:bg-[#3A3A3C] text-xs font-medium text-[#F5F5F7] transition cursor-pointer disabled:opacity-40 whitespace-nowrap shrink-0"
            title="Sort captions chronologically"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#86868B]" />
            <span>Sort</span>
          </button>

          <button
            type="button"
            onClick={() => setAutoScroll(!autoScroll)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap shrink-0 ${
              autoScroll
                ? "bg-[#0A84FF]/15 text-[#0A84FF] border border-[#0A84FF]/30"
                : "bg-[#2C2C2E] text-[#86868B] hover:text-[#F5F5F7]"
            }`}
          >
            Follow Playhead
          </button>
        </div>
      </div>

      {/* Batch Timeline Utilities Bar */}
      <div className="flex items-center justify-between gap-2 mb-3 px-2.5 py-1.5 rounded-xl bg-[#2C2C2E]/50 border border-white/[0.05] text-xs shrink-0">
        <span className="text-[11px] text-[#86868B] font-medium">Batch Tools</span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => shiftAllTimings(-0.1)}
            disabled={isExporting || captions.length === 0}
            className="px-2 py-1 rounded-md bg-[#1C1C1E] hover:bg-[#3A3A3C] text-[11px] font-mono tabular-nums text-[#F5F5F7] transition cursor-pointer disabled:opacity-40"
            title="Shift all captions 100ms earlier"
          >
            -0.10s All
          </button>
          <button
            type="button"
            onClick={() => shiftAllTimings(0.1)}
            disabled={isExporting || captions.length === 0}
            className="px-2 py-1 rounded-md bg-[#1C1C1E] hover:bg-[#3A3A3C] text-[11px] font-mono tabular-nums text-[#F5F5F7] transition cursor-pointer disabled:opacity-40"
            title="Shift all captions 100ms later"
          >
            +0.10s All
          </button>
          <button
            type="button"
            onClick={stripSpecialCharacters}
            disabled={isExporting || captions.length === 0}
            className="px-2 py-1 rounded-md bg-[#1C1C1E] hover:bg-[#3A3A3C] text-[11px] font-medium text-[#F5F5F7] transition cursor-pointer disabled:opacity-40"
            title="Clean symbols and emojis from all segments"
          >
            Clean Symbols
          </button>
        </div>
      </div>

      {/* Apple Spotlight Search Bar */}
      <div className="relative mb-3.5 shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868B]" />
        <input
          type="text"
          placeholder="Filter transcript segments..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={isExporting}
          className="w-full bg-[#2C2C2E]/80 border border-white/[0.06] text-[#F5F5F7] placeholder-[#86868B] rounded-xl pl-9 pr-4 py-2 text-xs font-medium focus:outline-none focus:border-[#0A84FF] transition disabled:opacity-50"
          id="captions-search-field"
        />
      </div>

      {/* Caption List Container */}
      <div
        ref={listContainerRef}
        className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[260px]"
      >
        {filteredCaptions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 text-[#86868B]">
            <AlertCircle className="w-7 h-7 mb-2 stroke-[#86868B]" />
            <p className="text-xs font-medium text-[#86868B]">
              No transcript segments match your filter.
            </p>
            {captions.length === 0 && (
              <button
                type="button"
                onClick={() => insertCaptionAfter(-1)}
                disabled={isExporting}
                className="mt-4 flex items-center gap-1.5 px-4 py-2 bg-[#0A84FF] hover:bg-[#0071E3] text-white rounded-lg text-xs font-medium transition active:scale-95 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add First Segment</span>
              </button>
            )}
          </div>
        ) : (
          filteredCaptions.map((caption, idx) => {
            const isActive = currentTime >= caption.start && currentTime <= caption.end;

            return (
              <div
                key={caption.id}
                id={`caption-card-${caption.id}`}
                className={`group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 p-3 rounded-xl border transition-all duration-150 ${
                  isActive
                    ? "bg-[#0A84FF]/15 border-[#0A84FF]/60"
                    : "bg-[#2C2C2E]/45 border-white/[0.05] hover:bg-[#2C2C2E]/80 hover:border-white/10"
                }`}
              >
                {/* Playhead Jump + Editable Phrase */}
                <div className="flex items-center gap-2.5 w-full sm:flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => onSeek(caption.start)}
                    className={`flex items-center justify-center w-7 h-7 rounded-lg transition-colors cursor-pointer shrink-0 ${
                      isActive
                        ? "bg-[#0A84FF] text-white"
                        : "bg-white/[0.07] text-[#86868B] hover:bg-white/15 hover:text-[#F5F5F7]"
                    }`}
                    title="Jump playhead to segment"
                  >
                    <Play className="w-3 h-3 fill-current ml-0.5" />
                  </button>

                  <input
                    type="text"
                    value={caption.text}
                    onChange={(e) => handleTextChange(caption.id, e.target.value)}
                    onFocus={() => setEditingId(caption.id)}
                    onBlur={() => setEditingId(null)}
                    disabled={isExporting}
                    className={`flex-1 min-w-0 bg-transparent border-b border-transparent hover:border-white/15 focus:border-[#0A84FF] text-sm py-0.5 transition focus:outline-none ${
                      isActive
                        ? "font-semibold text-[#F5F5F7]"
                        : "font-normal text-[#F5F5F7]/90"
                    }`}
                    placeholder="Enter subtitle text..."
                  />
                </div>

                {/* Timecode Stepper & Segment Actions */}
                <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end shrink-0">
                  <div className="flex items-center gap-1.5 font-mono tabular-nums text-[11px]">
                    {/* Start Time Stepper */}
                    <div className="flex items-center bg-[#1C1C1E] border border-white/[0.07] rounded-lg px-1.5 py-1 gap-1 text-[#F5F5F7]">
                      <button
                        type="button"
                        onClick={() => adjustTiming(caption.id, "start", -0.1)}
                        disabled={isExporting || caption.start <= 0}
                        className="text-[#86868B] hover:text-[#F5F5F7] px-1 cursor-pointer disabled:opacity-30"
                        title="Earlier start (-0.1s)"
                      >
                        −
                      </button>
                      <span>{caption.start.toFixed(2)}s</span>
                      <button
                        type="button"
                        onClick={() => adjustTiming(caption.id, "start", 0.1)}
                        disabled={isExporting || caption.start >= caption.end}
                        className="text-[#86868B] hover:text-[#F5F5F7] px-1 cursor-pointer disabled:opacity-30"
                        title="Later start (+0.1s)"
                      >
                        +
                      </button>
                    </div>

                    <span className="text-[#86868B]">→</span>

                    {/* End Time Stepper */}
                    <div className="flex items-center bg-[#1C1C1E] border border-white/[0.07] rounded-lg px-1.5 py-1 gap-1 text-[#F5F5F7]">
                      <button
                        type="button"
                        onClick={() => adjustTiming(caption.id, "end", -0.1)}
                        disabled={isExporting || caption.end <= caption.start}
                        className="text-[#86868B] hover:text-[#F5F5F7] px-1 cursor-pointer disabled:opacity-30"
                        title="Earlier end (-0.1s)"
                      >
                        −
                      </button>
                      <span>{caption.end.toFixed(2)}s</span>
                      <button
                        type="button"
                        onClick={() => adjustTiming(caption.id, "end", 0.1)}
                        disabled={isExporting}
                        className="text-[#86868B] hover:text-[#F5F5F7] px-1 cursor-pointer"
                        title="Later end (+0.1s)"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Insert & Delete */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => insertCaptionAfter(idx)}
                      disabled={isExporting}
                      className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/15 text-[#86868B] hover:text-[#F5F5F7] transition active:scale-95 cursor-pointer"
                      title="Insert segment after"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteCaption(caption.id)}
                      disabled={isExporting}
                      className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-[#FF453A]/20 text-[#86868B] hover:text-[#FF453A] transition active:scale-95 cursor-pointer"
                      title="Delete segment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
