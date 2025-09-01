const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");
const { triageRisk, crisisResponse } = require("../safety/filter");
const { exercises } = require("../tools/tools");
const { loadMemory, saveMemory } = require("../memory/memory");
require("dotenv").config({ path: path.join(process.cwd(), "backend", ".env") });

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const persona = fs.readFileSync(path.join(__dirname, "..", "prompts", "persona.md"), "utf8");
const style = fs.readFileSync(path.join(__dirname, "..", "prompts", "mental_health_prompt.md"), "utf8");

// optional few-shot examples (safe to leave empty if file missing)
let examples = [];
try {
  const raw = fs.readFileSync(path.join(__dirname, "..", "data", "sample_conversations.json"), "utf8");
  examples = JSON.parse(raw);
} catch { examples = []; }

async function chatWithDoof({ userId = "anon", messages = [] }) {
  const lastUserText = (messages.filter(m => m.role === "user").slice(-1)[0] || {}).content || "";

  // 1) Safety triage
  const triage = triageRisk(lastUserText);
  if (triage.level === "crisis") return crisisResponse();

  // 2) Light memory
  const mem = loadMemory(userId);

  // 3) Compose system prompt
  const system = [
    persona,
    "\n\n## Reply style\n", style,
    "\n\n## User memory (brief)\n", JSON.stringify(mem)
  ].join("");

  // 4) Few-shot prelude
  const prelude = examples.flatMap(e => e.messages).slice(0, 8); // keep short

  const apiMessages = [
    { role: "system", content: system },
    { role: "system", content: `You may suggest ONE of these tiny exercises when suitable: ${Object.values(exercises).join(" | ")}` },
    ...prelude,
    ...messages
  ];

  const resp = await client.chat.completions.create({
    model: "gpt-4o-mini",   // adjust to a model available on your account
    temperature: 0.7,
    messages: apiMessages
  });

  const text = resp.choices?.[0]?.message?.content || "Sorry, I couldn’t generate a reply.";

  // 5) tiny memory heuristic
  const nameMatch = /my name is\s+([A-Za-z][A-Za-z\-']*)/i.exec(lastUserText);
  if (nameMatch) saveMemory(userId, { name: nameMatch[1] });

  return { message: text, triage };
}

module.exports = { chatWithDoof };

