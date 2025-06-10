import { JSDOM } from "jsdom";
import { generateTestData } from "../dist/index.js";

const dom = new JSDOM(`
  <form id="f">
    <input name="email" type="email" />
    <input name="age" type="number" />
    <input name="username" placeholder="u123" />
  </form>
`);
const form = dom.window.document.getElementById("f");
const data = generateTestData(form);

console.log(data);
// Expect: { email: ..., age: ..., username: ... }
