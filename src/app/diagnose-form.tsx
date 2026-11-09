"use client";

import { useState } from "react";

export function DiagnoseForm() {
  const [text, setText] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setResult("");
    try {
      const res = await fetch("/api/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = (await res.json()) as { result?: string; error?: string };
      setResult(data.result ?? data.error ?? "");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={1000}
        rows={5}
        placeholder="ムカついたことを書き殴ってください"
        className="rounded-md border border-zinc-300 p-3"
      />
      <button
        type="submit"
        disabled={loading || !text.trim()}
        className="rounded-md bg-red-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
      >
        {loading ? "診断中…" : "診断する"}
      </button>
      {result && <p className="whitespace-pre-wrap">{result}</p>}
    </form>
  );
}
