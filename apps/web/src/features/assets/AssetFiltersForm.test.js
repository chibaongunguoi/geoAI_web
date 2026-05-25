import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import AssetFiltersForm from "./AssetFiltersForm";

describe("AssetFiltersForm", () => {
  it("renders simple asset filters without date inputs", () => {
    render(<AssetFiltersForm filters={{ query: "", status: "", propertyType: "", district: "", ward: "" }} />);

    expect(screen.getByPlaceholderText("Tìm theo mã, tên, đường hoặc địa chỉ")).toBeInTheDocument();
    expect(screen.getByLabelText("Quận/Huyện")).toHaveRole("combobox");
    expect(screen.getByLabelText("Phường/Xã")).toBeDisabled();
    expect(screen.queryByLabelText("Từ ngày")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Đến ngày")).not.toBeInTheDocument();
  });

  it("enables ward options after selecting a district", () => {
    render(<AssetFiltersForm filters={{ district: "", ward: "" }} />);

    fireEvent.change(screen.getByLabelText("Quận/Huyện"), {
      target: { value: "Liên Chiểu" }
    });

    expect(screen.getByLabelText("Phường/Xã")).not.toBeDisabled();
    expect(screen.getByRole("option", { name: "Hòa Khánh Bắc" })).toBeInTheDocument();
  });
});
