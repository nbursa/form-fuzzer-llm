export function generateTestData(
  form: HTMLFormElement
): Record<string, string> {
  const fields: Record<string, string> = {};

  const inputs = form.querySelectorAll<
    HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  >("input[name], select[name], textarea[name]");

  inputs.forEach((el) => {
    const name = el.name;
    if (!name) return;

    let value = "";

    if (el instanceof HTMLInputElement) {
      switch (el.type) {
        case "email":
          value = "test@example.com";
          break;
        case "number":
          value = String(Math.floor(Math.random() * 100));
          break;
        case "text":
        default:
          value = el.placeholder || "Lorem Ipsum";
          break;
      }
    } else if (el instanceof HTMLSelectElement) {
      const options = Array.from(el.options).filter((o) => o.value);
      value = options[Math.floor(Math.random() * options.length)]?.value || "";
    } else if (el instanceof HTMLTextAreaElement) {
      value = "Generated text content.";
    }

    fields[name] = value;
  });

  return fields;
}
