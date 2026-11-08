// Web Audio Context & Buffer Utilities
import { Mp3Encoder } from "@breezystack/lamejs";

let sharedAudioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (typeof window === "undefined") {
    throw new Error("AudioContext can only be initialized in the browser.");
  }
  if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    sharedAudioCtx = new AudioContextClass();
  }
  if (sharedAudioCtx.state === "suspended") {
    sharedAudioCtx.resume();
  }
  return sharedAudioCtx;
}

/**
 * Robustly decodes any audio or video file (MP3, WAV, AAC, MP4, WebM, MOV, OGG, FLAC) into an AudioBuffer.
 * Clones the arrayBuffer to prevent neutering issues.
 */
export async function decodeAudioFile(file: File | Blob): Promise<AudioBuffer> {
  const arrayBuffer = await file.arrayBuffer();
  const ctx = getAudioContext();
  // slice(0) to avoid neutering original buffer
  return await ctx.decodeAudioData(arrayBuffer.slice(0));
}

/**
 * Alias for decodeAudioFile
 */
export const decodeAudioFromFile = decodeAudioFile;

/**
 * Encodes an AudioBuffer into genuine MPEG-1 Layer 3 (MP3) bytes
 */
export function audioBufferToMp3(buffer: AudioBuffer, kbps = 192): Blob {
  const channels = Math.min(buffer.numberOfChannels, 2);
  const sampleRate = buffer.sampleRate;
  const mp3encoder = new Mp3Encoder(channels, sampleRate, kbps);
  const mp3Data: Uint8Array[] = [];

  const sampleBlockSize = 1152;
  const left = buffer.getChannelData(0);
  const right = channels > 1 ? buffer.getChannelData(1) : undefined;

  const numSamples = buffer.length;
  const leftInt16 = new Int16Array(numSamples);
  const rightInt16 = right ? new Int16Array(numSamples) : undefined;

  for (let i = 0; i < numSamples; i++) {
    const sL = Math.max(-1, Math.min(1, left[i]));
    leftInt16[i] = sL < 0 ? sL * 0x8000 : sL * 0x7fff;
    if (right && rightInt16) {
      const sR = Math.max(-1, Math.min(1, right[i]));
      rightInt16[i] = sR < 0 ? sR * 0x8000 : sR * 0x7fff;
    }
  }

  for (let i = 0; i < numSamples; i += sampleBlockSize) {
    const leftChunk = leftInt16.subarray(i, i + sampleBlockSize);
    const rightChunk = rightInt16 ? rightInt16.subarray(i, i + sampleBlockSize) : undefined;
    const mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf);
    }
  }

  const end = mp3encoder.flush();
  if (end.length > 0) {
    mp3Data.push(end);
  }

  return new Blob(mp3Data as BlobPart[], { type: "audio/mp3" });
}

/**
 * Encodes an AudioBuffer into 16-bit PCM WAV
 */
export function audioBufferToWav(buffer: AudioBuffer, opt?: { float32?: boolean }): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = opt?.float32 ? 3 : 1;
  const bitDepth = format === 3 ? 32 : 16;

  let result: Float32Array;
  if (numChannels === 2) {
    result = interleave(buffer.getChannelData(0), buffer.getChannelData(1));
  } else {
    result = buffer.getChannelData(0);
  }

  return encodeWAV(result, format, sampleRate, numChannels, bitDepth);
}

/**
 * Universal export function returning either genuine MP3 or genuine WAV based on format choice
 */
export function exportAudioBlob(buffer: AudioBuffer, format: string, kbps = 192): Blob {
  const cleanFmt = format.toLowerCase().trim();
  if (cleanFmt === "mp3") {
    return audioBufferToMp3(buffer, kbps);
  }
  // Default to WAV for lossless or uncompressed
  return audioBufferToWav(buffer);
}

/**
 * Slices an AudioBuffer from startSeconds to endSeconds
 */
export function sliceAudioBuffer(
  buffer: AudioBuffer,
  startSeconds: number,
  endSeconds: number
): AudioBuffer {
  const ctx = getAudioContext();
  const sampleRate = buffer.sampleRate;
  const numChannels = buffer.numberOfChannels;

  const startSample = Math.max(0, Math.floor(startSeconds * sampleRate));
  const endSample = Math.min(buffer.length, Math.floor(endSeconds * sampleRate));
  const frameCount = Math.max(1, endSample - startSample);

  const sliced = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let c = 0; c < numChannels; c++) {
    const src = buffer.getChannelData(c).subarray(startSample, endSample);
    sliced.copyToChannel(src, c, 0);
  }
  return sliced;
}

/**
 * Adjusts volume of an AudioBuffer by gain (e.g., 1.0 = 100%, 1.5 = 150%)
 */
export function adjustBufferVolume(buffer: AudioBuffer, gain: number): AudioBuffer {
  const ctx = getAudioContext();
  const sampleRate = buffer.sampleRate;
  const numChannels = buffer.numberOfChannels;
  const result = ctx.createBuffer(numChannels, buffer.length, sampleRate);

  for (let c = 0; c < numChannels; c++) {
    const src = buffer.getChannelData(c);
    const dest = result.getChannelData(c);
    for (let i = 0; i < src.length; i++) {
      dest[i] = Math.max(-1, Math.min(1, src[i] * gain));
    }
  }
  return result;
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

function encodeWAV(
  samples: Float32Array,
  format: number,
  sampleRate: number,
  numChannels: number,
  bitDepth: number
): Blob {
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample);
  const view = new DataView(buffer);

  /* RIFF identifier */
  writeString(view, 0, "RIFF");
  /* RIFF chunk length */
  view.setUint32(4, 36 + samples.length * bytesPerSample, true);
  /* RIFF type */
  writeString(view, 8, "WAVE");
  /* format chunk identifier */
  writeString(view, 12, "fmt ");
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw) */
  view.setUint16(20, format, true);
  /* channel count */
  view.setUint16(22, numChannels, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * blockAlign, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, blockAlign, true);
  /* bits per sample */
  view.setUint16(34, bitDepth, true);
  /* data chunk identifier */
  writeString(view, 36, "data");
  /* data chunk length */
  view.setUint32(40, samples.length * bytesPerSample, true);

  if (format === 1) {
    floatTo16BitPCM(view, 44, samples);
  } else {
    writeFloat32(view, 44, samples);
  }

  return new Blob([view], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function floatTo16BitPCM(output: DataView, offset: number, input: Float32Array) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
}

function writeFloat32(output: DataView, offset: number, input: Float32Array) {
  for (let i = 0; i < input.length; i++, offset += 4) {
    output.setFloat32(offset, input[i], true);
  }
}

export function generateSilenceBuffer(durationSeconds: number, sampleRate = 44100): AudioBuffer {
  const ctx = getAudioContext();
  const buffer = ctx.createBuffer(2, sampleRate * durationSeconds, sampleRate);
  return buffer;
}

/**
 * Changes playback speed / tempo of an AudioBuffer using linear interpolation
 */
export function changeBufferSpeed(sourceBuf: AudioBuffer, speed: number): AudioBuffer {
  if (speed === 1.0) return sourceBuf;
  const ctx = getAudioContext();
  const numChannels = sourceBuf.numberOfChannels;
  const oldLength = sourceBuf.length;
  const newLength = Math.max(1, Math.floor(oldLength / speed));
  const newBuf = ctx.createBuffer(numChannels, newLength, sourceBuf.sampleRate);

  for (let c = 0; c < numChannels; c++) {
    const srcData = sourceBuf.getChannelData(c);
    const destData = newBuf.getChannelData(c);
    for (let i = 0; i < newLength; i++) {
      const srcIndex = i * speed;
      const index0 = Math.floor(srcIndex);
      const index1 = Math.min(oldLength - 1, index0 + 1);
      const frac = srcIndex - index0;
      destData[i] = srcData[index0] * (1 - frac) + srcData[index1] * frac;
    }
  }
  return newBuf;
}

/**
 * Concatenates multiple AudioBuffers end-to-end
 */
export function mergeAudioBuffers(buffers: AudioBuffer[]): AudioBuffer {
  if (buffers.length === 0) return generateSilenceBuffer(10);
  if (buffers.length === 1) return buffers[0];

  const ctx = getAudioContext();
  const sampleRate = buffers[0].sampleRate;
  const numChannels = Math.max(...buffers.map((b) => b.numberOfChannels));
  const totalLength = buffers.reduce((sum, b) => sum + b.length, 0);

  const merged = ctx.createBuffer(numChannels, totalLength, sampleRate);

  let currentOffset = 0;
  for (const buf of buffers) {
    for (let c = 0; c < numChannels; c++) {
      const src = buf.getChannelData(Math.min(c, buf.numberOfChannels - 1));
      merged.copyToChannel(src, c, currentOffset);
    }
    currentOffset += buf.length;
  }
  return merged;
}

