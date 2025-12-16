interface DeepDiveViewProps {
    view: string;
    data: unknown;
}

interface Concept {
    name: string;
    definition: string;
    mechanism: string;
    context: string;
}

interface FeynmanItem {
    source_chapter: string;
    thesis: string;
    analogy: string;
    eli12: string;
    why_it_matters: string;
}

export default function DeepDiveView({ view, data }: DeepDiveViewProps) {
    if (!data) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500">No content generated for this section yet.</p>
            </div>
        );
    }

    // Render Concepts View
    if (view === 'concepts') {
        const concepts = data as Concept[];
        return (
            <div className="space-y-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Summary of Concepts</h2>
                <div className="grid gap-6">
                    {Array.isArray(concepts) && concepts.map((concept, index) => (
                        <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="text-xl font-semibold text-gray-800 mb-2">{concept.name}</h3>
                            <p className="text-gray-600 mb-4">{concept.definition}</p>

                            <div className="bg-blue-50 p-4 rounded-lg mb-4">
                                <h4 className="text-sm font-semibold text-blue-900 mb-1">Mechanism</h4>
                                <p className="text-sm text-blue-800">{concept.mechanism}</p>
                            </div>

                            <div>
                                <h4 className="text-sm font-semibold text-gray-700 mb-1">Context</h4>
                                <p className="text-sm text-gray-600">{concept.context}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Render Feynman View
    if (view === 'feynman') {
        const feynmanItems = data as FeynmanItem[];
        return (
            <div className="space-y-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Feynman Technique</h2>
                <div className="space-y-12">
                    {Array.isArray(feynmanItems) && feynmanItems.map((item, index) => (
                        <div key={index} className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
                            <div className="border-b border-gray-100 pb-4 mb-6">
                                <h3 className="text-2xl font-bold text-gray-800">{item.source_chapter}</h3>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Thesis</h4>
                                    <p className="text-lg text-gray-900 font-medium">{item.thesis}</p>
                                </div>

                                <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-100">
                                    <h4 className="text-sm font-bold text-yellow-800 uppercase tracking-wider mb-2">Analogy</h4>
                                    <p className="text-gray-800 italic">&quot;{item.analogy}&quot;</p>
                                </div>

                                <div>
                                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">ELI12 Explanation</h4>
                                    <p className="text-gray-700 leading-relaxed">{item.eli12}</p>
                                </div>

                                <div>
                                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Why It Matters</h4>
                                    <p className="text-gray-700">{item.why_it_matters}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Default JSON dump for other views (for now)
    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-900 capitalize">{view.replace(/_/g, ' ')}</h2>
            <div className="bg-gray-900 text-gray-100 p-6 rounded-xl overflow-x-auto">
                <pre className="text-sm font-mono">
                    {JSON.stringify(data, null, 2)}
                </pre>
            </div>
        </div>
    );
}
