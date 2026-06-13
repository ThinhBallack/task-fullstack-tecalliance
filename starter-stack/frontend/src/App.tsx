import { useState, useMemo } from "react";
import type { UploadResponse } from "./types";

export default function App() {
  const [result, setResult] = useState<UploadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // State mới cho bộ lọc mức độ nghiêm trọng
  const [filterSeverity, setFilterSeverity] = useState<string>("all");

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setFilterSeverity("all"); // Reset filter khi upload file mới

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail || `Upload failed (${res.status})`);
      }
      setResult(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  // Tính toán dữ liệu hiển thị (Lọc và Sắp xếp)
  const processedValidations = useMemo(() => {
    if (!result) return [];

    let filtered = result.validations;

    // 1. Lọc theo Severity
    if (filterSeverity !== "all") {
      filtered = filtered.filter((v) => v.severity === filterSeverity);
    }

    // 2. Sắp xếp: Error lên đầu -> Warning -> Info. Nếu cùng loại thì xếp theo Code.
    const severityWeight: Record<string, number> = { error: 3, warning: 2, info: 1 };

    return filtered.sort((a, b) => {
      if (severityWeight[a.severity] !== severityWeight[b.severity]) {
        return severityWeight[b.severity] - severityWeight[a.severity];
      }
      const codeA = a.code || "";
      const codeB = b.code || "";
      return codeA.localeCompare(codeB);
    });
  }, [result, filterSeverity]);

  // Hàm hỗ trợ UI màu chữ
  const getSeverityTextColor = (severity: string) => {
    switch (severity) {
      case "error": return "#d32f2f"; // Đỏ đậm
      case "warning": return "#f57c00"; // Cam đậm
      case "info": return "#0288d1"; // Xanh đậm
      default: return "#333";
    }
  };

  return (
    <div style={{ maxWidth: 960, margin: "2rem auto", fontFamily: "system-ui" }}>
      <h1>Torque Specification Validator</h1>

      <div style={{ marginBottom: "2rem", padding: "1rem", background: "#f5f5f5", borderRadius: "8px" }}>
        <input type="file" accept=".xml" onChange={handleUpload} disabled={loading} />
        {loading && <span style={{ marginLeft: "1rem", color: "#666" }}>Processing file…</span>}
      </div>

      {error && <p style={{ color: "red", fontWeight: "bold" }}>{error}</p>}

      {result && (
        <>
          <div style={{ borderBottom: "2px solid #eee", paddingBottom: "1rem", marginBottom: "2rem" }}>
            <h2>{result.filename}</h2>
            <p style={{ color: "#666" }}>Document date: <strong>{result.document_date ?? "—"}</strong></p>
          </div>

          {/* ── Validation Results ── */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ margin: 0 }}>
              Validation Results ({processedValidations.length} {filterSeverity !== 'all' && `of ${result.validations.length}`})
            </h3>

            {/* Bộ lọc Dropdown */}
            {result.validations.length > 0 && (
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                style={{ padding: "6px 12px", borderRadius: "4px", border: "1px solid #ccc" }}
              >
                <option value="all">All Severities</option>
                <option value="error">Errors Only</option>
                <option value="warning">Warnings Only</option>
                <option value="info">Info Only</option>
              </select>
            )}
          </div>

          {result.validations.length === 0 ? (
            <div style={{ padding: "1rem", background: "#e8f5e9", color: "#2e7d32", borderRadius: "4px" }}>
              ✅ No issues found. The data looks perfectly fine.
            </div>
          ) : processedValidations.length === 0 ? (
            <p style={{ color: "#666", fontStyle: "italic" }}>No validations match the current filter.</p>
          ) : (
            <table border={1} cellPadding={10} style={{ borderCollapse: "collapse", width: "100%", marginBottom: "3rem", textAlign: "left" }}>
              <thead style={{ background: "#f8f9fa" }}>
                <tr>
                  <th>Severity</th>
                  <th>Code</th>
                  <th>Message</th>
                  <th>Validator Rule</th>
                </tr>
              </thead>
              <tbody>
                {processedValidations.map((v, i) => (
                  <tr key={i} style={{
                    background: v.severity === "error" ? "#ffebee" : v.severity === "warning" ? "#fff3e0" : "#e1f5fe",
                  }}>
                    <td style={{ fontWeight: "bold", color: getSeverityTextColor(v.severity) }}>
                      {v.severity.toUpperCase()}
                    </td>
                    <td style={{ fontWeight: "500" }}>{v.code ?? "—"}</td>
                    <td>{v.message}</td>
                    <td><code style={{ background: "rgba(255,255,255,0.5)", padding: "2px 6px", borderRadius: "4px" }}>{v.validator}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* ── Extracted Data Table ── */}
          <h3 style={{ borderBottom: "1px solid #eee", paddingBottom: "0.5rem" }}>
            Extracted Data ({result.addresses.length} entries)
          </h3>
          <div style={{ overflowX: "auto", maxHeight: "400px" }}>
            <table border={1} cellPadding={8} style={{ borderCollapse: "collapse", width: "100%", fontSize: "14px", textAlign: "left" }}>
              <thead style={{ background: "#f8f9fa", position: "sticky", top: 0 }}>
                <tr>
                  <th>Code</th>
                  <th>Torque (Nm)</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {result.addresses.map((a, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: "500" }}>{a.code}</td>
                    <td>{a.torque ?? "—"}</td>
                    <td>{a.start_date ?? "—"}</td>
                    <td>{a.end_date ?? "—"}</td>
                    <td style={{ color: "#555" }}>{a.notes ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}