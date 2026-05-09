import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import FilterPanel from "./FilterPanel";

describe("FilterPanel", () => {
  it("renders controls and applies selected filters", () => {
    const onApply = jest.fn();
    render(
      <FilterPanel
        filters={{}}
        resultCount={12}
        canUseFilters
        onApply={onApply}
      />
    );

    fireEvent.change(screen.getByLabelText("Status"), {
      target: { value: "ACTIVE" }
    });
    fireEvent.change(screen.getByLabelText("Type"), {
      target: { value: "building" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));

    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "ACTIVE",
        propertyType: "building"
      }),
      "filters.apply"
    );
    expect(screen.getByText("12 results")).toBeInTheDocument();
  });

  it("resets, saves presets, loads presets, and exports", () => {
    const onApply = jest.fn();
    const onSavePreset = jest.fn();
    const onExport = jest.fn();
    render(
      <FilterPanel
        filters={{ status: "ACTIVE" }}
        presets={[{ name: "Active", filters: { status: "ACTIVE" } }]}
        canUseFilters
        onApply={onApply}
        onSavePreset={onSavePreset}
        onExport={onExport}
      />
    );

    fireEvent.change(screen.getByLabelText("Preset name"), {
      target: { value: "My preset" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Save preset" }));
    fireEvent.change(screen.getByLabelText("Saved presets"), {
      target: { value: "Active" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Reset filters" }));
    fireEvent.click(screen.getByRole("button", { name: "Export filtered data" }));

    expect(onSavePreset).toHaveBeenCalledWith("My preset", expect.any(Object));
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ status: "ACTIVE" }),
      "filters.preset.load"
    );
    expect(onApply).toHaveBeenLastCalledWith(expect.any(Object), "filters.reset");
    expect(onExport).toHaveBeenCalled();
  });

  it("disables filter actions when permission is missing", () => {
    render(<FilterPanel filters={{}} canUseFilters={false} />);

    expect(screen.getByRole("button", { name: "Apply filters" })).toBeDisabled();
    expect(screen.getByText("You do not have permission to use filters.")).toBeInTheDocument();
  });
});
