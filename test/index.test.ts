import { describe, it, expect } from "vitest";
import { JSDOM } from "jsdom";
import { generateTestData } from "../src/index";

describe("generateTestData", () => {
  it("should generate values from form", async () => {
    const dom = new JSDOM(`
      <form id="f">
        <input name="email" type="email" />
        <input name="age" type="number" />
        <input name="username" placeholder="user123" />
      </form>
    `);
    const form = dom.window.document.getElementById("f") as HTMLFormElement;
    const data = await generateTestData(form);

    expect(data).toHaveProperty("email");
    expect(data).toHaveProperty("age");
    expect(data).toHaveProperty("username");
  });
});
