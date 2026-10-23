/**
 * audioProcessing.ts
 * Web Audio helpers for real-time preview and offline render with speed + pitch.
 *
 * Speed  — implemented via AudioBufferSourceNode.playbackRate (0.5–2.0)
 * Pitch  — implemented via AudioBufferSourceNode.detune in cents
 *           1 semitone = 100 cents, so `semitones * 100`
 *
 * Both controls are decoupled: speed changes duration, detune shifts pitch without
 * changing duration (unlike playbackRate which changes both). Together they let the
 * user choose speed and pitch independently.
 */

/** Decode an audio Blob into an AudioBuffer using a shared AudioContext. */
export async function decodeBlob(blob: Blob): Promise<AudioBuffer> {
  const ctx = new AudioContext()
  const ab = await blob.arrayBuffer()
  const buf = await ctx.decodeAudioData(ab)
  await ctx.close()
  return buf
}

/** Preview state handle returned by startPreview(). */
export interface PreviewHandle {
  stop(): void
}

/**
 * Start real-time preview of `buffer` at the given speed and pitch.
 * Returns a handle whose `stop()` ends playback.
 */
export function startPreview(
  buffer: AudioBuffer,
  speed: number,
  pitchSemitones: number,
  onEnded?: () => void,
): PreviewHandle {
  const ctx = new AudioContext()
  const src = ctx.createBufferSource()
  src.buffer = buffer
  src.playbackRate.value = speed
  src.detune.value = pitchSemitones * 100        // semitones → cents
  src.connect(ctx.destination)
  src.start()
  src.onended = () => {
    void ctx.close()
    onEnded?.()
  }
  return {
    stop() {
      try { src.stop() } catch { /* already stopped */ }
      void ctx.close()
    },
  }
}

/**
 * Offline render: apply speed + pitch to `buffer` and return a new Blob.
 * The rendered audio reflects exactly what the user hears in preview.
 * Speed changes the rendered duration; pitch shifts via detune (independent).
 *
 * Output is always PCM WAV so the download is lossless.
 */
export async function renderAudio(
  buffer: AudioBuffer,
  speed: number,
  pitchSemitones: number,
): Promise<Blob> {
  // Duration of the output changes with speed
  const outDuration = buffer.duration / speed
  const outSamples = Math.ceil(outDuration * buffer.sampleRate)

  const offCtx = new OfflineAudioContext(
    buffer.numberOfChannels,
    outSamples,
    buffer.sampleRate,
  )

  const src = offCtx.createBufferSource()
  src.buffer = buffer
  src.playbackRate.value = speed
  src.detune.value = pitchSemitones * 100
  src.connect(offCtx.destination)
  src.start(0)

  const rendered = await offCtx.startRendering()
  return audioBufferToWav(rendered)
}

/** Encode an AudioBuffer as a PCM WAV Blob. */
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numCh = buffer.numberOfChannels
  const numSamples = buffer.length
  const sampleRate = buffer.sampleRate
  const bytesPerSample = 2 // 16-bit PCM
  const dataLen = numSamples * numCh * bytesPerSample
  const wavLen = 44 + dataLen
  const out = new ArrayBuffer(wavLen)
  const view = new DataView(out)

  // RIFF header
  writeStr(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataLen, true)
  writeStr(view, 8, 'WAVE')
  writeStr(view, 12, 'fmt ')
  view.setUint32(16, 16, true)          // chunk size
  view.setUint16(20, 1, true)           // PCM
  view.setUint16(22, numCh, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * numCh * bytesPerSample, true) // byte rate
  view.setUint16(32, numCh * bytesPerSample, true) // block align
  view.setUint16(34, 16, true)          // bits per sample
  writeStr(view, 36, 'data')
  view.setUint32(40, dataLen, true)

  // Interleave PCM samples
  let offset = 44
  for (let i = 0; i < numSamples; i++) {
    for (let ch = 0; ch < numCh; ch++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]))
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
      offset += 2
    }
  }

  return new Blob([out], { type: 'audio/wav' })
}

function writeStr(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
}

/** Convert a Blob to a base64 data URL. */
export async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
