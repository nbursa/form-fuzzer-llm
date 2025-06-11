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
  modelPath: path.join(__dirname, "../models/formfuzz.gguf"),
});
const context = await model.createContext();
const session = new LlamaChatSession({
  contextSequence: context.getSequence(),
});

export async function fuzzWithLLM(
  fields: FieldMeta[]
): Promise<Record<string, string>> {
  const prompt = `Return ONLY a single JSON object mapping these form fields to string values:\n${JSON.stringify(
    fields
  )}`;

  const raw = await session.prompt(prompt, {
    maxTokens: 512,
    temperature: 0.1,
  });

  console.log("LLM raw reply:", raw);

  const cleaned = raw.replace(/<\|.*?\|>/g, "").trim();

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
