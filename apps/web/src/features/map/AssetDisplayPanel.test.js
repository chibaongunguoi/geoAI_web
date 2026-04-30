import { fireEvent, render, screen } from "@testing-library/react";
import AssetDisplayPanel from "./AssetDisplayPanel";
import { createDefaultAssetDisplayConfig } from "./assets";

describe("AssetDisplayPanel", () => {
  it("updates label mode, color mode, popup fields, and export action", () => {
    const onConfigChange = jest.fn();
    const onExport = jest.fn();

    render(
      <AssetDisplayPanel
        config={createDefaultAssetDisplayConfig()}
        permissions={["assets.importExport"]}
        status="Saved"
        history={[
          {
            id: "log-1",
            action: "map.assets.config.update",
            createdAt: "2026-04-30T00:00:00.000Z"
          }
        ]}
        visibleAssetCount={3}
        onConfigChange={onConfigChange}
        onExport={onExport}
      />
    );

    fireEvent.change(screen.getByLabelText(/Nhãn tài sản/), {
      target: { value: "code" }
    });
    fireEvent.change(screen.getByLabelText(/Tô màu/), {
      target: { value: "priority" }
    });
    fireEvent.click(screen.getByRole("checkbox", { name: /Đơn vị quản lý/ }));
    fireEvent.click(screen.getByRole("button", { name: /Xuất tài sản/ }));

    expect(onConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({ labelMode: "code" })
    );
    expect(onConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({ colorMode: "priority" })
    );
    expect(onConfigChange).toHaveBeenCalled();
    expect(onExport).toHaveBeenCalled();
    expect(screen.getByText("Saved")).toBeInTheDocument();
    expect(screen.getByText("map.assets.config.update")).toBeInTheDocument();
  });

  it("hides advanced fields and disables export for regular users", () => {
    render(
      <AssetDisplayPanel
        config={createDefaultAssetDisplayConfig()}
        permissions={[]}
        visibleAssetCount={1}
        onConfigChange={jest.fn()}
        onExport={jest.fn()}
      />
    );

    expect(screen.queryByRole("checkbox", { name: /Đơn vị quản lý/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Xuất tài sản/ })).toBeDisabled();
  });

  it("renders visible asset display errors", () => {
    render(
      <AssetDisplayPanel
        config={createDefaultAssetDisplayConfig()}
        permissions={["assets.importExport"]}
        error="Không tải được tài sản"
        visibleAssetCount={0}
        onConfigChange={jest.fn()}
        onExport={jest.fn()}
      />
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Không tải được tài sản");
  });
});
