// Placeholder - AI logic coming soon
// Simple conservative triage. Replace with a classifier later if you like.
const RED_FLAGS = [
  /kill myself|suicide|end my life|i want to die/i,
  /self[-\s]?harm|cutting|hurt myself/i,
  /i have a plan|i bought (a rope|pills)|today is the day/i,
  /abuse|assault|he hit me|she hit me/i
];

function triageRisk(text = "") {
  const reasons = RED_FLAGS.filter(r => r.test(text)).map(r => r.source);
  if (reasons.length) return { level: "crisis", reasons };
  const amber = /worthless|hopeless|can't cope|panic attack|overwhelmed|anxious/i.test(text);
  return { level: amber ? "distress" : "none", reasons: [] };
}

function crisisResponse() {
  return {
    message:
`I’m really glad you told me. I’m not a crisis service, but your safety matters.
If you feel in immediate danger, please contact local emergency services (112 in India) or reach a trusted person nearby.
You can also try:
• Kiran (India mental health helpline): 1800-599-0019
• iCall: 9152987821
Would you like a small step we can plan together while you reach out?`,
    triage: { level: "crisis", reasons: ["keyword"] }
  };
}

module.exports = { triageRisk, crisisResponse };


