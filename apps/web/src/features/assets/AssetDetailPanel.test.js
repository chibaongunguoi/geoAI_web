import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import AssetDetailPanel from "./AssetDetailPanel";

const property = {
  id: "prop-1",
  code: "DN-BLD-001",
  name: "Tru so 1",
  addressLine: "01 Bach Dang",
  ward: "Hai Chau 1",
  district: "Hai Chau",
  status: "ACTIVE",
  propertyType: "building",
  areaSqm: 1250,
  centroidLat: 16.071,
  centroidLng: 108.22,
};

const auditLogs = [
  {
    id: "audit-1",
    action: "properties.update",
    actor: { username: "admin" },
    createdAt: "2026-05-09T09:00:00.000Z",
  },
];

beforeEach(() => {
  window.localStorage.clear();
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ ...property, status: "REVIEW" }),
  });
  global.URL.createObjectURL = jest.fn(() => "blob:mock");
  global.URL.revokeObjectURL = jest.fn();
});

describe("AssetDetailPanel", () => {
  it("renders property details, map preview, and audit timeline", () => {
    render(<AssetDetailPanel property={property} auditLogs={auditLogs} canManageProperties />);

    expect(screen.getByText("DN-BLD-001")).toBeInTheDocument();
    expect(screen.getByText("01 Bach Dang")).toBeInTheDocument();
    expect(screen.getByText("1.250 m2")).toBeInTheDocument();
    expect(screen.getAllByText("16.071, 108.22")).toHaveLength(2);
    expect(screen.getByText("properties.update")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Edit asset" })).toHaveAttribute(
      "href",
      "/assets/DN-BLD-001/edit",
    );
  });

  it("supports dossier tabs, status updates, local records, search, and export", async () => {
    render(<AssetDetailPanel property={property} auditLogs={auditLogs} canManageProperties />);

    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Missing required technical document.")).toBeInTheDocument();
    expect(screen.getByText("Missing inspection record.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Current status"), { target: { value: "REVIEW" } });
    fireEvent.click(screen.getByRole("button", { name: "Save status" }));
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/properties/prop-1",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ status: "REVIEW" }),
        }),
      ),
    );
    expect(await screen.findByText("Status saved.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Value date"), { target: { value: "2026-05-10" } });
    fireEvent.change(screen.getByLabelText("Asset value"), { target: { value: "1250000" } });
    fireEvent.change(screen.getByLabelText("Value note"), { target: { value: "Initial valuation" } });
    fireEvent.click(screen.getByRole("button", { name: "Add value" }));
    expect(screen.getByText("1,250,000")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Documents" }));
    fireEvent.change(screen.getByLabelText("Document name"), { target: { value: "Technical manual" } });
    fireEvent.change(screen.getByLabelText("Document type"), { target: { value: "technical" } });
    fireEvent.click(screen.getByRole("button", { name: "Add document" }));
    expect(screen.getByText("Technical manual")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Download metadata" }));
    expect(screen.getByText("File content not stored yet. Metadata exported.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Inspections" }));
    fireEvent.change(screen.getByLabelText("Inspection date"), { target: { value: "2026-05-11" } });
    fireEvent.change(screen.getByLabelText("Inspection result"), { target: { value: "Needs repair" } });
    fireEvent.change(screen.getByLabelText("Inspection notes"), { target: { value: "Crack near entrance" } });
    fireEvent.click(screen.getByRole("button", { name: "Add inspection" }));
    expect(screen.getByText("Needs repair")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Links" }));
    fireEvent.change(screen.getByLabelText("Link label"), { target: { value: "Supplier ACME" } });
    fireEvent.change(screen.getByLabelText("Link reference"), { target: { value: "Warranty-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Add link" }));
    expect(screen.getByText("Supplier ACME")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search dossier"), { target: { value: "acme" } });
    expect(screen.getByText("Search matched 1 item.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Timeline" }));
    expect(screen.getByText("properties.update")).toBeInTheDocument();
    expect(screen.getByText("Needs repair")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Export JSON" }));
    expect(screen.getByText("Dossier exported as JSON.")).toBeInTheDocument();
  });

  it("disables dossier mutation controls without manage permission", () => {
    render(<AssetDetailPanel property={property} auditLogs={[]} canManageProperties={false} />);

    expect(screen.queryByRole("link", { name: "Edit asset" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save status" })).toBeDisabled();
    fireEvent.click(screen.getByRole("tab", { name: "Documents" }));
    expect(screen.getByRole("button", { name: "Add document" })).toBeDisabled();
  });
});
