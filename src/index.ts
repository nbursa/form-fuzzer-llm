import { getLlama, LlamaChatSession } from "node-llama-cpp";
import { fileURLToPath } from "url";
import path from "path";

export interface FieldMeta {
  name: string;
  type: string;
  placeholder?: string;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const llama = await getLlama();
const model = await llama.loadModel({
  modelPath: path.join(__dirname, "../models/formfuzzer-tiny.gguf"),
});
const context = await model.createContext();
const session = new LlamaChatSession({
  contextSequence: context.getSequence(),
});

export async function fuzzWithLLM(
  fields: FieldMeta[],
): Promise<Record<string, string>> {
  const prompt = `
[{"name":"email","type":"email"},{"name":"age","type":"number"}]
{"email":"jane.doe@example.com","age":"27"}

[{"name":"name","type":"text"},{"name":"zip","type":"text"},{"name":"role","type":"select"}]
{"name":"Veronica Yu","zip":"21554","role":"admin"}

[{"name":"phone","type":"tel"},{"name":"username","type":"text"}]
{"phone":"914-927-5416","username":"cbrewer"}

${JSON.stringify(fields)}
Output:
`;

  const raw = await session.prompt(prompt, {
    maxTokens: 256,
    temperature: 0.2,
  });

  console.log("LLM raw reply:", raw);

  const cleaned = raw
    .replace(/<\|.*?\|>/g, "")
    .trim()
    .replace(/\n/g, "")
    .replace(/[\r\t]/g, "")
    .replace(/}{/g, "},{");

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < 0 || end <= start) {
    throw new Error("Could not extract JSON from LLM reply:\n" + cleaned);
  }

  const jsonText = cleaned.slice(start, end + 1);

  try {
    const parsed = JSON.parse(jsonText);
    if (Array.isArray(parsed)) {
      if (parsed.length === 0) throw new Error("LLM returned empty array");
      return parsed[0];
    }
    return parsed;
  } catch (err) {
    console.error("Failed to parse JSON:", jsonText);
    throw err;
  }
}

export async function fuzz(
  fields: FieldMeta[],
): Promise<Record<string, string>> {
  try {
    return await fuzzWithLLM(fields);
  } catch (err) {
    console.warn("LLM failed, falling back to static generator:", err);
    return fallbackFuzz(fields);
  }
}

function fallbackFuzz(fields: FieldMeta[]): Record<string, string> {
  const mock: Record<string, string> = {};
  for (const field of fields) {
    mock[field.name] = generateFakeValue(field.type, field.placeholder);
  }
  return mock;
}

function generateFakeValue(type: string, hint?: string): string {
  if (/email/i.test(type)) return "john.doe@example.com";
  if (/name/i.test(type)) return "John Doe";
  if (/phone|tel/i.test(type)) return "+1-555-1234";
  if (/date/i.test(type)) return "2025-01-01";
  if (/city/i.test(type)) return "New York";
  if (/zip|post/i.test(type)) return "12345";
  if (/bio|desc/i.test(type)) return "This is a short bio.";
  return "Lorem Ipsum";
}
