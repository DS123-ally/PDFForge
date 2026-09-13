import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FileUploader } from "@/components/pdf/file-uploader";

describe("FileUploader", () => {
  beforeEach(() => {
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:local-preview"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("adds and removes selected local files", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <FileUploader acceptedTypes={["image"]} multiple />,
    );
    const input =
      container.querySelector<HTMLInputElement>("input[type='file']");
    const file = new File(["image"], "receipt.png", { type: "image/png" });

    expect(input).not.toBeNull();
    fireEvent.change(input!, { target: { files: [file] } });

    expect(await screen.findByText("1 file ready")).toBeInTheDocument();
    expect(screen.getByText("receipt.png")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /remove receipt.png/i }),
    );

    await waitFor(() => {
      expect(screen.queryByText("receipt.png")).not.toBeInTheDocument();
    });
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:local-preview");
  });

  it("reorders selected files with keyboard controls", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <FileUploader acceptedTypes={["image"]} allowReorder multiple />,
    );
    const input =
      container.querySelector<HTMLInputElement>("input[type='file']");
    const first = new File(["one"], "alpha.png", { type: "image/png" });
    const second = new File(["two"], "beta.png", { type: "image/png" });

    fireEvent.change(input!, { target: { files: [first, second] } });

    expect(await screen.findByText("2 files ready")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /move alpha.png down/i }),
    );

    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("beta.png");
    expect(items[1]).toHaveTextContent("alpha.png");
  });
});
