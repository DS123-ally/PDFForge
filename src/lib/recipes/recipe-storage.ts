import {
  stripRecipeSecrets,
  type RecipeStep,
  type StoredRecipe,
} from "@/lib/recipes/recipe";

export type { StoredRecipe };

export const recipeStorageKey = "forge.private-recipes.v1";

type RecipeStore = {
  optedIn: boolean;
  recipes: StoredRecipe[];
};

const emptyStore: RecipeStore = {
  optedIn: false,
  recipes: [],
};

const recipeStoreListeners = new Set<() => void>();
let snapshotCache: { raw: string | null; store: RecipeStore } | null = null;

export function subscribeRecipeStore(onStoreChange: () => void) {
  recipeStoreListeners.add(onStoreChange);

  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStoreChange);
  }

  return () => {
    recipeStoreListeners.delete(onStoreChange);

    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStoreChange);
    }
  };
}

export function getRecipeStoreSnapshot() {
  const storage = getLocalStorage();
  const raw = storage?.getItem(recipeStorageKey) ?? null;

  if (snapshotCache && snapshotCache.raw === raw) {
    return snapshotCache.store;
  }

  const store = readRecipeStore(storage);
  snapshotCache = { raw, store };
  return store;
}

export function getRecipeStoreServerSnapshot() {
  return emptyStore;
}

function notifyRecipeStore() {
  snapshotCache = null;

  for (const listener of recipeStoreListeners) {
    listener();
  }
}

export function readRecipeStore(storage: Storage | null = getLocalStorage()) {
  if (!storage) {
    return emptyStore;
  }

  try {
    const raw = storage.getItem(recipeStorageKey);

    if (!raw) {
      return emptyStore;
    }

    const parsed = JSON.parse(raw) as RecipeStore;

    if (!parsed || typeof parsed !== "object") {
      return emptyStore;
    }

    return {
      optedIn: parsed.optedIn === true,
      recipes: Array.isArray(parsed.recipes)
        ? parsed.recipes.map(sanitizeStoredRecipe)
        : [],
    };
  } catch {
    return emptyStore;
  }
}

export function setRecipeStorageOptIn(
  optedIn: boolean,
  storage: Storage | null = getLocalStorage(),
) {
  if (!storage) {
    return emptyStore;
  }

  if (!optedIn) {
    storage.removeItem(recipeStorageKey);
    notifyRecipeStore();
    return emptyStore;
  }

  const current = readRecipeStore(storage);
  const next: RecipeStore = { optedIn: true, recipes: current.recipes };
  writeStore(next, storage);
  return next;
}

export function saveRecipe(
  recipe: Omit<StoredRecipe, "updatedAt">,
  storage: Storage | null = getLocalStorage(),
) {
  const current = readRecipeStore(storage);

  if (!current.optedIn || !storage) {
    throw new Error("Turn on recipe saving on this device first.");
  }

  const stored: StoredRecipe = {
    id: recipe.id,
    name: recipe.name.trim() || "Untitled recipe",
    steps: stripRecipeSecrets(recipe.steps),
    updatedAt: new Date().toISOString(),
  };
  const recipes = [
    stored,
    ...current.recipes.filter((entry) => entry.id !== stored.id),
  ].slice(0, 20);
  writeStore({ optedIn: true, recipes }, storage);
  return stored;
}

export function deleteRecipe(
  id: string,
  storage: Storage | null = getLocalStorage(),
) {
  const current = readRecipeStore(storage);

  if (!current.optedIn || !storage) {
    return current;
  }

  const next = {
    optedIn: true,
    recipes: current.recipes.filter((recipe) => recipe.id !== id),
  };
  writeStore(next, storage);
  return next;
}

export function recipeStoreContainsSecrets(raw: string) {
  if (/%PDF-|ArrayBuffer|blob:/i.test(raw)) {
    return true;
  }

  try {
    const parsed = JSON.parse(raw) as {
      recipes?: Array<{ steps?: Array<Record<string, unknown>> }>;
    };

    return (parsed.recipes ?? []).some((recipe) =>
      (recipe.steps ?? []).some((step) => {
        const password = step.password;
        return typeof password === "string" && password.length > 0;
      }),
    );
  } catch {
    return true;
  }
}

function sanitizeStoredRecipe(value: StoredRecipe): StoredRecipe {
  return {
    id: String(value.id ?? createId()),
    name: String(value.name ?? "Untitled recipe").slice(0, 80),
    steps: stripRecipeSecrets(
      Array.isArray(value.steps) ? (value.steps as RecipeStep[]) : [],
    ),
    updatedAt: String(value.updatedAt ?? ""),
  };
}

function writeStore(store: RecipeStore, storage: Storage) {
  storage.setItem(recipeStorageKey, JSON.stringify(store));
  notifyRecipeStore();
}

function getLocalStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `recipe-${Date.now()}`;
}
