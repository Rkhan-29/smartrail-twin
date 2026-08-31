// ============================================================
// services/advisoryEngine.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// Generates the plain-English "operational advisory" shown to
// an OCC (Operation Control Centre) controller — a short
// summary + key insights + recommended actions, based on the
// live crowd picture across the network.
//
// GEMINI AUDIT NOTE: This replaces RailFlow's original
// `src/server/geminiService.ts`, which called Google's Gemini
// API purely to generate free-text advisory/chat-style
// summaries — a chatbot-style feature, not a prediction/ML
// feature. Per the integration rules, that usage of Gemini has
// been REMOVED and replaced with Anthropic's Claude API. Every
// other AI/ML feature in this project (crowd prediction, ETA
// prediction, the digital twin, the dataset pipeline in
// smartrail-ai-engine-v2) is untouched and still runs on its own
// trained models — nothing about those was Gemini-based to begin
// with, so nothing else needed to change.
//
// Exactly like the AI engine calls in aiEngine.ts, this degrades
// gracefully: if ANTHROPIC_API_KEY isn't set, or the Claude API
// call fails for any reason, we fall back to a deterministic,
// rule-based summary so the endpoint never breaks.
// ============================================================

import Anthropic from "@anthropic-ai/sdk";

let anthropicClient: Anthropic | null = null;

function getClaudeClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey });
  }
  return anthropicClient;
}

export interface StationSnapshot {
  stationId: string;
  name: string;
  line: string;
  occupancy: number;
  capacity: number;
  densityPercent: number;
  level: "low" | "moderate" | "high" | "critical";
}

export interface RecommendationSnapshot {
  stationId: string;
  title: string;
  actionRequired: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
}

export interface AiAdvisoryResponse {
  summary: string;
  keyInsights: string[];
  recommendedActions: string[];
  riskLevel: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  source: "CLAUDE_AI" | "DETERMINISTIC_ENGINE";
  timestamp: string;
}

export async function generateOperationalAdvisory(
  stations: StationSnapshot[],
  recommendations: RecommendationSnapshot[],
  query?: string,
  targetStationId?: string
): Promise<AiAdvisoryResponse> {
  const targetStation = targetStationId
    ? stations.find((s) => s.stationId.toLowerCase() === targetStationId.toLowerCase())
    : null;

  const criticalCount = stations.filter((s) => s.densityPercent >= 85).length;
  const highCount = stations.filter((s) => s.densityPercent >= 70 && s.densityPercent < 85).length;
  const avgOccupancy = stations.length
    ? Math.round(stations.reduce((acc, s) => acc + s.densityPercent, 0) / stations.length)
    : 0;

  const topCongested = [...stations]
    .sort((a, b) => b.densityPercent - a.densityPercent)
    .slice(0, 5)
    .map((s) => `${s.name} (${s.line}): ${s.densityPercent}% occupancy`);

  const client = getClaudeClient();

  if (client) {
    try {
      const prompt = `You are RailFlow AI, the real-time operational decision support assistant for Mumbai Suburban Railway Operation Control Centre (OCC).
Based on the following live deterministic ground-truth telemetry facts:
- Network Average Occupancy: ${avgOccupancy}%
- Critical Stations (>=85%): ${criticalCount}
- High Congestion Stations (70-84%): ${highCount}
- Top 5 Congested Stations:
${topCongested.map((s) => `  * ${s}`).join("\n")}
${targetStation ? `- Target Focus Station: ${targetStation.name} (${targetStation.line}) - Current Occupancy: ${targetStation.densityPercent}%` : ""}
- Active Recommendations:
${recommendations.map((r) => `  * [${r.priority}] ${r.title}: ${r.actionRequired}`).join("\n")}

${query ? `User specific inquiry: "${query}"` : "Provide an executive crowd mitigation synopsis for the OCC controller."}

Respond ONLY with strict JSON matching this schema, no prose before or after:
{
  "summary": "Concise 2-sentence executive summary of network crowd dynamics and operational risks",
  "keyInsights": ["3 specific data-driven observations citing actual station numbers"],
  "recommendedActions": ["2-3 concrete operational directives for station masters and motormen"],
  "riskLevel": "LOW" | "MODERATE" | "HIGH" | "CRITICAL"
}`;

      const response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      });

      const textBlock = response.content.find((block) => block.type === "text");
      if (textBlock && textBlock.type === "text") {
        const cleaned = textBlock.text.trim().replace(/^```json\s*|```$/g, "");
        const parsed = JSON.parse(cleaned);
        return {
          summary: parsed.summary || "Network operational telemetry processed.",
          keyInsights: Array.isArray(parsed.keyInsights) ? parsed.keyInsights : [],
          recommendedActions: Array.isArray(parsed.recommendedActions) ? parsed.recommendedActions : [],
          riskLevel: parsed.riskLevel || (criticalCount > 0 ? "CRITICAL" : highCount > 2 ? "HIGH" : "MODERATE"),
          source: "CLAUDE_AI",
          timestamp: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        };
      }
    } catch (error) {
      console.warn("Claude AI advisory generation failed, falling back to deterministic engine:", error);
    }
  }

  // Deterministic Fallback Engine (used when ANTHROPIC_API_KEY isn't
  // configured, or the Claude API call fails for any reason)
  const riskLevel: AiAdvisoryResponse["riskLevel"] =
    criticalCount >= 3 ? "CRITICAL" : criticalCount > 0 || highCount >= 3 ? "HIGH" : avgOccupancy > 60 ? "MODERATE" : "LOW";

  let summary = `Mumbai suburban network operating at ${avgOccupancy}% average capacity with ${criticalCount} critical hubs and ${highCount} high-density sectors under active monitoring.`;
  if (targetStation) {
    summary = `${targetStation.name} (${targetStation.line}) is at ${targetStation.densityPercent}% occupancy (${targetStation.level.toUpperCase()}).`;
  }

  const keyInsights = [
    topCongested.length
      ? `Busiest hubs right now: ${topCongested.slice(0, 2).map((s) => s.split(":")[0]).join(", ")}.`
      : "No station telemetry available yet.",
    `${criticalCount} station(s) at or above critical density (85%+), ${highCount} in the high band (70-84%).`,
    criticalCount > 0
      ? "Surge mitigation thresholds active on the most congested platforms."
      : "All monitored corridors are within normal operating range.",
  ];

  const recommendedActions = recommendations.slice(0, 3).map((r) => `${r.title} — ${r.actionRequired}`);
  if (recommendedActions.length === 0) {
    recommendedActions.push("Maintain regular dispatch headway and continue monitoring ticketing velocity.");
  }

  return {
    summary,
    keyInsights,
    recommendedActions,
    riskLevel,
    source: "DETERMINISTIC_ENGINE",
    timestamp: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
  };
}
