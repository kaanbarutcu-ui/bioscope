export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  
  const { messages, max_tokens } = req.body;
  
  const parts = [];
  for (const msg of messages) {
    if (Array.isArray(msg.content)) {
      for (const c of msg.content) {
        if (c.type === "text") {
          parts.push({ text: c.text });
        }
        if (c.type === "document") {
          parts.push({ 
            inline_data: { 
              mime_type: "application/pdf", 
              data: c.source.data 
            } 
          });
        }
      }
    } else if (typeof msg.content === "string") {
      parts.push({ text: msg.content });
    }
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          contents: [{ parts }],
          generationConfig: { maxOutputTokens: max_tokens || 1000 }
        })
      }
    );

    const data = await response.json();
    
    if (!response.ok) {
      return res.status(500).json({ 
        content: [{ type: "text", text: JSON.stringify(data) }] 
      });
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    res.status(200).json({ content: [{ type: "text", text }] });
    
  } catch(e) {
    res.status(500).json({ content: [{ type: "text", text: e.message }] });
  }
}