import { useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
pdfjsLib.GlobalWorkerOptions.workerSrc = `${process.env.PUBLIC_URL}/pdf.worker.min.js`;

function App() {
  const [transcript, setTranscript] = useState("");
  const [prompt, setPrompt] = useState("");
  const [summary, setSummary] = useState("");
  const [emails, setEmails] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailStatus, setEmailStatus] = useState("");

  // Download file helper
  const downloadTextFile = (filename, content) => {
    const element = document.createElement("a");
    const file = new Blob([content], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // PDF/Text file upload handler
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type === "application/pdf") {
        const text = await extractTextFromPDF(file);
        setTranscript(text);
      } else if (file.type === "text/plain") {
        const reader = new FileReader();
        reader.onload = (event) => {
          setTranscript(event.target.result);
        };
        reader.readAsText(file);
      } else {
        alert("Only .txt and .pdf files are supported");
      }
    }
  };

  // PDF extraction logic
  const extractTextFromPDF = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let textContent = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map((item) => item.str);
      textContent += strings.join(" ") + "\n\n";
    }
    return textContent;
  };

  const handleGenerateSummary = async () => {
    if (!transcript) {
      alert("Please enter the transcript.");
      return;
    }
    setLoading(true);
    setEmailStatus("");
    try {
      const response = await fetch("http://localhost:5000/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, prompt }),
      });
      const data = await response.json();
      if (response.ok) {
        setSummary(data.summary);
        setIsEditing(true);
      } else {
        alert(data.error || "Failed to generate summary");
      }
    } catch (error) {
      alert("Error connecting to backend");
    }
    setLoading(false);
  };

  const handleSendEmail = async () => {
    if (!summary || !emails) {
      alert("Please provide both summary and recipient email(s).");
      return;
    }
    setLoading(true);
    setEmailStatus("");
    try {
      const response = await fetch("http://localhost:5000/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary, emails }),
      });
      const data = await response.json();
      if (response.ok) {
        setEmailStatus("Email sent successfully!");
      } else {
        setEmailStatus(data.error || "Failed to send email");
      }
    } catch (error) {
      setEmailStatus("Error connecting to backend");
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 600, margin: "auto", padding: 20 }}>
      <h2>AI-Powered Meeting Notes Summarizer</h2>

      <div>
        <label>Upload Transcript (.txt or .pdf file):</label>
        <input
          type="file"
          accept=".txt,.pdf"
          onChange={handleFileUpload}
          style={{ marginBottom: 10 }}
        />
      </div>

      <div>
        <label>Paste Transcript:</label>
        <textarea
          rows={8}
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          style={{ width: "100%" }}
        />
      </div>

      <div style={{ marginTop: 10 }}>
        <label>Custom Instruction/Prompt:</label>
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          style={{ width: "100%", padding: "8px" }}
          placeholder="e.g. Summarize in bullet points for executives"
        />
      </div>

      <button
        style={{ marginTop: 20, width: "100%", padding: "12px" }}
        onClick={handleGenerateSummary}
        disabled={loading}
      >
        {loading ? "Generating..." : "Generate Summary"}
      </button>

      {isEditing && (
        <>
          <div style={{ marginTop: 20 }}>
            <label>Edit Summary:</label>
            <textarea
              rows={8}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              style={{ width: "100%" }}
            />
          </div>

          {/* Download Summary Button Only */}
          {summary && (
            <div style={{ marginTop: 10 }}>
              <button onClick={() => downloadTextFile("summary.txt", summary)}>
                Download Summary
              </button>
            </div>
          )}

          <div style={{ marginTop: 10 }}>
            <label>Recipient Email(s):</label>
            <input
              type="text"
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              style={{ width: "100%", padding: "8px" }}
              placeholder="email1@example.com, email2@example.com"
            />
          </div>

          <button
            style={{ marginTop: 20, width: "100%", padding: "12px" }}
            onClick={handleSendEmail}
            disabled={loading}
          >
            {loading ? "Sending..." : "Share via Email"}
          </button>

          {emailStatus && (
            <p style={{ marginTop: 10, color: "green" }}>{emailStatus}</p>
          )}
        </>
      )}
    </div>
  );
}

export default App;
