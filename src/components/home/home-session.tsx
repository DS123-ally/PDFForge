import { CheckCircle2 } from "lucide-react";

import { SectionHeading } from "@/components/home/section-heading";
import { Card, CardContent } from "@/components/ui/card";

const steps = [
  {
    body: "Choose a PDF, image, or Office file from this device. The check happens in the tab.",
    title: "Drop the file",
  },
  {
    body: "Merge, redact, convert, or lock it in a browser worker. The document is not sent to a server.",
    title: "Run the tool here",
  },
  {
    body: "Save the result with your browser download. PDFForge does not keep a copy.",
    title: "Download the result",
  },
  {
    body: "Clear the session when you are done. Closing the tab drops the files from memory.",
    title: "Clear the session",
  },
] as const;

const guarantees = [
  "100% local processing",
  "No signup or tracking",
  "No document uploads",
  "No watermarks",
];

export function HomeSession() {
  return (
    <section
      aria-labelledby="session-title"
      className="px-5 py-16 sm:px-8 sm:py-20"
    >
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
        <div>
          <SectionHeading
            eyebrow="What a session looks like"
            id="session-title"
            title="Follow one file through the tab"
          >
            There is no customer video and no account story. This is the path
            every file takes.
          </SectionHeading>
          <ol className="mt-8 grid gap-3 sm:grid-cols-2">
            {steps.map((step, index) => (
              <li key={step.title}>
                <Card className="bg-card h-full" size="sm">
                  <CardContent>
                    <p className="text-primary text-sm font-semibold">
                      {index + 1}
                    </p>
                    <h3 className="mt-2 font-semibold">{step.title}</h3>
                    <p className="text-muted-foreground mt-1 leading-6">
                      {step.body}
                    </p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ol>
        </div>
        <Card className="bg-card shadow-sm">
          <CardContent>
            <h3 className="text-lg font-semibold">What never happens</h3>
            <ul className="mt-4 space-y-1">
              {guarantees.map((point) => (
                <li
                  className="flex min-h-11 items-center gap-3 text-sm font-medium"
                  key={point}
                >
                  <CheckCircle2
                    aria-hidden="true"
                    className="size-5 shrink-0 text-emerald-600"
                  />
                  {point}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
