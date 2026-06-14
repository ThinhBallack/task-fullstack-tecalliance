import { useState, useMemo, useEffect } from "react";
import type { UploadResponse, HistoryItem } from "./types";

export default function App() {
  const [activeTab, setActiveTab] = useState<"upload" | "history">("upload");
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const [result, setResult] = useState<UploadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<string>("all");

  // Fetch upload history from backend
  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/history");
      if (res.ok) {
        setHistory(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch history:", err);
    }
  };

  // Auto load history when switching to History tab
  useEffect(() => {
    if (activeTab === "history") {
      fetchHistory();
    }
  }, [activeTab]);

  // Handle file upload
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setFilterSeverity("all"); // Reset filter for new upload

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail || `Upload failed (${res.status})`);
      }
      setResult(await res.json());

      // Auto refresh history in the background after successful upload
      fetchHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  // Calculate and sort validation data based on current filter
  const processedValidations = useMemo(() => {
    if (!result) return [];

    let filtered = result.validations;

    // Filter by Severity
    if (filterSeverity !== "all") {
      filtered = filtered.filter((v) => v.severity === filterSeverity);
    }

    // Sort: Error (top) -> Warning -> Info. If same, sort by Code.
    const severityWeight: Record<string, number> = { error: 3, warning: 2, info: 1 };
    return filtered.sort((a, b) => {
      if (severityWeight[a.severity] !== severityWeight[b.severity]) {
        return severityWeight[b.severity] - severityWeight[a.severity];
      }
      return (a.code || "").localeCompare(b.code || "");
    });
  }, [result, filterSeverity]);

  // Function to export data to CSV file
  const exportToCSV = () => {
    if (processedValidations.length === 0) return;

    // Create headers
    const headers = ["Severity", "Code", "Message", "Validator"];

    // Create rows of data (remember to wrap Message in quotes to avoid comma errors)
    const rows = processedValidations.map(v => {
      const escapedMessage = v.message.replace(/"/g, '""'); // Handle double quotes within the string
      return [
        v.severity,
        v.code || "",
        `"${escapedMessage}"`,
        v.validator
      ].join(",");
    });

    // Combine into complete CSV content
    const csvContent = [headers.join(","), ...rows].join("\n");

    // Create blob and trigger browser download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;

    // Set the file name with the original file name to make it easier to manage
    const fileName = result?.filename ? `validations_${result.filename}.csv` : "validation_results.csv";
    link.setAttribute("download", fileName);

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper for text coloring
  const getSeverityTextColor = (severity: string) => {
    switch (severity) {
      case "error": return "#d32f2f";
      case "warning": return "#f57c00";
      case "info": return "#0288d1";
      default: return "#333";
    }
  };

  return (
    <div style={{ maxWidth: 960, margin: "2rem auto", fontFamily: "system-ui" }}>
      <h1>Torque Specification Validator</h1>

      {/* ── Navigation Tabs ── */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", borderBottom: "2px solid #eee" }}>
        <button
          onClick={() => setActiveTab("upload")}
          style={{
            padding: "0.5rem 1rem", border: "none", background: "none", fontSize: "16px", cursor: "pointer",
            borderBottom: activeTab === "upload" ? "3px solid #007bff" : "3px solid transparent",
            fontWeight: activeTab === "upload" ? "bold" : "normal", color: activeTab === "upload" ? "#007bff" : "#555"
          }}
        >
          New Upload
        </button>
        <button
          onClick={() => setActiveTab("history")}
          style={{
            padding: "0.5rem 1rem", border: "none", background: "none", fontSize: "16px", cursor: "pointer",
            borderBottom: activeTab === "history" ? "3px solid #007bff" : "3px solid transparent",
            fontWeight: activeTab === "history" ? "bold" : "normal", color: activeTab === "history" ? "#007bff" : "#555"
          }}
        >
          Upload History
        </button>
      </div>

      {/* ── VIEW: UPLOAD ── */}
      {activeTab === "upload" && (
        <div>
          {/* UPLOAD BUTTON SECTION */}
          <div style={{ marginBottom: "2rem", padding: "1rem", background: "#f5f5f5", borderRadius: "8px" }}>
            <input type="file" accept=".xml" onChange={handleUpload} disabled={loading} />
            {loading && <span style={{ marginLeft: "1rem", color: "#666" }}>Processing file…</span>}
          </div>

          {error && <p style={{ color: "red", fontWeight: "bold" }}>{error}</p>}

          {result && (
            <>
              {/* File Header Information */}
              <div style={{ borderBottom: "2px solid #eee", paddingBottom: "1rem", marginBottom: "2rem" }}>
                <h2>{result.filename}</h2>
                <p style={{ color: "#666" }}>Document date: <strong>{result.document_date ?? "—"}</strong></p>
              </div>

              {/* Validation Results Table with Filter */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h3 style={{ margin: 0 }}>
                  Validation Results ({processedValidations.length} {filterSeverity !== 'all' && `of ${result.validations.length}`})
                </h3>
                {result.validations.length > 0 && (
                  <div>
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

                    <button
                      onClick={exportToCSV}
                      disabled={processedValidations.length === 0}
                      style={{
                        padding: "6px 16px", borderRadius: "4px", border: "none",
                        background: processedValidations.length === 0 ? "#ccc" : "#28a745",
                        color: "white", fontWeight: "bold", cursor: processedValidations.length === 0 ? "not-allowed" : "pointer"
                      }}
                    >
                      Export CSV
                    </button>
                  </div>
                )}
              </div>

              {/* Render validation issues or success state */}
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

              {/* Extracted Data Table */}
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
      )}

      {/* ── VIEW: HISTORY ── */}
      {activeTab === "history" && (
        <div>
          <h2>Previous Uploads</h2>
          {history.length === 0 ? (
            <p style={{ color: "#666", fontStyle: "italic" }}>No history found. Try uploading a file first.</p>
          ) : (
            <table border={1} cellPadding={10} style={{ borderCollapse: "collapse", width: "100%", textAlign: "left" }}>
              <thead style={{ background: "#f8f9fa" }}>
                <tr>
                  <th>Time</th>
                  <th>Filename</th>
                  <th>Doc Date</th>
                  <th>Total Issues</th>
                  <th>Errors</th>
                  <th>Warnings</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id}>
                    <td>{new Date(h.upload_time).toLocaleString()}</td>
                    <td style={{ fontWeight: "500" }}>{h.filename}</td>
                    <td>{h.document_date ?? "—"}</td>
                    <td>{h.total_issues}</td>
                    <td style={{ color: h.error_count > 0 ? "#d32f2f" : "inherit", fontWeight: h.error_count > 0 ? "bold" : "normal" }}>
                      {h.error_count}
                    </td>
                    <td style={{ color: h.warning_count > 0 ? "#f57c00" : "inherit", fontWeight: h.warning_count > 0 ? "bold" : "normal" }}>
                      {h.warning_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}