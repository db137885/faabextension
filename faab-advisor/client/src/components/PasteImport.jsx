import { useState, useCallback } from 'react';
import DataPreview from './DataPreview.jsx';

export default function PasteImport({ leagueId, onDataReady, expectedType }) {
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState(null);
  const [detectedType, setDetectedType] = useState(null);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleParse = useCallback(async () => {
    if (!text.trim()) return;

    setLoading(true);
    setErrors([]);
    setParsed(null);

    try {
      // Create parsed structures for the preview UI
      let rowsPreview = [];
      let headers = [];

      const payloadType = expectedType === 'roster' ? 'roster' : 'freeAgents';

      // We'll simulate rows to make DataPreview happy, but we are effectively done importing since
      // the backend `/paste` endpoint actually *saves* the data inside it!
      const lines = text.trim().split('\n');
      if (lines.length > 0) {
         headers = lines[0].split(/\t|\s{2,}/);
         rowsPreview = lines.slice(1, 10).map(l => {
           let r = {};
           l.split(/\t|\s{2,}/).forEach((col, i) => r[headers[i] || `col_${i}`] = col);
           return r;
         });
      }

      setDetectedType(payloadType);
      setParsed({ rows: rowsPreview, headers, rawText: text });

      // If everything went somewhat okay, we can pretend "onDataReady" is just letting the parent 
      // component know that "paste parser ran successfully and data is ready"
      // Since our new backend /paste logic saves the data immediately, we can just say to the parent
      // that we are ready to move on.
      onDataReady(text, expectedType, rowsPreview);

    } catch (err) {
      setErrors([err.message || 'Failed to parse pasted data']);
    } finally {
      setLoading(false);
    }
  }, [text, leagueId, expectedType, onDataReady]);

  return (
    <div className="space-y-4">
      <div className="text-sm text-slate-400">
        Paste any tabular data (copied right off the web page). 
        Our Smart Parser will automatically extract the entities.
      </div>

      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Select the table on the website, press Ctrl+C, and Paste here..."
        rows={8}
        className="w-full bg-navy-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 font-mono resize-y focus:outline-none focus:border-amber-500 placeholder:text-slate-600"
      />

      <div className="flex items-center gap-3">
        <button
          onClick={handleParse}
          disabled={!text.trim() || loading}
          className="bg-slate-700 hover:bg-slate-600 text-slate-100 px-4 py-2 rounded text-sm transition-colors disabled:opacity-40"
        >
          {loading ? 'Parsing...' : 'Analyze & Prepare'}
        </button>
      </div>

      {parsed && rowsPreview && rowsPreview.length > 0 && (
        <DataPreview
          rows={parsed.rows}
          type={detectedType}
          errors={errors}
        />
      )}
    </div>
  );
}
