import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "@/app/page";

describe("Home", () => {
  it("renders the privacy-first homepage message", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /clean, redact, and share without uploading/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/nothing is sent to a server/i),
    ).toBeInTheDocument();
  });
});
