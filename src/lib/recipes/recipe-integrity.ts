export type RecipeIntegrityTrail = {
  algorithm: "SHA-256";
  after: {
    hash: string;
    name: string;
  };
  before: Array<{
    hash: string;
    name: string;
  }>;
};
