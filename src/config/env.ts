const DEFAULT_SITE_URL = "http://localhost:3000";

function readPublicUrl(value: string | undefined): URL {
  const candidate = value?.trim() || DEFAULT_SITE_URL;

  try {
    const url = new URL(candidate);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("unsupported protocol");
    }

    return url;
  } catch {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL must be an absolute HTTP or HTTPS URL.",
    );
  }
}

export const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV ?? "development",
  siteUrl: readPublicUrl(process.env.NEXT_PUBLIC_SITE_URL),
});
