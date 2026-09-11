import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ToolDirectory } from "@/components/tools/tool-directory";

describe("ToolDirectory", () => {
  it("filters tools by search text", async () => {
    const user = userEvent.setup();
    render(<ToolDirectory />);

    await user.type(
      screen.getByRole("searchbox", { name: "Search PDF tools" }),
      "metadata",
    );

    expect(
      screen.getByRole("heading", { name: "Remove Metadata" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Merge PDF" }),
    ).not.toBeInTheDocument();
  });
});
