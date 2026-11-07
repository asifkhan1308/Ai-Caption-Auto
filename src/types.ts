export interface CaptionItem {
  id: string;
  text: string;
  start: number; // in seconds
  end: number;   // in seconds
}

export type TextCaseType = "uppercase" | "lowercase" | "capitalize" | "normal";

export type AnimationType =
  | "pop"
  | "bounce"
  | "slide-up"
  | "slide-down"
  | "fade-scale"
  | "pulse-glow"
  | "kinetic-zoom"
  | "typewriter"
  | "blur-reveal"
  | "whip-pan"
  | "swing"
  | "none";

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
  xOffset: number; // -40 to 40 percentage horizontal shift from center/anchor
  rotation: number; // -20 to 20 degrees tilt
  textOpacity: number; // 0.1 to 1.0 master caption opacity
  backgroundCornerRadius: number; // 0 to 1.0 factor of fontSize
  shadowColor: string;
  shadowBlur: number;
  letterSpacing: number; // extra pixels
  shadowOffsetX: number; // in pixels
  shadowOffsetY: number; // in pixels
  isBold: boolean;
  isItalic: boolean;
  highlightTriggerWords: string; // comma-separated trigger list
  backgroundPaddingX: number; // horizontal padding as factor of font size
  backgroundPaddingY: number; // vertical padding as factor of font size
  textAlignment: "left" | "center" | "right";
  // Transition and text animations
  animationType: AnimationType;
  animationDuration: number; // in seconds (e.g., 0.18s to 0.40s)
  exitTransition: boolean; // whether to smoothly shrink/fade before end
}

export interface VideoMetadata {
  name: string;
  size: number;
  duration: number;
  width: number;
  height: number;
}
