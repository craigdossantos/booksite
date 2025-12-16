'use client';

import { useState, useEffect } from 'react';
import FormattedOutput from './components/FormattedOutput';

interface Book {
  id: string;
  title: string;
}

export default function Dashboard() {
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useState<string>('');
  const [chapters, setChapters] = useState<string[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<string>('');
  const [output, setOutput] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string>('');
  const [activeStageType, setActiveStageType] = useState<string>('');

  // Load books on mount
  useEffect(() => {
    fetch('/api/books')
      .then(res => res.json())
      .then(data => {
        setBooks(data.books || []);
        if (data.books?.length > 0) setSelectedBook(data.books[0].id);
      });
  }, []);

  // Load chapters when book changes
  useEffect(() => {
    if (!selectedBook) return;
    fetch(`/api/books/${selectedBook}/chapters`)
      .then(res => res.json())
      .then(data => {
        setChapters(data.chapters || []);
        if (data.chapters?.length > 0) setSelectedChapter(data.chapters[0]);
      });
  }, [selectedBook]);

  const stages = [
    { id: 'extract_concepts', label: '2a. Concepts', type: 'concepts' },
    { id: 'extract_stories', label: '2b. Stories', type: 'stories' },
    { id: 'generate_priming', label: '2c. Priming', type: 'priming' },
    { id: 'generate_inquiry', label: '2d. Inquiry', type: 'inquiry' },
    { id: 'generate_schemas', label: '3a. Schemas', type: 'schemas' },
    { id: 'generate_feynman', label: '3c. Feynman', type: 'feynman' },
    { id: 'generate_audio_scripts', label: '5b. Audio', type: 'audio_scripts' },
    { id: 'generate_video_scripts', label: '5c. Video', type: 'video_scripts' },
    { id: 'generate_quizzes', label: '5d. Quizzes', type: 'quizzes' },
  ];

  const viewResult = async (resultType: string) => {
    setLoading(true);
    setLogs(`Fetching results for ${resultType}...\n`);
    setOutput(null);
    setActiveStageType(resultType);

    try {
      const resultRes = await fetch(`/api/results?bookId=${selectedBook}&type=${resultType}&chapter=${selectedChapter}`);
      const resultData = await resultRes.json();

      if (Array.isArray(resultData) && resultData.length === 0) {
        setLogs(prev => prev + `No results found. Try running the stage first.\n`);
      } else {
        setLogs(prev => prev + `Loaded results.\n`);
      }

      setOutput(resultData);
    } catch (err) {
      console.error(err);
      setLogs(prev => prev + `Failed to fetch results.\n`);
    } finally {
      setLoading(false);
    }
  };

  const executeStage = async (stageId: string, resultType: string) => {
    setLoading(true);
    setLogs(`Running ${stageId} on ${selectedChapter}...\n`);
    setOutput(null);
    setActiveStageType(resultType);

    try {
      // 1. Run Script
      const runRes = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script: stageId,
          bookId: selectedBook,
          chapter: selectedChapter
        })
      });

      const runData = await runRes.json();

      if (runData.error) {
        setLogs(prev => prev + `Error: ${runData.error}\n`);
        setLoading(false);
        return;
      }

      setLogs(prev => prev + `Success!\n${runData.stdout}\n`);

      // 2. Fetch Results
      // After running, automatically view the results
      await viewResult(resultType);

    } catch (err) {
      console.error(err);
      setLogs(prev => prev + `Failed to run stage.\n`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Pipeline Playground</h1>
          <p className="text-gray-600">Test individual pipeline stages on specific chapters.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Controls */}
          <div className="space-y-6">

            {/* Book Selection */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Book</label>
              <select
                value={selectedBook}
                onChange={(e) => setSelectedBook(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-900"
              >
                {books.map(book => (
                  <option key={book.id} value={book.id}>{book.title}</option>
                ))}
              </select>
            </div>

            {/* Chapter Selection */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Chapter</label>
              <select
                value={selectedChapter}
                onChange={(e) => setSelectedChapter(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-900 mb-4"
              >
                {chapters.map(chapter => (
                  <option key={chapter} value={chapter}>{chapter}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500">
                Only this chapter will be processed.
              </p>
            </div>

            {/* Stage Selection */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <label className="block text-sm font-medium text-gray-700 mb-4">Run Stage</label>
              <div className="grid grid-cols-1 gap-2">
                {stages.map(stage => (
                  <div key={stage.id} className="flex gap-2">
                    <button
                      onClick={() => viewResult(stage.type)}
                      disabled={loading}
                      className={`flex-1 px-4 py-2 text-left text-sm font-medium rounded-md transition-colors disabled:opacity-50
                        ${activeStageType === stage.type
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'text-gray-700 bg-gray-50 hover:bg-gray-100'}`}
                    >
                      {stage.label}
                    </button>
                    <button
                      onClick={() => executeStage(stage.id, stage.type)}
                      disabled={loading}
                      title="Rerun Script"
                      className="px-3 py-2 text-gray-500 bg-gray-50 hover:bg-red-50 hover:text-red-600 rounded-md transition-colors disabled:opacity-50 border border-transparent hover:border-red-200"
                    >
                      ↻
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-2 space-y-6">

            {/* Formatted Output */}
            {output && !loading && (
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">Formatted Result</h2>
                  <span className="text-xs font-mono text-gray-400 uppercase">{activeStageType}</span>
                </div>
                <FormattedOutput data={output} type={activeStageType} />
              </div>
            )}

            {/* Logs */}
            <div className="bg-gray-900 text-green-400 p-4 rounded-xl shadow-sm font-mono text-xs h-32 overflow-y-auto whitespace-pre-wrap">
              {logs || '// Ready to run...'}
            </div>

            {/* Raw JSON Preview */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Raw JSON</h2>
                {output && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                    {Array.isArray(output) ? `${output.length} items` : 'Object'}
                  </span>
                )}
              </div>

              {loading ? (
                <div className="flex items-center justify-center h-32 text-gray-400 animate-pulse">
                  Processing...
                </div>
              ) : output ? (
                <div className="prose prose-sm max-w-none">
                  <pre className="bg-gray-50 p-4 rounded-md overflow-x-auto text-xs text-gray-800 border border-gray-200 max-h-96">
                    {JSON.stringify(output, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="flex items-center justify-center h-32 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                  Select a stage to view results
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
