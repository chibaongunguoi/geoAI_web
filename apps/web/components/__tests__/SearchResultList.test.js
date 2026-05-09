import { render, screen, fireEvent } from "@testing-library/react";
import SearchResultList from "../SearchResultList";
import "@testing-library/jest-dom";

describe("SearchResultList", () => {
  const mockResults = [
    {
      id: "1",
      code: "DN-OVT-123",
      name: "Tòa nhà Alpha",
      addressLine: "123 Nguyễn Lương Bằng",
      ward: "Hòa Khánh Bắc",
      district: "Liên Chiểu",
      city: "Đà Nẵng",
      status: "ACTIVE",
      propertyType: "building"
    },
    {
      id: "2",
      code: "DN-OVT-456",
      name: null,
      addressLine: null,
      ward: "Hòa Minh",
      district: "Liên Chiểu",
      city: "Đà Nẵng",
      status: "ACTIVE",
      propertyType: "building"
    }
  ];

  it("renders empty state when no results", () => {
    render(<SearchResultList results={[]} />);
    expect(screen.getByText("Không tìm thấy kết quả")).toBeInTheDocument();
  });

  it("renders empty state when results is null", () => {
    render(<SearchResultList results={null} />);
    expect(screen.getByText("Không tìm thấy kết quả")).toBeInTheDocument();
  });

  it("renders list of results", () => {
    render(<SearchResultList results={mockResults} />);
    
    // Check titles
    expect(screen.getByText("Danh sách kết quả (2)")).toBeInTheDocument();
    
    // Check item 1
    expect(screen.getByText("Tòa nhà Alpha")).toBeInTheDocument();
    expect(screen.getByText("DN-OVT-123")).toBeInTheDocument();
    expect(screen.getByText("123 Nguyễn Lương Bằng, Hòa Khánh Bắc, Liên Chiểu, Đà Nẵng")).toBeInTheDocument();
    
    // Check item 2 (fallback text for missing name/address)
    expect(screen.getByText("Công trình chưa có tên")).toBeInTheDocument();
    expect(screen.getByText("Hòa Minh, Liên Chiểu, Đà Nẵng")).toBeInTheDocument();
  });

  it("calls onSelectResult when an item is clicked", () => {
    const handleSelect = jest.fn();
    render(<SearchResultList results={mockResults} onSelectResult={handleSelect} />);
    
    const firstItem = screen.getByText("Tòa nhà Alpha").closest("li");
    fireEvent.click(firstItem);
    
    expect(handleSelect).toHaveBeenCalledTimes(1);
    expect(handleSelect).toHaveBeenCalledWith(mockResults[0]);
  });
});
