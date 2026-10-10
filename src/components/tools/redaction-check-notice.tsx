import type { RedactionCheckResult } from "@/lib/pdf/redaction-check";

export function RedactionCheckNotice({
  result,
}: {
  result: RedactionCheckResult;
}) {
  const passed = result.status === "pass";

  return (
    <div
      className={
        passed
          ? "mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-left"
          : "mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-left"
      }
      role="status"
    >
      <h3
        className={
          passed
            ? "text-sm font-black text-emerald-950"
            : "text-sm font-black text-red-950"
        }
      >
        Visible redaction check: {passed ? "Pass" : "Fail"}
      </h3>
      <p
        className={
          passed
            ? "mt-2 text-sm leading-6 text-emerald-900"
            : "mt-2 text-sm leading-6 text-red-900"
        }
      >
        {passed
          ? `${result.checkedTokens} confirmed token${result.checkedTokens === 1 ? "" : "s"} checked against the output text layer. No confirmed token remains.`
          : `${result.remainingTokens.length} confirmed token${result.remainingTokens.length === 1 ? "" : "s"} still appear in the output text layer.`}
      </p>
      {!passed ? (
        <ul className="mt-2 space-y-1 text-xs font-semibold text-red-900">
          {result.remainingTokens.slice(0, 5).map((token) => (
            <li key={token}>{token}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
