import http from 'node:http';

const PORT = 3001;
const SECRET_KEY = process.env.OPENROUTER_API_KEY ?? '';

async function callUpstreamTTS(payload: Record<string, unknown>) {
  return fetch('https://openrouter.ai/api/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SECRET_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
      'X-OpenRouter-Title': 'VoxCraft Studio',
    },
    body: JSON.stringify(payload),
  });
}

// ── WAV speed-change via WSOLA (Waveform Similarity Overlap-Add) ───────────────
// Parses a WAV buffer, applies time-stretch at the given rate (0.5 = half speed,
// 2.0 = double speed) while preserving pitch, and returns a new WAV buffer.
function parseWavHeader(buf: Buffer): {
  sampleRate: number; numChannels: number; bitsPerSample: number;
  dataOffset: number; dataLength: number;
} | null {
  if (buf.length < 44) return null;
  if (buf.toString('ascii', 0, 4) !== 'RIFF') return null;
  if (buf.toString('ascii', 8, 12) !== 'WAVE') return null;
  // find 'data' chunk
  let offset = 12;
  let dataOffset = -1;
  let dataLength = 0;
  const numChannels = buf.readUInt16LE(22);
  const sampleRate = buf.readUInt32LE(24);
  const bitsPerSample = buf.readUInt16LE(34);
  while (offset + 8 <= buf.length) {
    const id = buf.toString('ascii', offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    if (id === 'data') { dataOffset = offset + 8; dataLength = size; break; }
    offset += 8 + size;
  }
  if (dataOffset < 0) return null;
  return { sampleRate, numChannels, bitsPerSample, dataOffset, dataLength };
}

function buildWavHeader(
  sampleRate: number, numChannels: number, bitsPerSample: number, dataLength: number
): Buffer {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(36 + dataLength, 4);
  header.write('WAVE', 8, 'ascii');
  header.write('fmt ', 12, 'ascii');
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);  // PCM
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28);
  header.writeUInt16LE(numChannels * (bitsPerSample / 8), 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36, 'ascii');
  header.writeUInt32LE(dataLength, 40);
  return header;
}

function wsolaStretch(buf: Buffer, rate: number): Buffer {
  const hdr = parseWavHeader(buf);
  if (!hdr || hdr.bitsPerSample !== 16) {
    // Can't process — return original unchanged
    return buf;
  }
  const { sampleRate, numChannels, bitsPerSample, dataOffset, dataLength } = hdr;
  const bytesPerSample = bitsPerSample / 8;
  const frameSize = numChannels * bytesPerSample;
  const totalFrames = Math.floor(dataLength / frameSize);

  // Read all frames as 32-bit float per channel
  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) channels.push(new Float32Array(totalFrames));
  for (let i = 0; i < totalFrames; i++) {
    for (let c = 0; c < numChannels; c++) {
      const pos = dataOffset + i * frameSize + c * bytesPerSample;
      channels[c][i] = buf.readInt16LE(pos) / 32768.0;
    }
  }

  // WSOLA parameters — window and hop sizes
  const windowSize = Math.round(sampleRate * 0.025);   // 25ms analysis window
  const synthesisHop = Math.round(windowSize / 2);      // 50% overlap
  const analysisHop = Math.round(synthesisHop * rate);  // scaled by rate

  const outFrames = Math.ceil(totalFrames / rate) + windowSize;
  const outChannels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) outChannels.push(new Float32Array(outFrames));
  const norm = new Float32Array(outFrames);

  // Hann window
  const win = new Float32Array(windowSize);
  for (let i = 0; i < windowSize; i++) win[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (windowSize - 1)));

  let outPos = 0;
  let inPos = 0;

  while (inPos + windowSize <= totalFrames) {
    // For each channel: copy windowed frame into output at outPos with OLA
    for (let c = 0; c < numChannels; c++) {
      const src = channels[c];
      const dst = outChannels[c];
      for (let i = 0; i < windowSize; i++) {
        const oi = outPos + i;
        if (oi < outFrames) {
          dst[oi] += src[inPos + i] * win[i];
          if (c === 0) norm[oi] += win[i];
        }
      }
    }
    outPos += synthesisHop;
    inPos += analysisHop;
  }

  // Normalize by the window envelope
  const outLen = Math.min(outPos + windowSize, outFrames);
  for (let c = 0; c < numChannels; c++) {
    for (let i = 0; i < outLen; i++) {
      if (norm[i] > 0.0001) outChannels[c][i] /= norm[i];
    }
  }

  // Convert back to 16-bit PCM
  const dataOut = Buffer.alloc(outLen * frameSize);
  for (let i = 0; i < outLen; i++) {
    for (let c = 0; c < numChannels; c++) {
      const s = Math.max(-1, Math.min(1, outChannels[c][i]));
      const v = Math.round(s * 32767);
      dataOut.writeInt16LE(v, i * frameSize + c * bytesPerSample);
    }
  }
  const header = buildWavHeader(sampleRate, numChannels, bitsPerSample, dataOut.length);
  return Buffer.concat([header, dataOut]);
}

// ── Main server ────────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (
    req.method === 'POST' &&
    (req.url === '/synthesize' || req.url === '/tts')
  ) {
    let body = '';
    let tooLarge = false;

    req.on('data', (chunk: Buffer) => {
      body += chunk.toString();
      if (body.length > 25 * 1024 * 1024) {
        tooLarge = true;
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Reference audio file exceeds the 15 MB limit.' }));
        req.destroy();
      }
    });

    req.on('end', async () => {
      if (tooLarge) return;
      try {
        const data = JSON.parse(body) as {
          text?: string;
          accentInstruction?: string;
          speed?: number;
          gender?: string;
          format?: string;
          referenceAudioDataUrl?: string;
          referenceTranscript?: string;
        };

        const {
          text,
          accentInstruction,
          speed = 1.0,
          format = 'mp3',
          referenceAudioDataUrl,
          referenceTranscript,
        } = data;

        if (!text?.trim()) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Please enter a script to synthesize.' }));
        }

        const spokenText = text.trim();
        const clampedSpeed = Math.max(0.5, Math.min(2.0, speed));
        const applySpeedPostProcess = Math.abs(clampedSpeed - 1.0) > 0.04;

        // Always request WAV when we need to post-process speed (WAV = raw PCM, easy to process)
        const upstreamFormat = applySpeedPostProcess ? 'wav' : format;

        const payload: Record<string, unknown> = {
          model: 'fish-audio/s2.1-pro-free:free',
          input: spokenText,
          response_format: upstreamFormat,
          voice: 'default',
        };

        // Style/accent go in the instructions field (not spoken aloud)
        if (accentInstruction?.trim()) {
          payload.instructions = accentInstruction.trim();
        }

        if (referenceAudioDataUrl) {
          const refs: unknown[] = [
            { type: 'input_audio', input_audio: { data: referenceAudioDataUrl } },
          ];
          if (referenceTranscript?.trim()) {
            refs.push({ type: 'text', text: referenceTranscript.trim() });
          }
          payload.input_references = refs;
        }

        console.log(`[VoxCraft] Rendering | clone=${!!referenceAudioDataUrl} | speed=${clampedSpeed} | postProcess=${applySpeedPostProcess} | format=${format}`);

        let upstream = await callUpstreamTTS(payload);

        if (!upstream.ok) {
          const firstErr = await upstream.text();
          console.error(`[VoxCraft] Attempt 1 failed (HTTP ${upstream.status}):`, firstErr);

          await new Promise((r) => setTimeout(r, 1200));
          const fallback: Record<string, unknown> = {
            model: 'fish-audio/s2.1-pro-free:free',
            input: spokenText,
            response_format: upstreamFormat,
          };
          if (payload.input_references) fallback.input_references = payload.input_references;

          upstream = await callUpstreamTTS(fallback);

          if (!upstream.ok) {
            const secondErr = await upstream.text();
            console.error(`[VoxCraft] Attempt 2 failed (HTTP ${upstream.status}):`, secondErr);

            let friendlyError =
              'Voice synthesis engine is momentarily busy. Please wait 5 seconds and try again.';
            if (upstream.status === 429)
              friendlyError =
                'High studio traffic — rate limit reached. Please wait 10–15 seconds and try again.';
            else if ([401, 402, 403].includes(upstream.status))
              friendlyError =
                'Studio authentication or quota limit reached. Please check your account configuration.';

            res.writeHead(upstream.status, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: friendlyError }));
          }
        }

        let audioBuffer = Buffer.from(await upstream.arrayBuffer());

        // Post-process speed using WSOLA time-stretching on the raw WAV PCM
        if (applySpeedPostProcess) {
          try {
            console.log(`[VoxCraft] Applying WSOLA speed stretch: ${clampedSpeed}x on ${audioBuffer.length} bytes WAV`);
            audioBuffer = wsolaStretch(audioBuffer, clampedSpeed);
            console.log(`[VoxCraft] WSOLA done: output ${audioBuffer.length} bytes`);
          } catch (e) {
            console.error('[VoxCraft] WSOLA failed, returning original audio:', e);
            // Fall through with original audio rather than erroring
          }
        }

        const mimeTypes: Record<string, string> = {
          mp3: 'audio/mpeg',
          wav: 'audio/wav',
        };

        // After WSOLA the output is always WAV; if user requested MP3 we serve WAV
        // (acceptable — browsers play WAV natively; ffmpeg would be needed for re-encode)
        const responseFormat = applySpeedPostProcess ? 'wav' : format;

        console.log(`[VoxCraft] Success — sent ${audioBuffer.length} bytes (${responseFormat}).`);

        res.writeHead(200, {
          'Content-Type': mimeTypes[responseFormat] ?? 'audio/wav',
          'Content-Length': audioBuffer.length,
          'Cache-Control': 'no-store',
        });
        res.end(audioBuffer);
      } catch (err) {
        console.error('[VoxCraft] Exception:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unable to process audio request right now. Please try again.' }));
      }
    });
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found.' }));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[VoxCraft] Backend listening on http://127.0.0.1:${PORT}`);
});
