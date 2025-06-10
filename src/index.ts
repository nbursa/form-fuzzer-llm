import { getLlama, LlamaChatSession } from "node-llama-cpp";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const llama = await getLlama();
const model = await llama.loadModel({
  modelPath: path.join(__dirname, "../models/formfuzz.gguf"),
});
const context = await model.createContext();
const session = new LlamaChatSession({
  contextSequence: context.getSequence(),
});

interface FieldMeta {
  name: string;
  type: string;
  placeholder?: string;
}

function extractFieldMeta(form: HTMLFormElement): FieldMeta[] {
  return Array.from(
    form.querySelectorAll<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >("input[name], select[name], textarea[name]")
  )
    .filter((el) => !!el.name)
    .map((el) => ({
      name: el.name,
      type:
        el instanceof HTMLInputElement
          ? el.type
          : el instanceof HTMLSelectElement
          ? "select"
          : "textarea",
      placeholder:
        el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
          ? el.placeholder || ""
          : undefined,
    }));
}

export async function generateTestData(
  form: HTMLFormElement
): Promise<Record<string, string>> {
  const fields = extractFieldMeta(form);
  const prompt = JSON.stringify(fields);
  const reply = await session.prompt(prompt);

  try {
    return JSON.parse(reply);
  } catch {
    // fallback if parsing fails
    const result: Record<string, string> = {};
    fields.forEach((f) => {
      switch (f.type) {
        case "email":
          result[f.name] = "test@example.com";
          break;
        case "number":
          result[f.name] = String(Math.floor(Math.random() * 100));
          break;
        default:
          result[f.name] = f.placeholder || "Lorem Ipsum";
          break;
      }
    });
    return result;
  }
}
