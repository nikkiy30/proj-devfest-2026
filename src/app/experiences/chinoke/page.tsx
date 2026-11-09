import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { ChinokeExperience } from "./experience";
import styles from "./chinoke.module.css";

export const metadata: Metadata = {
  title: "血の気が多い診断",
  description:
    "言いたいこと、10秒だけ全部吐き出そう。音声は録音・保存・送信しません。",
};

export default function ChinokePage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Brand />
        <Link href="/" className={styles.back}>
          ← 体験を選ぶ
        </Link>
      </header>
      <main className={styles.main}>
        <div className={styles.hero}>
          <p className={styles.eyebrow}>CHINOKE SHINDAN</p>
          <h1>
            血の気が多い診断 <span aria-hidden="true">🩸</span>
          </h1>
          <p className={styles.sub}>
            言いたいこと、10秒だけ全部吐き出そう。
            <br />
            誰かに聞かせる必要はありません。
          </p>
        </div>
        <ChinokeExperience />
        <footer className={styles.foot}>
          <p>
            この体験と血の気レベルは遊びの演出で、医学的・心理学的な測定ではありません。献血に怒りを減らす医学的効果があることを示すものではありません。
          </p>
          <p>
            音声は録音・保存・文字起こし・送信しません。端末内で音量の変化だけを取得します。入力した文章やタグも保存・送信しません。現在AIは使用していません。
          </p>
          <p>
            マイク利用にはブラウザの許可が必要です。大声を出す必要はありません。周囲に配慮して、普通の声で利用できます。
          </p>
          <Link href="/">← ホームで、ほかの体験を探す</Link>
        </footer>
      </main>
    </div>
  );
}
