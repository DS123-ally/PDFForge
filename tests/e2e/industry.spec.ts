import { expect, test } from "@playwright/test";

const pages = [
  {
    path: "/for/ca-firms",
    recipe: "Number a packet",
    href: "/tools/private-recipes#number-a-packet",
  },
  {
    path: "/for/law-firms",
    recipe: "Redact a copy",
    href: "/tools/private-recipes#redact-a-copy",
  },
  {
    path: "/for/hr",
    recipe: "Clean a copy",
    href: "/tools/private-recipes#clean-a-copy",
  },
];

test("industry pages open Send externally and a second local recipe", async ({
  page,
}) => {
  for (const entry of pages) {
    await page.goto(entry.path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Open Send externally" }),
    ).toHaveAttribute("href", "/tools/private-recipes#send-externally");
    await expect(
      page.getByRole("link", { name: `Open ${entry.recipe}` }),
    ).toHaveAttribute("href", entry.href);
  }
});
