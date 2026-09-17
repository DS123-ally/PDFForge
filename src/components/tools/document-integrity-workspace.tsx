"use client";

import {
  Fingerprint,
  GitCompare,
  Search,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { type DragEvent, useId, useRef, useState } from "react";

import { PrivacyNotice } from "@/components/pdf/privacy-notice";
import { Button } from "@/components/ui/button";
import { formatFileSize } from "@/lib/files/format-file-size";
import { validateFile } from "@/lib/files/validate-file";
import {
  algorithmForHashLength,
  hashFile,
  hashesMatch,
  type HashAlgorithm,
} from "@/lib/integrity/hash-file";
import { cn } from "@/lib/utils";

type IntegrityTab = "fingerprint" | "compare" | "verify";

type HashedFile = {
  hash: string;
  name: string;
  size: number;
};

const tabs: Array<{
  id: IntegrityTab;
  label: string;
  icon: typeof Fingerprint;
}> = [
  { id: "fingerprint", label: "Fingerprint", icon: Fingerprint },
  { id: "compare", label: "Compare", icon: GitCompare },
  { id: "verify", label: "Verify Hash", icon: Search },
];

export function DocumentIntegrityWorkspace() {
  const [tab, setTab] = useState<IntegrityTab>("fingerprint");
  const [algorithm, setAlgorithm] = useState<HashAlgorithm>("SHA-256");

  return (
    <div>
      <p className="text-sm text-zinc-600">
        Fingerprint · Compare · Tamper detection · Verify — 100% local
      </p>
      <div
        aria-label="Integrity modes"
        className="mt-5 grid gap-2 rounded-2xl border border-zinc-200 bg-zinc-100 p-1 sm:grid-cols-3"
        role="tablist"
      >
        {tabs.map((item) => {
          const Icon = item.icon;
          const selected = tab === item.id;

          return (
            <button
              aria-selected={selected}
              className={cn(
                "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold",
                selected
                  ? "bg-white text-zinc-950 shadow-sm"
                  : "text-zinc-600 hover:text-zinc-950",
              )}
              key={item.id}
              onClick={() => setTab(item.id)}
              role="tab"
              type="button"
            >
              <Icon aria-hidden="true" className="size-4" />
              {item.label}
            </button>
          );
        })}
      </div>

      <label className="mt-5 block text-sm font-bold text-zinc-950">
        Hash algorithm
        <select
          className="mt-2 min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 sm:max-w-xs"
          onChange={(event) =>
            setAlgorithm(event.target.value as HashAlgorithm)
          }
          value={algorithm}
        >
          <option value="SHA-256">SHA-256</option>
          <option value="SHA-512">SHA-512</option>
        </select>
      </label>

      {tab === "fingerprint" ? (
        <FingerprintPanel algorithm={algorithm} />
      ) : null}
      {tab === "compare" ? <ComparePanel algorithm={algorithm} /> : null}
      {tab === "verify" ? <VerifyPanel algorithm={algorithm} /> : null}

      <p className="mt-6 text-center text-xs leading-5 text-zinc-500">
        All hashing runs locally in your browser. No files are uploaded. No data
        is sent to any server.
      </p>
      <div className="mt-7">
        <PrivacyNotice />
      </div>
    </div>
  );
}

function FingerprintPanel({ algorithm }: { algorithm: HashAlgorithm }) {
  const [result, setResult] = useState<HashedFile | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onFile(nextFile: File | null) {
    setError("");
    setResult(null);

    if (!nextFile) {
      return;
    }

    setBusy(true);

    try {
      const hash = await hashPickedFile(nextFile, algorithm);
      setResult({ hash, name: nextFile.name, size: nextFile.size });
    } catch {
      setError("This file could not be hashed on this device.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-6">
      <IntegrityDropzone
        busy={busy}
        description="Click or drag any file"
        label="Drop any file to fingerprint"
        onFile={(file) => void onFile(file)}
        testId="integrity-fingerprint-input"
      />
      {error ? (
        <p className="mt-4 text-sm text-red-700" role="status">
          {error}
        </p>
      ) : null}
      {result ? (
        <HashCard
          algorithm={algorithm}
          hash={result.hash}
          name={result.name}
          size={result.size}
          title="Local fingerprint"
        />
      ) : null}
    </section>
  );
}

function ComparePanel({ algorithm }: { algorithm: HashAlgorithm }) {
  const [left, setLeft] = useState<HashedFile | null>(null);
  const [right, setRight] = useState<HashedFile | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"left" | "right" | null>(null);

  async function onFile(side: "left" | "right", file: File | null) {
    setError("");

    if (!file) {
      return;
    }

    setBusy(side);

    try {
      const hashed = {
        hash: await hashPickedFile(file, algorithm),
        name: file.name,
        size: file.size,
      };

      if (side === "left") {
        setLeft(hashed);
      } else {
        setRight(hashed);
      }
    } catch {
      setError("One of the files could not be hashed on this device.");
    } finally {
      setBusy(null);
    }
  }

  const compared = left && right;
  const match = compared ? hashesMatch(left.hash, right.hash) : false;

  return (
    <section className="mt-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <IntegrityDropzone
          busy={busy === "left"}
          description="Original or trusted copy"
          label="File A"
          onFile={(file) => void onFile("left", file)}
          testId="integrity-compare-a"
        />
        <IntegrityDropzone
          busy={busy === "right"}
          description="Copy to check for tampering"
          label="File B"
          onFile={(file) => void onFile("right", file)}
          testId="integrity-compare-b"
        />
      </div>
      {error ? (
        <p className="mt-4 text-sm text-red-700" role="status">
          {error}
        </p>
      ) : null}
      {compared ? (
        <div
          className={cn(
            "mt-5 rounded-2xl border p-5",
            match
              ? "border-emerald-200 bg-emerald-50"
              : "border-red-200 bg-red-50",
          )}
          role="status"
        >
          <p className="font-black">
            {match
              ? "These files match"
              : "These files differ — possible tampering"}
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-700">
            {match
              ? "Both copies have the same hash. Bytes were not changed between them."
              : "The hashes are not equal. At least one byte is different, or they are different files."}
          </p>
          <dl className="mt-4 grid gap-3 text-xs break-all sm:grid-cols-2">
            <div>
              <dt className="font-bold text-zinc-500">{left.name}</dt>
              <dd className="mt-1 font-mono">{left.hash}</dd>
            </div>
            <div>
              <dt className="font-bold text-zinc-500">{right.name}</dt>
              <dd className="mt-1 font-mono">{right.hash}</dd>
            </div>
          </dl>
        </div>
      ) : null}
    </section>
  );
}

function VerifyPanel({ algorithm }: { algorithm: HashAlgorithm }) {
  const [result, setResult] = useState<HashedFile | null>(null);
  const [expected, setExpected] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const expectedId = useId();

  async function onFile(file: File | null) {
    setError("");
    setResult(null);

    if (!file) {
      return;
    }

    setBusy(true);

    try {
      const detected = algorithmForHashLength(expected) ?? algorithm;
      const hash = await hashPickedFile(file, detected);
      setResult({ hash, name: file.name, size: file.size });
    } catch {
      setError("This file could not be hashed on this device.");
    } finally {
      setBusy(false);
    }
  }

  const match = result ? hashesMatch(result.hash, expected) : false;

  return (
    <section className="mt-6">
      <label
        className="block text-sm font-bold text-zinc-950"
        htmlFor={expectedId}
      >
        Expected hash
        <textarea
          className="mt-2 min-h-24 w-full rounded-lg border border-zinc-300 bg-white p-3 font-mono text-xs outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100"
          id={expectedId}
          onChange={(event) => setExpected(event.target.value)}
          placeholder="Paste a SHA-256 or SHA-512 hex hash"
          value={expected}
        />
      </label>
      <div className="mt-4">
        <IntegrityDropzone
          busy={busy}
          description="The file to check against the hash"
          label="Drop the file to verify"
          onFile={onFile}
          testId="integrity-verify-input"
        />
      </div>
      {error ? (
        <p className="mt-4 text-sm text-red-700" role="status">
          {error}
        </p>
      ) : null}
      {result ? (
        <div
          className={cn(
            "mt-5 rounded-2xl border p-5",
            match
              ? "border-emerald-200 bg-emerald-50"
              : "border-red-200 bg-red-50",
          )}
          role="status"
        >
          <p className="font-black">
            {match ? "Hash matches" : "Hash does not match"}
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-700">
            {match
              ? "The file bytes produce the hash you pasted."
              : "The computed hash is different. Check the algorithm, or the file is not the original."}
          </p>
          <p className="mt-3 font-mono text-xs break-all">{result.hash}</p>
        </div>
      ) : null}
    </section>
  );
}

function HashCard({
  algorithm,
  hash,
  name,
  size,
  title,
}: {
  algorithm: HashAlgorithm;
  hash: string;
  name: string;
  size: number;
  title: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyHash() {
    try {
      await navigator.clipboard.writeText(hash);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <article className="mt-5 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <ShieldCheck aria-hidden="true" className="size-5 text-emerald-700" />
        <div>
          <h2 className="font-black">{title}</h2>
          <p className="mt-1 text-sm text-zinc-600">
            {name} · {formatFileSize(size)} · {algorithm}
          </p>
        </div>
      </div>
      <p className="mt-4 font-mono text-xs leading-6 break-all text-zinc-950">
        {hash}
      </p>
      <Button
        className="mt-4"
        onClick={() => void copyHash()}
        type="button"
        variant="secondary"
      >
        {copied ? "Copied" : "Copy hash"}
      </Button>
    </article>
  );
}

function IntegrityDropzone({
  busy,
  description,
  label,
  onFile,
  testId,
}: {
  busy: boolean;
  description: string;
  label: string;
  onFile: (file: File | null) => void;
  testId: string;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragActive(false);
    onFile(event.dataTransfer.files[0] ?? null);
  }

  return (
    <label
      className={cn(
        "flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white px-4 py-6 text-center transition",
        dragActive && "border-red-600 bg-red-50",
        busy && "opacity-70",
      )}
      htmlFor={inputId}
      onDragEnter={(event) => {
        event.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        setDragActive(false);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
    >
      <Upload aria-hidden="true" className="size-6 text-zinc-500" />
      <span className="mt-3 font-bold">
        {busy ? "Hashing locally…" : label}
      </span>
      <span className="mt-1 text-sm text-zinc-600">{description}</span>
      <input
        className="sr-only"
        data-testid={testId}
        id={inputId}
        onChange={(event) => {
          onFile(event.target.files?.[0] ?? null);
          event.target.value = "";
        }}
        ref={inputRef}
        type="file"
      />
    </label>
  );
}

async function hashPickedFile(file: File, algorithm: HashAlgorithm) {
  await validateFile(file, { acceptedTypes: ["any"] });
  return hashFile(file, algorithm);
}
