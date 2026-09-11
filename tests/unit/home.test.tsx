import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "@/app/page";

describe("Home", () => {
  it("renders the privacy-first homepage message", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /edit pdfs directly in your browser/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/process documents locally/i)).toBeInTheDocument();
  });
});
