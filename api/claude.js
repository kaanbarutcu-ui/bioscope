export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  
  const { model, messages, max_tokens } = req.body;
  
  // Anthropic mesajlarını Gemini formatına çevir
  const parts = [];
  for (const msg of messages) {
    if (Array.isArray(msg.content)) {
      for (const c of msg.content) {
        if (c.type === "text") parts.push({ text: c.text });
        if (c.type === "document") {
          parts.push({ text: "Bu bir kan tahlili PDF dosyasıdır. İçeriğini analiz et." });
          parts.push({ inline_data: { mime_type: "application/pdf", data: c.source.data } });
        }
      }
    } else {
      parts.push({ text: msg.content });
    }
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts }] })
    }
  );

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  
  // Anthropic formatında döndür
  res.status(200).json({
    content: [{ type: "text", text }]
  });
}