// src/pages/Report.jsx

export default function Report({ data, onBack }) {
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Report</h1>

      <div className="rounded border p-4">
        <pre className="whitespace-pre-wrap text-sm">
          {JSON.stringify(data || { note: "Noch keine Daten" }, null, 2)}
        </pre>
      </div>

      <button className="px-4 py-2 rounded border" onClick={onBack}>
        ← Zurück
      </button>
    </div>
  );
}
