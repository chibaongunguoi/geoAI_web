export class ReportService {
  static async uploadImage(file) {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData
    });
    if (!res.ok) throw new Error("Failed to upload image");
    return res.json();
  }

  static async createReport(data) {
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error("Failed to create report");
    return res.json();
  }

  static async getReports(status = "") {
    const res = await fetch(`/api/reports${status ? `?status=${status}` : ""}`);
    if (!res.ok) throw new Error("Failed to get reports");
    return res.json();
  }

  static async receiveReport(id) {
    const res = await fetch(`/api/reports/${id}/receive`, {
      method: "PATCH"
    });
    if (!res.ok) throw new Error("Failed to receive report");
    return res.json();
  }

  static async respondToReport(id, responseMessage) {
    const res = await fetch(`/api/reports/${id}/respond`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ responseMessage })
    });
    if (!res.ok) throw new Error("Failed to respond");
    return res.json();
  }

  static async resolveReport(id) {
    const res = await fetch(`/api/reports/${id}/resolve`, {
      method: "PATCH"
    });
    if (!res.ok) throw new Error("Failed to resolve");
    return res.json();
  }
}
