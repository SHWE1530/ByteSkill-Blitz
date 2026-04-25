import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", system: "Smart Resource Allocation" });
  });

  // AI-powered volunteer matching endpoint
  app.post("/api/matching/rank", async (req, res) => {
    const { need, volunteers } = req.body;

    if (!need || !volunteers || !Array.isArray(volunteers)) {
      return res.status(400).json({ error: "Invalid need or volunteers list" });
    }

    try {
      const { GoogleGenAI, Type } = await import("@google/genai");
      const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
      const availableVolunteers = (volunteers || []).filter((v: any) => v.availability);

      if (availableVolunteers.length === 0) {
        return res.json({ matches: [], reason: "No available volunteers found." });
      }

      const prompt = `
        You are an expert coordinator for a community aid platform. 
        Your task is to rank the top 3 volunteers for a specific need based on:
        1. Skill Match: How relevant are their skills to the "need" category and description.
        2. Location: Proximity to the need's location.
        3. Experience: Seniority or expertise levels.

        NEED:
        - Title: ${need.title}
        - Category: ${need.category}
        - Description: ${need.description}
        - Location: ${need.location}
        - Urgency: ${need.urgency}

        VOLUNTEERS:
        ${availableVolunteers.map((v: any) => `- ID: ${v.uid}, Name: ${v.name}, Skills: ${v.skills.join(", ")}, Location: ${v.location}, Experience: ${v.experienceLevel}`).join("\n")}

        Return the UIDs of the top 3 volunteers in order of best match, with a short one-sentence reasoning for each.
      `;

      const aiResponse = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              matches: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    uid: { type: Type.STRING },
                    reason: { type: Type.STRING }
                  },
                  required: ["uid", "reason"]
                }
              }
            },
            required: ["matches"]
          }
        }
      });

      const resultText = aiResponse.text;
      const result = JSON.parse(resultText);
      
      // Enrich AI selection with full volunteer objects
      const finalMatches = result.matches.map((m: any) => {
        const fullProfile = availableVolunteers.find((v: any) => v.uid === m.uid);
        return { ...fullProfile, matchReason: m.reason };
      }).filter(Boolean);

      res.json({ matches: finalMatches });
    } catch (error: any) {
      console.error("AI Matching failed:", error?.message || error);
      res.status(500).json({ error: "Internal server error during matching" });
    }
  });

  // Example match endpoint (for backend logic demonstration)
  app.post("/api/matching/analyze", (req, res) => {
    const { need, volunteers } = req.body;
    // Implementation of a server-side scoring check
    const matches = volunteers.filter((v: any) => 
      v.skills.some((s: string) => need.category.includes(s)) || 
      v.location === need.location
    ).slice(0, 3);
    
    res.json({ matches });
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
