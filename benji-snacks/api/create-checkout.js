const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { items, buyerName, orderId, successUrl, cancelUrl } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "No items provided" });
      return;
    }

    const line_items = items.map((it) => ({
      price_data: {
        currency: "usd",
        product_data: { name: it.name },
        unit_amount: Math.round(it.price * 100), // Stripe wants cents
      },
      quantity: it.qty,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items,
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        orderId: orderId || "",
        buyerName: buyerName || "",
      },
    });

    res.status(200).json({ url: session.url, id: session.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
