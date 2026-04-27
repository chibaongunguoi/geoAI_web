import { fireEvent, render, screen } from "@testing-library/react";
import CollapsibleSection from "./CollapsibleSection";

describe("CollapsibleSection", () => {
  it("hides content until the section is opened", () => {
    render(
      <CollapsibleSection title="Scan settings" summary="Area and scan mode">
        <label htmlFor="scan-mode">Scan mode</label>
        <input id="scan-mode" />
      </CollapsibleSection>
    );

    expect(screen.getByRole("button", { name: /Scan settings/ })).toHaveAttribute(
      "aria-expanded",
      "false"
    );
    expect(screen.queryByLabelText("Scan mode")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Scan settings/ }));

    expect(screen.getByRole("button", { name: /Scan settings/ })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
    expect(screen.getByLabelText("Scan mode")).toBeInTheDocument();
  });

  it("can render open by default", () => {
    render(
      <CollapsibleSection title="Primary controls" defaultOpen>
        <button type="button">Run</button>
      </CollapsibleSection>
    );

    expect(screen.getByRole("button", { name: /Primary controls/ })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
    expect(screen.getByRole("button", { name: "Run" })).toBeInTheDocument();
  });
});
