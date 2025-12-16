"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ProcessButton({ filename }: { filename: string }) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleProcess = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/process-book", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ filename }),
            });

            if (!res.ok) {
                throw new Error("Failed to process book");
            }

            const data = await res.json();
            alert("Book processed successfully!");
            router.refresh(); // Refresh to show the new processed book in the list
        } catch (error) {
            console.error(error);
            alert("Error processing book. Check console for details.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleProcess}
            disabled={loading}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${loading
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
        >
            {loading ? "Processing..." : "Generate Study Guide"}
        </button>
    );
}
