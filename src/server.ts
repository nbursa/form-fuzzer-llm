import express, { RequestHandler } from "express";
import path from "path";
import { fileURLToPath } from "url";
import { JSDOM } from "jsdom";
import { FieldMeta, fuzzWithLLM } from "./index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "..")));

const fuzzHandler: RequestHandler = async (req, res) => {
  const html = req.body.html as string;
  if (typeof html !== "string") {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }

  const dom = new JSDOM(html);
  const form = dom.window.document.querySelector("form");
  if (!form) {
    res.status(400).json({ error: "No <form> found" });
    return;
  }

  const fields: FieldMeta[] = Array.from(
    form.querySelectorAll("input[name], select[name], textarea[name]")
  ).map((el) => ({
    name: el.getAttribute("name")!,
    type:
      el.tagName.toLowerCase() === "input"
        ? (el as HTMLInputElement).type
        : el.tagName.toLowerCase() === "select"
        ? "select"
        : "textarea",
    placeholder:
      "placeholder" in el ? (el as HTMLInputElement).placeholder : undefined,
  }));

  try {
    const data = await fuzzWithLLM(fields);
    res.json(data);
    return;
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "LLM generation failed" });
    return;
  }
};

app.post("/api/fuzz", fuzzHandler);

const port = 3000;
app.listen(port, () => {
  console.log(`🚀 http://localhost:${port}/test.html`);
});
