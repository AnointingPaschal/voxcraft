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
          speed,
          format = 'mp3',
          referenceAudioDataUrl,
          referenceTranscript,
        } = data;

        if (!text?.trim()) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Please enter a script to synthesize.' }));
        }

        // Use ONLY the user's script as the spoken input — never prepend bracket instructions
        // (the model reads them aloud literally). Style/accent go in the instructions field.
        const spokenText = text.trim();

        const payload: Record<string, unknown> = {
          model: 'fish-audio/s2.1-pro-free:free',
          input: spokenText,
          response_format: format,
        };

        // Pass style/accent as a separate instructions hint (not spoken)
        if (accentInstruction?.trim()) {
          payload.instructions = accentInstruction.trim();
        }

        // Pass speech speed as an API-level parameter (0.5–2.0; default 1.0)
        if (typeof speed === 'number' && speed !== 1.0) {
          payload.speed = Math.max(0.5, Math.min(2.0, speed));
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

        console.log(`[VoxCraft] Rendering | clone=${!!referenceAudioDataUrl} | speed=${speed ?? 1.0} | format=${format} | instructions=${!!(accentInstruction?.trim())}`);

        let upstream = await callUpstreamTTS(payload);

        if (!upstream.ok) {
          const firstErr = await upstream.text();
          console.error(`[VoxCraft] Attempt 1 failed (HTTP ${upstream.status}):`, firstErr);

          await new Promise((r) => setTimeout(r, 1200));
          // Fallback: drop instructions but keep speed + clone refs
          const fallback: Record<string, unknown> = {
            model: 'fish-audio/s2.1-pro-free:free',
            input: spokenText,
          };
          if (payload.speed) fallback.speed = payload.speed;
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

        const arrayBuffer = await upstream.arrayBuffer();
        const audioBuffer = Buffer.from(arrayBuffer);
        const mimeTypes: Record<string, string> = {
          mp3: 'audio/mpeg',
          wav: 'audio/wav',
        };

        console.log(`[VoxCraft] Success — sent ${audioBuffer.length} bytes.`);

        res.writeHead(200, {
          'Content-Type': mimeTypes[format] ?? 'audio/mpeg',
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
