import * as cheerio from "cheerio";

/**
 * Cleans raw HTML job descriptions into clean, readable plaintext.
 * - Strips scripts, styles, iframes, SVGs
 * - Preserves structural paragraphs, line breaks, and list bullets
 * - Handles malformed, null, undefined, and non-string inputs safely
 */
export function cleanHtml(html?: string | null): string {
  if (!html || typeof html !== "string") {
    return "";
  }

  const trimmed = html.trim();
  if (!trimmed) {
    return "";
  }

  // If there are no HTML tags, return normalized plaintext
  if (!trimmed.includes("<") || !trimmed.includes(">")) {
    return trimmed
      .replace(/\r\n/g, "\n")
      .replace(/[ \t]+/g, " ")
      .trim();
  }

  try {
    const $ = cheerio.load(trimmed);

    // Remove unwanted non-content elements
    $("script, style, noscript, svg, iframe, link, meta").remove();

    // Replace break tags with newlines
    $("br").replaceWith("\n");

    // Preserve block level spacing
    $("p, div, h1, h2, h3, h4, h5, h6, tr").each((_, elem) => {
      $(elem).append("\n");
    });

    // Format list items as bullets
    $("li").each((_, elem) => {
      $(elem).prepend("• ").append("\n");
    });

    const text = $.text();

    return text
      .replace(/\r\n/g, "\n")
      .replace(/[ \t]+/g, " ")
      .replace(/\n\s*\n\s*\n+/g, "\n\n")
      .trim();
  } catch {
    // Fallback regex cleaner for malformed HTML that crashes parser
    return trimmed
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<li[^>]*>/gi, "\n• ")
      .replace(/<[^>]+>/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/\n\s*\n\s*\n+/g, "\n\n")
      .trim();
  }
}

// Export cleanHtmlDescription as an alias
export const cleanHtmlDescription = cleanHtml;
