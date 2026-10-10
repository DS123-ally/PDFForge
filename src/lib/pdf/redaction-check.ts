import { destroyLoadingTask, getPdfJs } from "@/lib/pdf/pdfjs";

export type RedactionCheckResult = {
  checkedTokens: number;
  remainingTokens: string[];
  status: "pass" | "fail";
};

export async function verifyTokensRemovedFromTextLayer(
  bytes: ArrayBuffer,
  tokens: readonly string[],
): Promise<RedactionCheckResult> {
  const uniqueTokens = [...new Set(tokens.map((token) => token.trim()))].filter(
    Boolean,
  );

  if (uniqueTokens.length === 0) {
    return { checkedTokens: 0, remainingTokens: [], status: "pass" };
  }

  const text = await extractTextLayer(bytes);
  const remainingTokens = uniqueTokens.filter((token) =>
    textContainsToken(text, token),
  );

  return {
    checkedTokens: uniqueTokens.length,
    remainingTokens,
    status: remainingTokens.length === 0 ? "pass" : "fail",
  };
}

async function extractTextLayer(bytes: ArrayBuffer) {
  const pdfjs = await getPdfJs();
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(bytes.slice(0)),
    disableAutoFetch: true,
    disableStream: true,
    useWorkerFetch: false,
  });

  try {
    const document = await loadingTask.promise;
    const text: string[] = [];

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();

      for (const item of content.items) {
        if ("str" in item && item.str) {
          text.push(item.str);
        }
      }

      page.cleanup();
    }

    await document.cleanup();
    return text.join("\n");
  } finally {
    destroyLoadingTask(loadingTask);
  }
}

function textContainsToken(text: string, token: string) {
  const lowerText = text.toLowerCase();
  const lowerToken = token.toLowerCase();

  if (lowerText.includes(lowerToken)) {
    return true;
  }

  return normalizeWhitespace(lowerText).includes(
    normalizeWhitespace(lowerToken),
  );
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}
