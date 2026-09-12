/* ============================================================
   PREP-ADVICE — Vercel Serverless Function
   ------------------------------------------------------------
   Backend piece for The Prep Room feature in the Benji Snacks
   owner dashboard. Runs on Vercel (not in the browser), takes
   a description of a tricky situation, calls Google's Gemini
   API, and sends back prep advice.

   Uses the same GEMINI_API_KEY environment variable already
   set up on this Vercel project for the ask-agent feature —
   no new setup needed if that's already configured.
   ============================================================ */

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { situation } = req.body || {};
  if (!situation || typeof situation !== "string" || !situation.trim()) {
    res.status(400).json({ error: "Missing situation" });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not set in this Vercel project's environment variables.");
    res.status(500).json({ error: "AI service isn't configured yet." });
    return;
  }

  const systemInstruction = `You are helping a middle schooler prepare for a real, potentially tense conversation about their student-run snack business, Benji Snacks. Given the problem they describe, give them straightforward, practical prep advice: the key points they should make, what the other person will likely say back, and how to respond to that. Keep it concise and organized — short sections or a short list, not a long essay. This is genuine, real-world advice for a kid, not a game.`;

  try {
    const geminiResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents: [{ role: "user", parts: [{ text: situation }] }],
          generationConfig: { maxOutputTokens: 600 }
        })
      }
    );

    if (!geminiResp.ok) {
      const errText = await geminiResp.text();
      console.error("Gemini API error:", geminiResp.status, errText);
      res.status(502).json({ error: "The AI service didn't respond — try again in a moment." });
      return;
    }

    const data = await geminiResp.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      console.error("Unexpected Gemini response shape:", JSON.stringify(data));
      res.status(502).json({ error: "Got an unexpected response from the AI service." });
      return;
    }

    res.status(200).json({ text: text.trim() });
  } catch (err) {
    console.error("prep-advice error:", err);
    res.status(500).json({ error: "Something went wrong reaching the AI service." });
  }
};
