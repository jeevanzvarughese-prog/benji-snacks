const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const sessionId = req.query.session_id;
  if (!sessionId) {
    res.status(400).json({ error: "Missing session_id" });
    return;
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    res.status(200).json({
      paid: session.payment_status === "paid",
      metadata: session.metadata || {},
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
