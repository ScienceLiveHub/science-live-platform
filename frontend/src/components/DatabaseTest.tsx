import { useState, useEffect } from "react";

export function DatabaseTest() {
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    testDatabase();
  }, []);

  async function testDatabase() {
    try {
      const response = await fetch("/users/test");
      const result = await response.json();

      if (result.success) {
        setStatus("success");
        setData(result);
      } else {
        setStatus("error");
        setError(result.error);
      }
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  return (
    <div
      style={{
        padding: "2rem",
        border: "2px solid #ddd",
        borderRadius: "8px",
        marginTop: "2rem",
        backgroundColor:
          status === "success"
            ? "#f0fdf4"
            : status === "error"
              ? "#fef2f2"
              : "#f9fafb",
      }}
    >
      <h2>Database Connection Test</h2>

      {status === "loading" && <p>Testing database connection...</p>}

      {status === "success" && data && (
        <div style={{ color: "#166534" }}>
          <p style={{ fontSize: "1.2rem", fontWeight: "bold" }}>
            ✅ {data.message}
          </p>
          <div
            style={{
              marginTop: "1rem",
              backgroundColor: "white",
              padding: "1rem",
              borderRadius: "4px",
            }}
          >
            <h3>Test User Data:</h3>
            <ul style={{ listStyle: "none", padding: 0 }}>
              <li>
                <strong>Name:</strong> {data.user.display_name}
              </li>
              <li>
                <strong>ORCID:</strong> {data.user.orcid_id}
              </li>
              <li>
                <strong>Credits:</strong> {data.user.credit_balance}
              </li>
              <li>
                <strong>Created:</strong>{" "}
                {new Date(data.user.created_at).toLocaleDateString()}
              </li>
            </ul>
          </div>
        </div>
      )}

      {status === "error" && (
        <div style={{ color: "#dc2626" }}>
          <p style={{ fontSize: "1.2rem", fontWeight: "bold" }}>
            ❌ Database Connection Failed
          </p>
          <p
            style={{
              marginTop: "1rem",
              backgroundColor: "white",
              padding: "1rem",
              borderRadius: "4px",
            }}
          >
            Error: {error}
          </p>
        </div>
      )}
    </div>
  );
}
