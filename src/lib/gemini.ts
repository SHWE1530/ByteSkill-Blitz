import { GoogleGenAI, Type } from "@google/genai";
import { Need } from "../types";

let genAI: GoogleGenAI | null = null;

function getGenAI() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in the environment.");
    }
    genAI = new GoogleGenAI({ apiKey });
  }
  return genAI;
}

export async function analyzeNeed(description: string, userCategory?: string) {
  const ai = getGenAI();
  
  const prompt = `
    Analyze the following community need description and provide an structured output.
    If the category is not clear or provided as "Other", extract the most suitable category.
    Predict the urgency level (Low, Medium, High).
    Provide a concise one-sentence summary.
    
    Description: "${description}"
    Current Category: "${userCategory || 'None'}"
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            urgency: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
            summary: { type: Type.STRING },
            timeSensitivity: { type: Type.NUMBER, description: "Scale 1-10" }
          },
          required: ["category", "urgency", "summary", "timeSensitivity"]
        }
      }
    });

    const text = response.text;
    if (!text) {
        throw new Error("Response body is empty or invalid format");
    }

    return JSON.parse(text);
  } catch (error: any) {
    console.error("Gemini analysis failed:", error.message || "Unknown error");
    return {
      category: userCategory || "Community Support",
      urgency: "Medium",
      summary: description.substring(0, 100) + "...",
      timeSensitivity: 5
    };
  }
}

export function calculatePriority(need: Partial<Need>, timeSensitivity: number) {
  const urgencyWeight = 0.4;
  const peopleWeight = 0.4;
  const timeWeight = 0.2;

  const urgencyValues: Record<string, number> = { "Low": 1, "Medium": 5, "High": 10 };
  const urgencyScore = urgencyValues[need.urgency || "Medium"] || 5;
  
  // Normalize people affected (max cap for calculation 1000)
  const peopleScore = Math.min((need.peopleAffected || 1) / 100, 10);
  
  // timeSensitivity is 1-10
  const score = (urgencyWeight * urgencyScore) + (peopleWeight * peopleScore) + (timeWeight * timeSensitivity);
  
  return parseFloat(score.toFixed(2));
}

export async function generateSystemInsights(needs: Need[], reports: any[]) {
  const ai = getGenAI();
  
  const statsSummary = {
    totalNeeds: needs.length,
    highUrgency: needs.filter(n => n.urgency === 'High').length,
    categories: [...new Set(needs.map(n => n.category))],
    recentReports: reports.slice(0, 5).map(r => r.content)
  };

  const prompt = `
    Analysis Report based on current emergency coordination data:
    Active Missions: ${statsSummary.totalNeeds}
    Critical Priorities: ${statsSummary.highUrgency}
    Active Sectors: ${statsSummary.categories.join(', ')}
    Field Intel: ${statsSummary.recentReports.join(' | ')}

    Provide 3 high-level strategic insights for emergency coordinators.
    Focus on resource allocation trends, potential bottlenecks, and sentiment from field reports.
    Keep insights professional, tactical, and concise.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            insights: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  content: { type: Type.STRING },
                  urgency: { type: Type.STRING, enum: ["Advisory", "Action Required", "Critical"] }
                },
                required: ["title", "content", "urgency"]
              }
            },
            overallSentiment: { type: Type.STRING },
            recommendedFocus: { type: Type.STRING }
          },
          required: ["insights", "overallSentiment", "recommendedFocus"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error: any) {
    console.error("Gemini insights failed:", error.message);
    return {
      insights: [
        { title: "Standard Protocol", content: "Continue monitoring established communication channels.", urgency: "Advisory" },
        { title: "Resource Balancing", content: "Review mission distribution across active sectors.", urgency: "Advisory" }
      ],
      overallSentiment: "Stable",
      recommendedFocus: "Routine Operations"
    };
  }
}
