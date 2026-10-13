export interface CaptionItem {
  id: string;
  text: string;
  start: number; // in seconds
  end: number;   // in seconds
}

export type TextCaseType = "uppercase" | "lowercase" | "capitalize" | "normal";

export interface PresetStyle {
  id: string;
  name: string;
  fontFamily: string;
  fontSize: number; // Percentage of canvas height (e.g., 6 for 6%)
  textColor: string;
  outlineColor: string;
  outlineWidth: number; // Factor of font size (e.g., 0.15 for 15%)
  highlightColor: string;
  backgroundColor: string;
  backgroundOpacity: number; // 0 to 1
  textCase: TextCaseType;
  yOffset: number; // 0 to 100 percentage from the top (e.g., 75)
  shadowColor: string;
  shadowBlur: number;
  letterSpacing: number; // extra pixels
  shadowOffsetX: number; // in pixels or factor of font size
  shadowOffsetY: number; // in pixels or factor of font size
  isBold: boolean;
  isItalic: boolean;
  highlightTriggerWords: string; // comma-separated trigger list, e.g. "crazy, 🔥, ⚡"
  backgroundPaddingX: number; // horizontal padding as factor of font size
  backgroundPaddingY: number; // vertical padding as factor of font size
  textAlignment: "left" | "center" | "right";
}

export interface VideoMetadata {
  name: string;
  size: number;
  duration: number;
  width: number;
  height: number;
}
