/* ============================================================
   CFO-INTERVIEW — Vercel Serverless Function
   ------------------------------------------------------------
   Backend for the "Practice with the CFO" mock interview
   feature. Plays a tough-but-fair school CFO character,
   asking the student real financial/oversight questions
   about Benji Snacks and reacting to their answers.

   Uses the same GEMINI_API_KEY environment variable already
   set up for the Prep Room / ask-agent features.

   Each call sends the whole conversation so far, so Gemini
   generates a genuinely new question or follow-up every time
   instead of picking from a fixed list — that's what gives
   this "infinite questions" instead of a script.
   ============================================================ */

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { history } = req.body || {};
  if (!Array.isArray(history)) {
    res.status(400).json({ error: "Missing conversation history" });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not set in this Vercel project's environment variables.");
    res.status(500).json({ error: "AI service isn't configured yet." });
    return;
  }

  const systemInstruction = `You are roleplaying as a school's Chief Financial Officer, in a mock interview to help a middle schooler prepare for a real meeting about a student-run snack business called Benji Snacks. This is practice, not the real meeting.

About Benji Snacks, for your own context: it's a real student-run snack shop at their school. It takes payments via Stripe (card), Venmo, Zelle, cash, and a QR-based checkout. All profits are routed through Student Council rather than to the students personally, per the terms the school originally approved it under. It uses Firebase for its backend and is actively working on tightening account security. Every item sold is a factory-sealed, pre-packaged product — nothing is cooked or prepared on-site.

Your job:
- Ask one tough, realistic CFO-style question at a time — financial sustainability, payment/data security, food safety and liability, financial oversight and accountability, growth and scaling, what happens if something goes wrong, conflicts of interest, record-keeping, etc.
- Never repeat a question you've already asked in this conversation. Draw from a wide range of angles so it feels like an endless, varied set of questions, not a fixed script.
- After the student answers, react realistically in character: if the answer is solid, acknowledge it briefly and move to a new question (possibly a harder one). If the answer is weak, vague, or dodges the question, push back with a pointed follow-up on that same topic before moving on — a real CFO wouldn't just let a weak answer slide.
- Keep your tone professional, direct, and a little skeptical — not hostile or mean, but not a pushover either. This is meant to be genuinely useful practice, not a pep talk.
- Keep each response short: 1-3 sentences, like real spoken conversation, not an essay.
- Never break character or mention you are an AI.
- If this is the very first message (empty history), open with a professional greeting and your first question.`;

  try {
    const contents = history.map(turn => ({
      role: turn.role === "cfo" ? "model" : "user",
      parts: [{ text: turn.text }]
    }));
    if (contents.length === 0) {
      contents.push({ role: "user", parts: [{ text: "(The interview is starting. Please greet me and ask your first question.)" }] });
    }

    const geminiResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents,
          generationConfig: { maxOutputTokens: 250 }
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
    console.error("cfo-interview error:", err);
    res.status(500).json({ error: "Something went wrong reaching the AI service." });
  }
};
