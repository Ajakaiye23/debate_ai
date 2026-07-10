/**
 * Extracts and parses the first JSON object/array from a model response.
 * Strips markdown code fences and surrounding prose. Throws on failure.
 */
export function safeJsonParse<T = any>(raw: string): T {
  let text = (raw ?? '').trim();

  // Strip ```json ... ``` or ``` ... ``` fences
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();

  // Fall back to the first {...} or [...] block
  if (!text.startsWith('{') && !text.startsWith('[')) {
    const obj = text.match(/[{[][\s\S]*[}\]]/);
    if (obj) text = obj[0];
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Failed to parse model JSON. Raw output:\n${raw}`);
  }
}
