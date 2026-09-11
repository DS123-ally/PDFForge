import { FileText } from "lucide-react";

import { Button } from "@/components/ui/button";

type FileUploaderProps = {
  multiple?: boolean;
};

export function FileUploader({ multiple = false }: FileUploaderProps) {
  return (
    <section
      aria-labelledby="file-uploader-title"
      className="rounded-2xl border-2 border-dashed border-red-500 px-6 py-8 text-center sm:py-9"
    >
      <span className="mx-auto grid size-12 place-items-center rounded-xl bg-red-50 text-red-600">
        <FileText aria-hidden="true" className="size-5" />
      </span>
      <h2 id="file-uploader-title" className="mt-3 text-base font-bold">
        {multiple ? "Drop your PDF files here" : "Drop your file here"}
      </h2>
      <Button className="mt-3" disabled type="button">
        {multiple ? "Select PDF Files" : "Select a File"}
      </Button>
      <p className="mt-2 text-xs text-zinc-500">
        or drag and drop · PDF files only
      </p>
      <p className="sr-only">
        File selection becomes available in the local file pipeline phase.
      </p>
    </section>
  );
}
