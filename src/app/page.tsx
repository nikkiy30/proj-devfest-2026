import { DiagnoseForm } from "./diagnose-form";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-16">
      <h1 className="text-2xl font-bold">血の気が多い診断</h1>
      <DiagnoseForm />
      <p className="text-xs text-zinc-500">
        ※ この診断はジョークです。医学的な根拠はありません。
      </p>
    </main>
  );
}
