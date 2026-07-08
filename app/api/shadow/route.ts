import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 60;

const SHADOW_MCP_URL = "https://mcp.shadow.co";

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const shadowToken = process.env.SHADOW_API_TOKEN;

  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured." },
      { status: 500 }
    );
  }
  if (!shadowToken) {
    return NextResponse.json(
      { error: "SHADOW_API_TOKEN is not configured." },
      { status: 500 }
    );
  }

  let body: {
    platform: string;
    table: string;
    start_date: string;
    end_date: string;
    group_by: string[];
    aggregations: Record<string, string[]>;
    limit?: number;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  // Instruct Claude to call Shadow query_data and return the raw JSON array
  const prompt = `Call the Shadow \`query_data\` tool with EXACTLY these parameters:
${JSON.stringify(body, null, 2)}

After the tool returns, output ONLY a raw JSON array of the result rows with no markdown, no code fences, no explanation — just the array starting with [ and ending with ].`;

  try {
    const response = await (client.beta.messages as unknown as {
      create: (params: Record<string, unknown>) => Promise<Anthropic.Message>;
    }).create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 8192,
      betas: ["mcp-client-2025-04-04"],
      mcp_servers: [
        {
          type: "url",
          url: SHADOW_MCP_URL,
          name: "shadow",
          authorization_token: shadowToken,
        },
      ],
      messages: [{ role: "user", content: prompt }],
    });

    // Extract the text block containing the JSON array
    const textBlock = response.content.find((b) => b.type === "text");
    const raw = textBlock && "text" in textBlock ? textBlock.text.trim() : "";

    // Strip accidental markdown code fences if present
    const cleaned = raw.replace(/^```[a-z]*\n?/i, "").replace(/```$/, "").trim();

    let rows: unknown[];
    try {
      const parsed = JSON.parse(cleaned);
      rows = Array.isArray(parsed)
        ? parsed
        : Array.isArray((parsed as Record<string, unknown>)?.data)
        ? (parsed as { data: unknown[] }).data
        : [];
    } catch {
      return NextResponse.json(
        { error: "Shadow returned data that could not be parsed as JSON.", raw: cleaned.slice(0, 500) },
        { status: 502 }
      );
    }

    return NextResponse.json({ rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Shadow query failed: ${message}` },
      { status: 502 }
    );
  }
}
