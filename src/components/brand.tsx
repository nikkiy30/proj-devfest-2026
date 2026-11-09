import Link from "next/link";

export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="お気持ちAI（仮名） ホーム">
      <span className="brand-mark" aria-hidden="true">
        o.
      </span>
      <span>
        お気持ちAI<span className="brand-provisional">（仮名）</span>
      </span>
    </Link>
  );
}
