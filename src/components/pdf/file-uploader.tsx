import { FileText } from "lucide-react";

import { Button } from "@/components/ui/button";

type FileUploaderProps = {
  multiple?: boolean;
};

export function FileUploader({ multiple = false }: FileUploaderProps) {
  return (
    <section
      aria-labelledby="file-uploader-title"
      className="rounded-2xl border-2 border-dashed border-red-500 px-6 py-12 text-center sm:py-14"
    >
      <span className="mx-auto grid size-14 place-items-center rounded-xl bg-red-50 text-red-600">
        <FileText aria-hidden="true" className="size-6" />
      </span>
      <h2 id="file-uploader-title" className="mt-5 text-lg font-bold">
        {multiple ? "Drop your PDF files here" : "Drop your file here"}
      </h2>
      <Button className="mt-4" disabled type="button">
        {multiple ? "Select PDF Files" : "Select a File"}
      </Button>
      <p className="mt-3 text-sm text-zinc-500">
        or drag and drop · PDF files only
      </p>
      <p className="sr-only">
        File selection becomes available in the local file pipeline phase.
      </p>
    </section>
  );
}
