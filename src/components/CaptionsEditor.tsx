import React, { useState, useEffect, useRef } from "react";
import { CaptionItem } from "../types";
import { Search, Plus, Trash2, Clock, Play, RotateCcw, AlertCircle } from "lucide-react";

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
  const activeCardRef = useRef<HTMLDivElement | null>(null);
  const listContainerRef = useRef<HTMLDivElement | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll the active caption card into view
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

  // Handle caption text change
  const handleTextChange = (id: string, text: string) => {
    setCaptions((prev) =>
      prev.map((c) => (c.id === id ? { ...c, text } : c))
    );
  };

  // Adjust timing helper
  const adjustTiming = (
    id: string,
    field: "start" | "end",
    amount: number
  ) => {
    setCaptions((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const newVal = Math.max(0, parseFloat((c[field] + amount).toFixed(2)));
          if (field === "start" && newVal > c.end) return c; // Start cannot be after end
          if (field === "end" && newVal < c.start) return c;   // End cannot be before start
          return { ...c, [field]: newVal };
        }
        return c;
      })
    );
  };

  // Delete a caption card
  const deleteCaption = (id: string) => {
    setCaptions((prev) => prev.filter((c) => c.id !== id));
  };

  // Insert a new caption card after the current index
  const insertCaptionAfter = (index: number) => {
    setCaptions((prev) => {
      const current = prev[index];
      const next = prev[index + 1];

      // Formulate timing offsets
      const start = current ? parseFloat((current.end + 0.05).toFixed(2)) : 0;
      const end = next
        ? parseFloat((next.start - 0.05).toFixed(2))
        : parseFloat((start + 1.2).toFixed(2));

      const newCaption: CaptionItem = {
        id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        text: "New word/phrase ✨",
        start,
        end: end > start ? end : parseFloat((start + 1.0).toFixed(2)),
      };

      const copy = [...prev];
      copy.splice(index + 1, 0, newCaption);
      return copy;
    });
  };

  // Sort captions chronologically by start time
  const sortCaptions = () => {
    setCaptions((prev) => [...prev].sort((a, b) => a.start - b.start));
  };

  // Filtered captions list
  const filteredCaptions = captions.filter((c) =>
    c.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-[#09090B] border border-zinc-800 rounded-lg p-4 md:p-5 overflow-hidden">
      {/* Header and Controls */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-black text-zinc-100 tracking-widest uppercase">Editor Chunks</h2>
          <p className="text-[10px] font-mono uppercase tracking-tighter text-zinc-500 mt-0.5">Total words: {captions.length}</p>
        </div>

        {/* Sync Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={sortCaptions}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] font-bold uppercase tracking-wider text-zinc-300 hover:text-white transition cursor-pointer disabled:opacity-40"
            title="Sort captions chronologically"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Sort Timeline
          </button>
          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-800 text-[10px] font-bold uppercase tracking-wider text-zinc-300 cursor-pointer hover:bg-zinc-750">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded accent-[#EFFF00] cursor-pointer"
            />
            Auto Scroll
          </label>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Search and filter spoken words..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={isExporting}
          className="w-full bg-zinc-950 border border-zinc-850 text-zinc-100 placeholder-zinc-600 rounded pl-10 pr-4 py-2.5 text-xs font-bold uppercase tracking-wide focus:outline-none focus:border-[#EFFF00]/50 transition disabled:opacity-50"
          id="captions-search-field"
        />
      </div>

      {/* Caption Lists Container */}
      <div
        ref={listContainerRef}
        className="flex-1 overflow-y-auto space-y-3 pr-1 border border-zinc-850 rounded bg-zinc-950 p-3 min-h-[250px]"
      >
        {filteredCaptions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 text-zinc-500">
            <AlertCircle className="w-8 h-8 mb-2 stroke-zinc-600" />
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">No spoken words match search criteria.</p>
            {captions.length === 0 && (
              <button
                onClick={() => insertCaptionAfter(-1)}
                disabled={isExporting}
                className="mt-4 flex items-center gap-1 px-4 py-2 bg-[#EFFF00] hover:bg-[#EFFF00]/95 text-black rounded text-xs font-black uppercase tracking-wider transition active:scale-95 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add First Caption
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
                className={`relative flex flex-col md:flex-row items-start md:items-center justify-between p-3.5 rounded border transition-all duration-300 ${
                  isActive
                    ? "bg-[#EFFF00]/10 border-[#EFFF00] shadow-[0_0_12px_rgba(239,255,0,0.15)]"
                    : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700"
                }`}
              >
                {/* Visual anchor / index */}
                <div className="flex items-center space-x-3 w-full md:w-auto">
                  <button
                    onClick={() => onSeek(caption.start)}
                    className={`flex items-center justify-center w-7 h-7 rounded transition-colors cursor-pointer ${
                      isActive
                        ? "bg-[#EFFF00] text-black hover:bg-[#EFFF00]/90"
                        : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                    }`}
                    title="Seek video playhead here"
                  >
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  </button>

                  {/* Main Edit Input */}
                  <input
                    type="text"
                    value={caption.text}
                    onChange={(e) => handleTextChange(caption.id, e.target.value)}
                    onFocus={() => setEditingId(caption.id)}
                    onBlur={() => setEditingId(null)}
                    disabled={isExporting}
                    className={`flex-1 bg-transparent border-b border-transparent hover:border-zinc-700 focus:border-[#EFFF00] text-sm py-0.5 transition focus:outline-none focus:ring-0 ${
                      isActive
                        ? "font-black uppercase italic text-[#EFFF00]"
                        : "font-medium text-zinc-100"
                    }`}
                    placeholder="Enter subtitle text..."
                  />
                </div>

                {/* Timings Aligners */}
                <div className="flex items-center space-x-4 mt-3.5 md:mt-0 w-full md:w-auto justify-between md:justify-end border-t border-zinc-800 md:border-none pt-3 md:pt-0">
                  <div className="flex items-center gap-2">
                    {/* Start Time Controls */}
                    <div className="flex flex-col items-start">
                      <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mb-0.5">Start</span>
                      <div className="flex items-center bg-zinc-950 border border-zinc-855 rounded px-2 py-1 space-x-1.5 font-mono text-[10px] text-zinc-300">
                        <button
                          onClick={() => adjustTiming(caption.id, "start", -0.1)}
                          disabled={isExporting || caption.start <= 0}
                          className="text-zinc-500 hover:text-white transition px-1 cursor-pointer disabled:opacity-30"
                        >
                          -
                        </button>
                        <span>{caption.start.toFixed(2)}s</span>
                        <button
                          onClick={() => adjustTiming(caption.id, "start", 0.1)}
                          disabled={isExporting || caption.start >= caption.end}
                          className="text-zinc-500 hover:text-white transition px-1 cursor-pointer disabled:opacity-30"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* End Time Controls */}
                    <div className="flex flex-col items-start">
                      <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mb-0.5">End</span>
                      <div className="flex items-center bg-zinc-950 border border-zinc-855 rounded px-2 py-1 space-x-1.5 font-mono text-[10px] text-zinc-300">
                        <button
                          onClick={() => adjustTiming(caption.id, "end", -0.1)}
                          disabled={isExporting || caption.end <= caption.start}
                          className="text-zinc-500 hover:text-white transition px-1 cursor-pointer disabled:opacity-30"
                        >
                          -
                        </button>
                        <span>{caption.end.toFixed(2)}s</span>
                        <button
                          onClick={() => adjustTiming(caption.id, "end", 0.1)}
                          disabled={isExporting}
                          className="text-zinc-500 hover:text-white transition px-1 cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Actions (Delete & Add card helpers) */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => insertCaptionAfter(idx)}
                      disabled={isExporting}
                      className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition active:scale-95 cursor-pointer"
                      title="Insert new caption card right after"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteCaption(caption.id)}
                      disabled={isExporting}
                      className="p-1.5 rounded bg-rose-950/40 hover:bg-rose-900 border border-rose-900/30 text-rose-300 hover:text-white transition active:scale-95 cursor-pointer"
                      title="Delete card"
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
