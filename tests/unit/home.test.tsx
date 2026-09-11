import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "@/app/page";

describe("Home", () => {
  it("renders the Phase 1 foundation message", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { level: 1, name: "PDFForge" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/process documents locally/i)).toBeInTheDocument();
  });
});
