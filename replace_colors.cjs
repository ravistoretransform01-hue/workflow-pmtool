const fs = require("fs");

const path = "src/features/workload/components/DevBoardDailyView.tsx";
let content = fs.readFileSync(path, "utf8");

const replacements = {
  "#08111F": "hsl(var(--background))",
  "#0F1B33": "hsl(var(--card))",
  "linear-gradient(135deg, #34D399, #10B981)": "hsl(var(--primary))",
  "linear-gradient(90deg, #34D399, #10B981)": "hsl(var(--primary))",
  "#34D399": "hsl(var(--primary))",
  "#10B981": "hsl(var(--primary))",
  "rgba(52,211,153,0.15)": "hsl(var(--primary) / 0.15)",
  "rgba(52,211,153,0.12)": "hsl(var(--primary) / 0.12)",
  "rgba(52,211,153,0.08)": "hsl(var(--primary) / 0.08)",
  "rgba(52,211,153,0.05)": "hsl(var(--primary) / 0.05)",
  "rgba(52,211,153,0.2)": "hsl(var(--primary) / 0.2)",
  "rgba(52,211,153,0.25)": "hsl(var(--primary) / 0.25)",
  "rgba(52,211,153,0.35)": "hsl(var(--primary) / 0.35)",
  "rgba(52,211,153,0.3)": "hsl(var(--primary) / 0.3)",
  "rgba(52,211,153,0.4)": "hsl(var(--primary) / 0.4)",
  "rgba(255,255,255,0.08)": "hsl(var(--border))",
  "rgba(255,255,255,0.06)": "hsl(var(--border))",
  "rgba(255,255,255,0.1)": "hsl(var(--border))",
  "rgba(255,255,255,0.02)": "hsl(var(--accent))",
  "rgba(255,255,255,0.03)": "hsl(var(--accent))",
  "rgba(255,255,255,0.04)": "hsl(var(--accent))",
  "rgba(255,255,255,0.05)": "hsl(var(--accent))",
  "#1a2a44": "hsl(var(--accent))",
  "#e2e8f0": "hsl(var(--foreground))",
  "#f1f5f9": "hsl(var(--foreground))",
  "#fff": "hsl(var(--foreground))",
  "#64748b": "hsl(var(--muted-foreground))",
  "#94a3b8": "hsl(var(--muted-foreground))",
  "#475569": "hsl(var(--muted-foreground))",
  "#334155": "hsl(var(--muted-foreground))",
  "#cbd5e1": "hsl(var(--muted-foreground))",
  "#f87171": "hsl(var(--destructive))",
  "rgba(248,113,113,0.08)": "hsl(var(--destructive) / 0.15)",
};

for (const [old, new_] of Object.entries(replacements)) {
  content = content.split(old).join(new_);
}

fs.writeFileSync(path, content);
console.log("Done");
