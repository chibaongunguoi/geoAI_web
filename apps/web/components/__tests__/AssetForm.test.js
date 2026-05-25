import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import AssetForm from "../AssetForm";

describe("AssetForm", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("creates a property with form values", async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ id: "prop-1", code: "DN-BLD-100" })
    });

    const onSaved = jest.fn();
    render(<AssetForm mode="create" onSaved={onSaved} />);

    fireEvent.change(screen.getByLabelText("Mã tài sản"), { target: { value: "DN-BLD-100" } });
    fireEvent.change(screen.getByLabelText("Tên tài sản"), { target: { value: "Trung tâm dữ liệu" } });
    fireEvent.change(screen.getByLabelText("Quận"), { target: { value: "Hải Châu" } });
    fireEvent.change(screen.getByLabelText("Phường"), { target: { value: "Hải Châu I" } });
    fireEvent.change(screen.getByLabelText("Vĩ độ"), { target: { value: "16.071" } });
    fireEvent.change(screen.getByLabelText("Kinh độ"), { target: { value: "108.22" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu tài sản" }));

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

    expect(fetch).toHaveBeenCalledWith("/api/properties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: expect.any(String)
    });
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({
      code: "DN-BLD-100",
      name: "Trung tâm dữ liệu",
      ward: "Hải Châu I",
      district: "Hải Châu",
      centroidLat: 16.071,
      centroidLng: 108.22
    });
    expect(onSaved).toHaveBeenCalledWith("/assets/DN-BLD-100");
  });

  it("updates an existing property by id", async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ id: "prop-2", code: "DN-BLD-200" })
    });

    render(
      <AssetForm
        mode="edit"
        property={{
          id: "prop-2",
          code: "DN-BLD-200",
          name: "Nhà làm việc",
          status: "ACTIVE",
          propertyType: "building"
        }}
        onSaved={jest.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText("Tên tài sản"), { target: { value: "Nhà làm việc A" } });
    fireEvent.change(screen.getByLabelText("Trạng thái"), { target: { value: "REVIEW" } });
    fireEvent.click(screen.getByRole("button", { name: "Cập nhật tài sản" }));

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

    expect(fetch).toHaveBeenCalledWith("/api/properties/prop-2", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: expect.any(String)
    });
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({
      name: "Nhà làm việc A",
      status: "REVIEW"
    });
  });
});
