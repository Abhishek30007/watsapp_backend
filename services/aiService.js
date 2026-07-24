const { GoogleGenerativeAI } = require('@google/generative-ai');

const TONES = {
  Emotional:    'Write it in a heartfelt, warm, and deeply emotional tone. Make it feel personal and touching.',
  Funny:        'Write it in a light-hearted, funny, and witty tone. Include a clever pun or a gentle joke.',
  Professional: 'Write it in a polished, professional, and respectful tone suitable for a workplace or formal context.',
  Short:        'Write it as a very short, punchy, and memorable message — maximum 2 sentences.',
};

/**
 * Generate a personalized AI wish using the Gemini API.
 * @param {string} name         - Recipient's first name.
 * @param {string} eventType    - e.g. Birthday, Anniversary, Graduation.
 * @param {string} relationship - e.g. Best Friend, Parent, Partner, Professional.
 * @param {string} tone         - Emotional | Funny | Professional | Short.
 * @returns {Promise<string>}   - Generated greeting text.
 */
async function generateWish(name, eventType, relationship, tone = 'Emotional') {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set in .env. Please add it to enable AI wishes.');
  }

  const toneInstruction = TONES[tone] || TONES['Emotional'];

  const prompt = `You are CelebrateMate, an expert at writing personalized celebration messages.
Write a unique, genuine greeting message for someone named "${name}" on their ${eventType}.
Their relationship to the sender is: ${relationship}.
${toneInstruction}
Rules:
- Do NOT include salutations like "Dear" or sign-offs like "Sincerely".
- Do NOT use placeholder brackets like [Your Name].
- Write 2-4 sentences max (unless tone is Short — then 1-2).
- Output ONLY the message text. No explanation, no labels.`;

  // Pass apiVersion:'v1' — the SDK defaults to v1beta which rejects these models.
  // Models available on v1: gemini-2.5-flash, gemini-2.0-flash, gemini-3.5-flash etc.
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel(
    { model: 'gemini-2.5-flash' },
    { apiVersion: 'v1' }
  );

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  console.log(`[AI Service] Generated ${tone} wish for "${name}" (${eventType})`);
  return text;
}

module.exports = { generateWish, TONES };
