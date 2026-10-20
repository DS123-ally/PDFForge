import { FormatLogo, formatLogos } from "@/components/home/format-logos";
import { SectionHeading } from "@/components/home/section-heading";

export function HomeFormats() {
  return (
    <section
      aria-labelledby="formats-title"
      className="bg-white px-5 py-16 sm:px-8 sm:py-20"
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="Files"
          id="formats-title"
          title="The formats already on this device"
        >
          PDFForge reads and writes these files in the browser. It does not
          connect to Drive, Slack, or a cloud account.
        </SectionHeading>
        <ul className="mt-12 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4 lg:grid-cols-8">
          {formatLogos.map((format) => (
            <li className="text-center" key={format.name}>
              <FormatLogo className="mx-auto" name={format.name} />
              <p className="mt-3 text-sm font-medium">{format.name}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {format.detail}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
