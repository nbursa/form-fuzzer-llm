import https from "https";
import fs from "fs";
import path from "path";

const url = "https://.../formfuzz.gguf";
const out = path.resolve(__dirname, "../models/formfuzz.gguf");

https.get(url, (res) => {
  const file = fs.createWriteStream(out);
  res.pipe(file);
  file.on("finish", () => file.close());
});
