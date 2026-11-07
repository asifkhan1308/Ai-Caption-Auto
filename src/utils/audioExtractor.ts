/**
 * Client-Side Audio Extraction & WAV Downsampling Utility
 * Decodes video files and outputs a compact 16kHz Mono 16-bit PCM WAV.
 */

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function floatTo16BitPCM(output: DataView, offset: number, input: Float32Array) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
}

function interleave(inputL: Float32Array, inputR: Float32Array): Float32Array {
  const length = inputL.length + inputR.length;
  const result = new Float32Array(length);
  let index = 0;
  let inputIndex = 0;

  while (index < length) {
    result[index++] = inputL[inputIndex];
    result[index++] = inputR[inputIndex];
    inputIndex++;
  }
  return result;
}

/**
 * Encodes an AudioBuffer to a standard WAV ArrayBuffer
 */
export function bufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const numOfChan = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  let result: Float32Array;
  if (numOfChan === 2) {
    result = interleave(buffer.getChannelData(0), buffer.getChannelData(1));
  } else {
    result = buffer.getChannelData(0);
  }
  
  const bufferLen = result.length * 2;
  const wavBuffer = new ArrayBuffer(44 + bufferLen);
  const view = new DataView(wavBuffer);
  
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + bufferLen, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numOfChan, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numOfChan * (bitDepth / 8), true);
  view.setUint16(32, numOfChan * (bitDepth / 8), true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, "data");
  view.setUint32(40, bufferLen, true);
  
  floatTo16BitPCM(view, 44, result);
  
  return wavBuffer;
}

/**
 * Extracts and downsamples the audio from a video/audio File to a 16kHz Mono WAV base64 string
 */
export async function extractWavAudio(
  file: Blob | File,
  onProgress?: (stage: string, progress: number) => void
): Promise<{ base64: string; duration: number }> {
  onProgress?.("Reading file data...", 10);
  
  const fileArrayBuffer = await file.arrayBuffer();
  
  onProgress?.("Decoding audio tracks...", 30);
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  const originalCtx = new AudioContextClass();
  
  let decodedBuffer: AudioBuffer;
  try {
    decodedBuffer = await originalCtx.decodeAudioData(fileArrayBuffer);
  } catch (err) {
    console.warn("Standard decode failed, trying offline audio context decoder...", err);
    throw new Error("Could not decode audio from the uploaded video. Please verify that the file is not corrupted and contains a valid audio track.");
  } finally {
    await originalCtx.close();
  }

  const duration = decodedBuffer.duration;
  const targetSampleRate = 16000;
  
  onProgress?.("Resampling audio to 16kHz for AI engine...", 60);
  
  // Use OfflineAudioContext for extremely fast downsampling
  const offlineCtx = new OfflineAudioContext(
    1, // mono
    Math.floor(targetSampleRate * duration),
    targetSampleRate
  );
  
  // Create buffer source
  const bufferSource = offlineCtx.createBufferSource();
  bufferSource.buffer = decodedBuffer;
  bufferSource.connect(offlineCtx.destination);
  bufferSource.start();
  
  const resampledBuffer = await offlineCtx.startRendering();
  
  onProgress?.("Compiling compact WAV container...", 85);
  const wavArrayBuffer = bufferToWav(resampledBuffer);
  
  onProgress?.("Encoding audio payload...", 95);
  // Convert ArrayBuffer to Base64
  const bytes = new Uint8Array(wavArrayBuffer);
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
  }
  const base64 = btoa(binary);
  
  onProgress?.("Audio extraction successful!", 100);
  
  return {
    base64,
    duration,
  };
}
