import { describe, it, expect, vi, beforeEach } from "vitest";
import { JSDOM } from "jsdom";
import { fuzz, FieldMeta } from "../src/index";

// Helper to simulate DOM parsing
function parseForm(html: string): HTMLFormElement {
  const dom = new JSDOM(html);
  const form = dom.window.document.querySelector("form");
  if (!form) throw new Error("No form in HTML");
  return form as HTMLFormElement;
}

// Simulate real usage: extract fields manually
function extractFields(form: HTMLFormElement): FieldMeta[] {
  return Array.from(
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
}

describe("fuzz()", () => {
  it("should generate string values for known input types", async () => {
    const form = parseForm(`
      <form>
        <input name="email" type="email" />
        <input name="age" type="number" />
        <input name="username" placeholder="user123" />
        <textarea name="bio"></textarea>
      </form>
    `);
    const fields = extractFields(form);
    const data = await fuzz(fields);

    expect(data).toHaveProperty("email");
    expect(typeof data.email).toBe("string");
    expect(data).toHaveProperty("age");
    expect(data).toHaveProperty("username");
    expect(data).toHaveProperty("bio");
  });

  it("should fall back to static generator if LLM fails", async () => {
    const form = parseForm(`
      <form>
        <input name="email" type="email" />
      </form>
    `);
    const fields = extractFields(form);

    // Force LLM to throw
    vi.mock("../src/index", async () => {
      const mod = await vi.importActual<typeof import("../src/index")>(
        "../src/index"
      );
      return {
        ...mod,
        fuzzWithLLM: vi.fn(() => {
          throw new Error("Simulated LLM failure");
        }),
      };
    });

    const { fuzz: mockedFuzz } = await import("../src/index");
    const data = await mockedFuzz(fields);

    expect(data).toHaveProperty("email");
    expect(data.email).toBe("john.doe@example.com");
  });

  it("should return empty object if form has no named fields", async () => {
    const form = parseForm(`
      <form>
        <input type="text" />
        <input type="submit" />
      </form>
    `);
    const fields = extractFields(form);
    const data = await fuzz(fields);

    expect(Object.keys(data).length).toBe(0);
  });

  it("should throw if HTML has no form", () => {
    expect(() => parseForm(`<div>No form here</div>`)).toThrow(
      "No form in HTML"
    );
  });
});
