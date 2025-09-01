// Placeholder - AI logic coming soon
const fs = require("fs");
const PATH = "./ai_memory.json";

function loadMemory(userId) {
  try {
    const all = JSON.parse(fs.readFileSync(PATH, "utf8"));
    return all[userId] || {};
  } catch {
    return {};
  }
}

function saveMemory(userId, updates) {
  let all = {};
  try { all = JSON.parse(fs.readFileSync(PATH, "utf8")); } catch {}
  const current = all[userId] || {};
  all[userId] = { ...current, ...updates };
  fs.writeFileSync(PATH, JSON.stringify(all, null, 2));
}

module.exports = { loadMemory, saveMemory };

