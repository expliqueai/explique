export function createProcessingSystemPrompt() {
  const BASE_PROMPT = `
Please process the following 5-minute video segment. Timestamps must remain accurate to the segment's own playback, starting at 00:00:00 for each new segment.

**Instructions**:
1. **Report on-screen content only when fully presented** (e.g., when a slide is fully shown or explained).
2. **Report on-screen events** (e.g., a word is being highlighted on the slide)
3. **Use LaTeX** for any mathematical symbols or equations.
4. **Include slide titles** if present.
5. **Describe all visible elements** such as text, bullet points, annotations, images, or diagrams.
- For each slide, add a detailed description of diagrams using Mermaid.js code for clarity and reproducibility.
- For each slide, add a detailed description of charts:
    - Extract all meaningful information from the chart, including:
        - Title, axes labels, units, and ranges.
        - Key data points, minimums, maximums, trends, and outliers.
        - Patterns or insights derived from the data.
    - Represent this extracted information in well-structured text, ensuring no detail is lost.

Important: Every timestamp must be formatted as hh:mm:ss.

**Output Format**:
[<startTimestamp> to <endTimestamp>] <Segment Content>
  `.trim();

  return BASE_PROMPT;
}
