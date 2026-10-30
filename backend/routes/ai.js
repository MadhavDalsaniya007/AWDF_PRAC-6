const express = require('express');
const router = express.Router();
const OpenAI = require('openai');

// Simple in-memory rate limiting map: ipOrUser -> timestamp of last request
const requestLog = new Map();
const RATE_LIMIT_WINDOW_MS = 5000; // 5 seconds between consecutive requests per client

/**
 * Middleware: Simple client rate limiter to protect external AI API quota
 */
function rateLimiter(req, res, next) {
  const clientKey = req.headers['x-forwarded-for'] || req.ip || 'anonymous-client';
  const now = Date.now();
  const lastRequestTime = requestLog.get(clientKey);

  if (lastRequestTime && now - lastRequestTime < RATE_LIMIT_WINDOW_MS) {
    const waitSeconds = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - lastRequestTime)) / 1000);
    return res.status(429).json({
      fallback: true,
      description: '',
      message: `Rate limit reached. Please wait ${waitSeconds}s before generating another AI description.`,
      retryAfter: waitSeconds,
    });
  }

  requestLog.set(clientKey, now);

  // Periodic cleanup of stale rate-limit keys
  if (requestLog.size > 1000) {
    for (const [key, timestamp] of requestLog.entries()) {
      if (now - timestamp > RATE_LIMIT_WINDOW_MS * 2) {
        requestLog.delete(key);
      }
    }
  }

  next();
}

/**
 * Generate heuristic fallback description when external AI service is unreachable or unconfigured
 */
function generateFallbackDescription(title) {
  const cleaned = title.trim();
  const lower = cleaned.toLowerCase();

  if (lower.includes('bug') || lower.includes('fix') || lower.includes('issue')) {
    return `Investigate, identify root cause, and verify fix for: ${cleaned}.`;
  }
  if (lower.includes('test') || lower.includes('ci') || lower.includes('pipeline')) {
    return `Execute test suites and verify automated validation for: ${cleaned}.`;
  }
  if (lower.includes('doc') || lower.includes('readme') || lower.includes('guide')) {
    return `Draft and review documentation covering implementation and instructions for: ${cleaned}.`;
  }
  if (lower.includes('deploy') || lower.includes('release')) {
    return `Prepare deployment artifacts, verify configuration, and deploy: ${cleaned}.`;
  }
  return `Review requirements, prepare deliverables, and track completion for: ${cleaned}.`;
}

/**
 * Helper: Call Google Gemini API using native fetch
 */
async function callGemini(apiKey, title) {
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const prompt = `Write a concise, professional 1-sentence or 2-sentence task description for a task titled "${title}". Do not include conversational filler, greeting, or quotation marks.`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const candidate = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidate) {
      throw new Error('Gemini response format unrecognized or empty');
    }

    return candidate.trim();
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Helper: Call OpenAI API using official SDK
 */
async function callOpenAI(apiKey, title) {
  const client = new OpenAI({ apiKey, timeout: 10000 });
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const completion = await client.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content:
          'You are an assistant for a task management app. Generate concise, actionable, 1-to-2 sentence task descriptions based on the task title provided. Do not include markdown headers, quotes, or conversational filler.',
      },
      {
        role: 'user',
        content: `Write a short task description for: ${title}`,
      },
    ],
    max_tokens: 120,
    temperature: 0.7,
  });

  return completion.choices[0]?.message?.content?.trim() || '';
}

const aiService = {
  callOpenAI,
  callGemini,
  generateFallbackDescription,
};

/**
 * POST /api/ai/generate-description
 * Body: { title: string }
 *
 * Securely calls external AI service server-side.
 * Gracefully degrades if external service fails, returns fallback without crashing.
 */
router.post('/generate-description', rateLimiter, async (req, res) => {
  const { title } = req.body || {};

  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({
      error: 'Invalid request',
      message: 'Task title is required to generate a description.',
    });
  }

  const trimmedTitle = title.trim();
  const openAiKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  try {
    // 1. Try OpenAI if API key configured (and not dummy placeholder)
    if (openAiKey && openAiKey !== 'your_key_here' && !openAiKey.startsWith('mock-')) {
      const description = await aiService.callOpenAI(openAiKey, trimmedTitle);
      return res.status(200).json({
        description,
        fallback: false,
        provider: 'openai',
      });
    }

    // 2. Try Gemini if API key configured
    if (geminiKey && geminiKey !== 'your_key_here' && !geminiKey.startsWith('mock-')) {
      const description = await aiService.callGemini(geminiKey, trimmedTitle);
      return res.status(200).json({
        description,
        fallback: false,
        provider: 'gemini',
      });
    }

    // If no valid AI API key is configured, invoke graceful degradation
    console.warn('[AI Service] No valid OPENAI_API_KEY or GEMINI_API_KEY found in .env. Using fallback generation.');
    const fallbackDescription = aiService.generateFallbackDescription(trimmedTitle);
    return res.status(200).json({
      description: fallbackDescription,
      fallback: true,
      provider: 'fallback',
      message: 'AI API key not configured or set to placeholder. Fallback description provided.',
    });
  } catch (err) {
    // 3. Graceful degradation: Never crash the application on AI failure
    console.error(`[AI Service Error] ${err.name}: ${err.message}`);
    const fallbackDescription = aiService.generateFallbackDescription(trimmedTitle);
    return res.status(200).json({
      description: fallbackDescription,
      fallback: true,
      provider: 'fallback',
      message: 'AI service unavailable or encountered an error. Fallback description provided.',
      error: err.message,
    });
  }
});

/**
 * GET /api/ai/status
 * Healthcheck route for AI service configuration
 */
router.get('/status', (req, res) => {
  const hasOpenAI = Boolean(
    process.env.OPENAI_API_KEY &&
    process.env.OPENAI_API_KEY !== 'your_key_here' &&
    !process.env.OPENAI_API_KEY.startsWith('mock-')
  );
  const hasGemini = Boolean(
    process.env.GEMINI_API_KEY &&
    process.env.GEMINI_API_KEY !== 'your_key_here' &&
    !process.env.GEMINI_API_KEY.startsWith('mock-')
  );

  res.status(200).json({
    configured: hasOpenAI || hasGemini,
    provider: hasOpenAI ? 'openai' : hasGemini ? 'gemini' : 'none (fallback mode active)',
    rateLimitWindowSeconds: RATE_LIMIT_WINDOW_MS / 1000,
  });
});

router.aiService = aiService;
module.exports = router;
