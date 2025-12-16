import React from 'react';

interface FormattedOutputProps {
    data: any;
    type: string;
}

export default function FormattedOutput({ data, type }: FormattedOutputProps) {
    if (!data) return null;

    // Handle array vs single object (API returns array filtered by chapter)
    // For some types (concepts, stories, inquiry, schemas), the array IS the list of items.
    // For others (priming, feynman, audio, video, quiz), the array contains 1 object which HAS the content.

    const items = Array.isArray(data) ? data : [data];
    if (items.length === 0) return <div className="text-gray-500 italic">No data found.</div>;

    // --- Renderers ---

    const renderConcepts = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map((concept: any, i: number) => (
                <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <h3 className="font-bold text-lg text-blue-600 mb-2">{concept.name}</h3>
                    <p className="text-sm text-gray-700 mb-2"><strong>Definition:</strong> {concept.definition}</p>
                    <p className="text-sm text-gray-600"><strong>Mechanism:</strong> {concept.mechanism}</p>
                </div>
            ))}
        </div>
    );

    const renderStories = () => (
        <div className="space-y-6">
            {items.map((story: any, i: number) => (
                <div key={i} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                    <h3 className="font-bold text-xl text-gray-900 mb-4">{story.title || 'Untitled Story'}</h3>
                    <div className="space-y-3">
                        <div className="flex gap-4">
                            <div className="w-24 font-semibold text-red-600 shrink-0">Struggle</div>
                            <div className="text-gray-700">{story.struggle}</div>
                        </div>
                        <div className="flex gap-4">
                            <div className="w-24 font-semibold text-yellow-600 shrink-0">Epiphany</div>
                            <div className="text-gray-700">{story.epiphany}</div>
                        </div>
                        <div className="flex gap-4">
                            <div className="w-24 font-semibold text-green-600 shrink-0">Victory</div>
                            <div className="text-gray-700">{story.victory}</div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );

    const renderPriming = () => (
        <div className="space-y-8">
            {items.map((item: any, i: number) => (
                <div key={i} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                    <div className="mb-6">
                        <h4 className="text-sm font-uppercase tracking-wider text-gray-500 mb-1">Hook</h4>
                        <p className="text-lg font-medium text-gray-900">{item.hook}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="text-sm font-uppercase tracking-wider text-gray-500 mb-2">Jargon</h4>
                            <ul className="space-y-2">
                                {item.jargon?.map((j: any, k: number) => (
                                    <li key={k} className="text-sm">
                                        <span className="font-semibold text-gray-800">{j.term}:</span> {j.definition}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-sm font-uppercase tracking-wider text-gray-500 mb-2">Knowledge Gaps</h4>
                            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                                {item.knowledge_gaps?.map((g: string, k: number) => (
                                    <li key={k}>{g}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );

    const renderInquiry = () => (
        <div className="space-y-4">
            {items.map((q: any, i: number) => (
                <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex gap-4">
                    <div className={`shrink-0 w-20 text-xs font-bold uppercase py-1 px-2 rounded text-center h-fit
            ${q.question_type === 'Skeptic' ? 'bg-red-100 text-red-800' :
                            q.question_type === 'Realist' ? 'bg-blue-100 text-blue-800' :
                                'bg-purple-100 text-purple-800'}`}>
                        {q.question_type}
                    </div>
                    <div>
                        <p className="font-medium text-gray-900 mb-1">{q.question}</p>
                        <p className="text-sm text-gray-500 italic">{q.context}</p>
                    </div>
                </div>
            ))}
        </div>
    );

    const renderSchemas = () => (
        <div className="space-y-6">
            {items.map((schema: any, i: number) => (
                <div key={i} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="font-bold text-lg text-gray-900">{schema.title}</h3>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{schema.type}</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">{schema.description}</p>
                    <pre className="bg-gray-50 p-4 rounded text-xs font-mono overflow-x-auto border border-gray-200">
                        {schema.mermaid_code}
                    </pre>
                </div>
            ))}
        </div>
    );

    const renderFeynman = () => (
        <div className="space-y-6">
            {items.map((item: any, i: number) => (
                <div key={i} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-4">
                    <div>
                        <h4 className="text-sm font-bold text-gray-500 uppercase">Thesis</h4>
                        <p className="text-lg text-gray-900">{item.thesis}</p>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-md border border-yellow-100">
                        <h4 className="text-sm font-bold text-yellow-800 uppercase mb-1">Analogy</h4>
                        <p className="text-yellow-900">{item.analogy}</p>
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-gray-500 uppercase">ELI12</h4>
                        <p className="text-gray-700">{item.eli12}</p>
                    </div>
                </div>
            ))}
        </div>
    );

    const renderAudio = () => (
        <div className="space-y-8">
            {items.map((script: any, i: number) => (
                <div key={i} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                    <div className="bg-gray-50 p-4 border-b border-gray-200">
                        <h3 className="font-bold text-gray-900">{script.title}</h3>
                        <p className="text-xs text-gray-500">{script.duration_minutes} min listen</p>
                    </div>
                    <div className="p-6 space-y-4">
                        {script.dialogue?.map((line: any, k: number) => (
                            <div key={k} className={`flex gap-4 ${line.speaker === 'Alex' ? 'flex-row' : 'flex-row-reverse'}`}>
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                  ${line.speaker === 'Alex' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                    {line.speaker[0]}
                                </div>
                                <div className={`p-3 rounded-2xl max-w-[80%] text-sm
                  ${line.speaker === 'Alex' ? 'bg-gray-100 text-gray-800 rounded-tl-none' : 'bg-blue-50 text-blue-900 rounded-tr-none'}`}>
                                    {line.text}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );

    const renderVideo = () => (
        <div className="space-y-8">
            {items.map((script: any, i: number) => (
                <div key={i} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                    <div className="bg-gray-50 p-4 border-b border-gray-200">
                        <h3 className="font-bold text-gray-900">{script.title}</h3>
                        <p className="text-xs text-gray-500">{script.duration_minutes} min watch</p>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {script.scenes?.map((scene: any, k: number) => (
                            <div key={k} className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-1">
                                    <span className="text-xs font-bold text-gray-400 uppercase mb-1 block">Scene {scene.scene_number}</span>
                                    <p className="text-sm text-gray-600 italic">{scene.visual_description}</p>
                                </div>
                                <div className="md:col-span-2 pl-4 border-l border-gray-100">
                                    <span className="text-xs font-bold text-gray-400 uppercase mb-1 block">Narration</span>
                                    <p className="text-sm text-gray-900">{scene.narration}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );

    const renderQuizzes = () => (
        <div className="space-y-8">
            {items.map((quizSet: any, i: number) => (
                <div key={i} className="space-y-6">
                    {quizSet.questions?.map((q: any, k: number) => (
                        <div key={k} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                            <div className="flex justify-between mb-3">
                                <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded uppercase">{q.type}</span>
                            </div>
                            <h3 className="font-medium text-lg text-gray-900 mb-4">{q.question}</h3>
                            <div className="space-y-2 mb-4">
                                {q.options?.map((opt: string, j: number) => (
                                    <div key={j} className={`p-3 rounded border text-sm
                    ${opt === q.correct_answer ? 'border-green-200 bg-green-50 text-green-800' : 'border-gray-200 text-gray-700'}`}>
                                        {opt}
                                        {opt === q.correct_answer && <span className="float-right text-green-600 font-bold">✓</span>}
                                    </div>
                                ))}
                            </div>
                            <div className="bg-blue-50 p-3 rounded text-sm text-blue-800">
                                <strong>Explanation:</strong> {q.explanation}
                            </div>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );

    // --- Switcher ---

    switch (type) {
        case 'concepts': return renderConcepts();
        case 'stories': return renderStories();
        case 'priming': return renderPriming();
        case 'inquiry': return renderInquiry();
        case 'schemas': return renderSchemas();
        case 'feynman': return renderFeynman();
        case 'audio_scripts': return renderAudio();
        case 'video_scripts': return renderVideo();
        case 'quizzes': return renderQuizzes();
        default: return <div className="text-gray-500">No formatter for this type.</div>;
    }
}
