import Link from "next/link";
import { Brand } from "@/components/brand";
import styles from "./home.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Brand />
        <span className={styles.headerNote}>気持ちに、ちいさな寄り道。</span>
      </header>
      <main className={styles.main}>
        <section className={styles.hero} aria-labelledby="home-title">
          <p className={styles.eyebrow}>A LITTLE ROOM FOR YOUR FEELINGS</p>
          <h1 id="home-title">
            いまの気持ちに、
            <br />
            ちょうどいい寄り道を。
          </h1>
          <p className={styles.intro}>
            うまく言えない日も、ちょっとモヤモヤする日も。
            <br />
            気になるカードから、ひと息ついていきませんか。
          </p>
          <span className={styles.doodle} aria-hidden="true">
            ☺
          </span>
        </section>
        <section aria-labelledby="experiences-title">
          <div className={styles.sectionHeading}>
            <h2 id="experiences-title">気持ちから、選んでみる</h2>
            <span>EXPERIENCES</span>
          </div>
          <div className={styles.cards}>
            <Link href="/experiences/chinoke" className={styles.activeCard}>
              <div className={styles.cardTop}>
                <span className={styles.badge}>10秒で、すっきり気分</span>
                <span aria-hidden="true">↗</span>
              </div>
              <div className={styles.drop} aria-hidden="true">
                🩸
              </div>
              <p className={styles.cardEyebrow}>ちょっと、吐き出したいとき</p>
              <h3>血の気が多い診断</h3>
              <p className={styles.cardDescription}>
                言いたいこと、10秒だけ。
                <br />
                声にして、気持ちを外に出してみよう。
              </p>
              <div className={styles.cardBottom}>
                <span>マイク使用 · 音声は保存しません</span>
                <span className={styles.cardArrow} aria-hidden="true">
                  →
                </span>
              </div>
            </Link>
            {[1, 2].map((number) => (
              <article className={styles.upcomingCard} key={number}>
                <span className={styles.comingSoon}>準備中</span>
                <span className={styles.upcomingIcon} aria-hidden="true">
                  {number === 1 ? "✳" : "☁"}
                </span>
                <h3>次の寄り道を、準備しています。</h3>
                <p>
                  いろんな気持ちに寄り添う体験を、
                  <br />
                  少しずつ増やしていきます。
                </p>
              </article>
            ))}
          </div>
        </section>
        <aside className={styles.note}>
          <span aria-hidden="true">✦</span>
          <p>
            ちゃんとした答えが出なくても、大丈夫。
            <br />
            ここは、気持ちをちょっとほどく場所です。
          </p>
        </aside>
      </main>
      <footer className={styles.footer}>
        <span>お気持ちAI（仮名）</span>
        <p>
          現在の体験ではAIを使用していません。医療・心理相談を行うサービスではありません。
        </p>
      </footer>
    </div>
  );
}
