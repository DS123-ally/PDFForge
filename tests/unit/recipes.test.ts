import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";

import {
  createRecipeStep,
  stripRecipeSecrets,
  validateRecipe,
} from "@/lib/recipes/recipe";
import {
  recipeStorageKey,
  recipeStoreContainsSecrets,
  readRecipeStore,
  saveRecipe,
  setRecipeStorageOptIn,
} from "@/lib/recipes/recipe-storage";
import { runRecipe } from "@/lib/recipes/run-recipe";
import { createPdfBytes, toArrayBuffer } from "../fixtures/pdf";

class MemoryStorage implements Storage {
  private data = new Map<string, string>();

  get length() {
    return this.data.size;
  }

  clear() {
    this.data.clear();
  }

  getItem(key: string) {
    return this.data.get(key) ?? null;
  }

  key(index: number) {
    return [...this.data.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.data.delete(key);
  }

  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
}

describe("validateRecipe", () => {
  it("requires merge first for multiple files and protect last", () => {
    expect(() =>
      validateRecipe([createRecipeStep("add-page-numbers")], 2),
    ).toThrow(/merge/i);
    expect(() =>
      validateRecipe(
        [
          createRecipeStep("merge-pdf"),
          {
            id: "p",
            password: "long-enough-secret",
            type: "password-protect-pdf",
          },
          createRecipeStep("remove-metadata"),
        ],
        2,
      ),
    ).toThrow(/last step/i);
  });
});

describe("runRecipe", () => {
  it("merges then numbers pages locally", async () => {
    const first = toArrayBuffer(await createPdfBytes({ pageCount: 1 }));
    const second = toArrayBuffer(await createPdfBytes({ pageCount: 2 }));
    const result = await runRecipe(
      [
        { bytes: first, name: "first.pdf" },
        { bytes: second, name: "second.pdf" },
      ],
      [createRecipeStep("merge-pdf"), createRecipeStep("add-page-numbers")],
    );
    const output = await PDFDocument.load(result.outputBytes);

    expect(result.fileCount).toBe(2);
    expect(result.totalPages).toBe(3);
    expect(result.filename).toBe("first-recipe.pdf");
    expect(output.getPageCount()).toBe(3);
  });
});

describe("recipe storage", () => {
  it("does not write until opt-in and never stores passwords or PDF bytes", () => {
    const storage = new MemoryStorage();
    const steps = [
      createRecipeStep("merge-pdf"),
      {
        id: "protect",
        password: "super-secret-pass",
        type: "password-protect-pdf" as const,
      },
    ];

    expect(() =>
      saveRecipe({ id: "r1", name: "Packet", steps }, storage),
    ).toThrow(/turn on/i);

    setRecipeStorageOptIn(true, storage);
    saveRecipe({ id: "r1", name: "Packet", steps }, storage);

    const raw = storage.getItem(recipeStorageKey) ?? "";
    const store = readRecipeStore(storage);

    expect(recipeStorageKey).not.toMatch(
      /pdf|document|file|password|metadata/i,
    );
    expect(recipeStoreContainsSecrets(raw)).toBe(false);
    expect(raw).not.toContain("super-secret-pass");
    expect(raw).not.toContain("%PDF");
    expect(stripRecipeSecrets(steps)[1]).toEqual({
      id: "protect",
      type: "password-protect-pdf",
    });
    expect(store.recipes[0]?.steps[1]).not.toHaveProperty("password");
  });
});
