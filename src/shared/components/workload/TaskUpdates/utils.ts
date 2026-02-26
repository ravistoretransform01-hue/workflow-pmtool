import { intervalToDuration } from "date-fns";

/**
 * Helper to render HTML content from Tiptap editor with proper styling
 */
export const renderFormattedContent = (content: string) => {
  if (!content) return { __html: "" };

  // Check if content is already HTML (from Tiptap)
  if (content.includes("<") && content.includes(">")) {
    return { __html: content };
  }

  // Otherwise, treat as markdown-ish content and convert
  let safeContent = content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  // Restore Bold
  safeContent = safeContent.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  // Restore Italic
  safeContent = safeContent.replace(/_(.*?)_/g, "<em>$1</em>");
  // Restore Strike
  safeContent = safeContent.replace(/~~(.*?)~~/g, "<strike>$1</strike>");
  // Newlines
  safeContent = safeContent.replace(/\n/g, "<br />");

  return { __html: safeContent };
};

/**
 * Helper to format relative time for comments: "7 hour 2 min ago", "5 days ago", etc.
 */
export const getRelativeTimeString = (dateStr: string) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();

  // Use intervalToDuration for precise parts
  const duration = intervalToDuration({ start: date, end: now });

  if (duration.years)
    return `${duration.years} year${duration.years > 1 ? "s" : ""} ago`;
  if (duration.months)
    return `${duration.months} month${duration.months > 1 ? "s" : ""} ago`;
  if (duration.days)
    return `${duration.days} day${duration.days > 1 ? "s" : ""} ago`;

  const parts = [];
  if (duration.hours) {
    parts.push(`${duration.hours} hour${duration.hours > 1 ? "s" : ""}`);
  }
  if (duration.minutes) {
    parts.push(`${duration.minutes} min`);
  }

  if (parts.length === 0) return "just now";

  return `${parts.join(" ")} ago`;
};
