"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  categories,
  chooseReply,
  playfulScore,
  resolveCategory,
  type Category,
  type CategoryChoice,
} from "@/lib/chinoke";
import styles from "./chinoke.module.css";

const DURATION = 10_000;
const CIRCUMFERENCE = 2 * Math.PI * 90;
const BARS = Array.from({ length: 17 }, (_, index) => index);
type Phase = "idle" | "requesting" | "recording" | "result";
type Result = {
  score: number;
  reply: string;
  category: Category;
  demo: boolean;
  early: boolean;
};

function microphoneError(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "SecurityError")
      return "マイクを使うにはブラウザの許可が必要です。サイトのマイク設定をご確認ください。デモは許可なしで試せます。";
    if (error.name === "NotFoundError")
      return "マイクが見つかりません。接続を確認するか、デモで体験してください。";
    if (error.name === "NotReadableError")
      return "マイクを開始できません。ほかのアプリで使用中でないか確認してください。";
  }
  return "この環境ではマイクを開始できませんでした。HTTPSでの接続とブラウザの対応状況を確認するか、デモで体験してください。";
}

export function ChinokeExperience() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [choice, setChoice] = useState<CategoryChoice>("auto");
  const [text, setText] = useState("");
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const resources = useRef({
    stream: null as MediaStream | null,
    context: null as AudioContext | null,
    raf: 0,
    token: 0,
    active: false,
    pending: false,
    started: 0,
    previous: 0,
    energy: 0,
    sampledMs: 0,
  });
  const count = useRef<HTMLSpanElement>(null);
  const progress = useRef<SVGCircleElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const bars = useRef<(HTMLSpanElement | null)[]>([]);
  const resultPanel = useRef<HTMLElement>(null);
  const startButton = useRef<HTMLButtonElement>(null);
  const busy = phase === "requesting" || phase === "recording";

  const release = useCallback(() => {
    const r = resources.current;
    r.token++;
    r.active = false;
    r.pending = false;
    cancelAnimationFrame(r.raf);
    r.stream?.getTracks().forEach((track) => track.stop());
    r.stream = null;
    if (r.context && r.context.state !== "closed")
      void r.context.close().catch(() => {});
    r.context = null;
  }, []);

  const resetVisuals = useCallback(() => {
    if (count.current) count.current.textContent = "10.0";
    if (progress.current)
      progress.current.style.strokeDashoffset = String(CIRCUMFERENCE);
    stage.current?.style.setProperty("--pulse", "1");
    bars.current.forEach((bar) => {
      if (bar) bar.style.height = "8px";
    });
  }, []);

  useEffect(() => {
    // Leaving or hiding the page ends the session, including a pending prompt.
    // A late getUserMedia resolution is discarded by the token in start().
    const stop = () => {
      if (!resources.current.active && !resources.current.pending) return;
      release();
      resetVisuals();
      setPhase("idle");
      setStatus("画面を離れたため中止しました。音声は保存されていません。");
    };
    const visibility = () => {
      if (document.hidden) stop();
    };
    window.addEventListener("pagehide", stop);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("pagehide", stop);
      document.removeEventListener("visibilitychange", visibility);
      release();
    };
  }, [release, resetVisuals]);

  useEffect(() => {
    if (phase !== "result") return;
    resultPanel.current?.focus({ preventScroll: true });
    resultPanel.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "nearest",
    });
  }, [phase]);

  function complete() {
    const r = resources.current;
    if (!r.active) return;
    const early = performance.now() - r.started < DURATION;
    const category = resolveCategory(choice, text);
    const score = playfulScore(r.sampledMs ? r.energy / r.sampledMs : 0);
    release();
    setResult({
      score,
      reply: chooseReply(category),
      category,
      demo: false,
      early,
    });
    setPhase("result");
    setStatus(
      early
        ? "ここまでの吐き出し、おつかれさま。"
        : "10秒の吐き出し、おつかれさま。",
    );
  }

  async function start() {
    const r = resources.current;
    if (r.active || r.pending) return;
    release();
    const token = r.token;
    r.pending = true;
    setResult(null);
    setPhase("requesting");
    setStatus("マイクへのアクセスを確認しています…");
    resetVisuals();
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("unsupported");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      if (r.token !== token) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      r.stream = stream;
      const context = new AudioContext();
      r.context = context;
      await context.resume();
      if (r.token !== token) return;
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      // Never connect to context.destination: no microphone playback/feedback.
      const data = new Uint8Array(analyser.fftSize);
      r.active = true;
      r.pending = false;
      r.energy = 0;
      r.sampledMs = 0;
      r.started = r.previous = performance.now();
      setPhase("recording");
      setStatus("音量だけに反応しています。音声は保存していません。");
      const frame = (now: number) => {
        if (!r.active || r.token !== token) return;
        const elapsed = Math.min(DURATION, now - r.started);
        const dt = Math.max(
          0,
          Math.min(now - r.previous, DURATION - (r.previous - r.started)),
        );
        r.previous = now;
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (const value of data) sum += ((value - 128) / 128) ** 2;
        const volume = Math.min(1, Math.sqrt(sum / data.length) * 5);
        r.energy += volume * dt;
        r.sampledMs += dt;
        if (count.current)
          count.current.textContent = ((DURATION - elapsed) / 1000).toFixed(1);
        if (progress.current)
          progress.current.style.strokeDashoffset = String(
            CIRCUMFERENCE * (1 - elapsed / DURATION),
          );
        const reducedMotion = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;
        stage.current?.style.setProperty(
          "--pulse",
          String(reducedMotion ? 1 : 1 + volume * 0.1),
        );
        bars.current.forEach((bar, i) => {
          if (bar)
            bar.style.height = `${8 + volume * 38 * (reducedMotion ? 0.6 : 0.45 + 0.55 * Math.abs(Math.sin(i * 0.74 + now / 150)))}px`;
        });
        if (elapsed >= DURATION) {
          complete();
          return;
        }
        r.raf = requestAnimationFrame(frame);
      };
      r.raf = requestAnimationFrame(frame);
    } catch (error) {
      if (r.token !== token) return;
      release();
      setPhase("idle");
      setStatus(microphoneError(error));
    }
  }

  function cancel() {
    release();
    resetVisuals();
    setPhase("idle");
    setStatus("中止しました。音声は保存されていません。");
    requestAnimationFrame(() => startButton.current?.focus());
  }

  function demo() {
    release();
    const category = resolveCategory(choice, text);
    setResult({
      score: 87,
      category,
      reply: chooseReply(category),
      demo: true,
      early: false,
    });
    setPhase("result");
    setStatus("デモ表示中。87%はサンプル値です。マイクは使用していません。");
  }

  return (
    <>
      {phase !== "result" && (
        <section className={styles.panel} aria-label="10秒の吐き出し体験">
          <fieldset className={styles.topics} disabled={busy}>
            <legend>
              いまのモヤモヤは？ <span>任意</span>
            </legend>
            <div className={styles.tags}>
              {[{ id: "auto", label: "おまかせ" }, ...categories].map(
                (category) => (
                  <label
                    className={`${styles.tag} ${choice === category.id ? styles.selected : ""}`}
                    key={category.id}
                  >
                    <input
                      type="radio"
                      name="topic"
                      value={category.id}
                      checked={choice === category.id}
                      onChange={() => setChoice(category.id as CategoryChoice)}
                    />
                    {category.label}
                  </label>
                ),
              )}
            </div>
          </fieldset>
          <details className={styles.textOption}>
            <summary>
              ひとことで書いてみる <span>任意</span>
            </summary>
            <label htmlFor="feeling" className={styles.textLabel}>
              いまの気持ち
            </label>
            <textarea
              id="feeling"
              rows={2}
              maxLength={500}
              value={text}
              disabled={busy}
              onChange={(event) => setText(event.target.value)}
              placeholder="例：バイトのシフトが急に変わってモヤモヤ…"
              aria-describedby="local-text-note"
            />
            <p id="local-text-note">
              「おまかせ」では入力した言葉を手がかりに返答を選びます。入力内容は保存・送信しません。
            </p>
          </details>
          <div
            className={`${styles.stage} ${phase === "recording" ? styles.active : ""}`}
            ref={stage}
          >
            <div className={styles.halo} />
            <svg
              viewBox="0 0 200 200"
              className={styles.ring}
              aria-hidden="true"
            >
              <circle cx="100" cy="100" r="90" className={styles.track} />
              <circle
                ref={progress}
                cx="100"
                cy="100"
                r="90"
                className={styles.progress}
                style={{
                  strokeDasharray: CIRCUMFERENCE,
                  strokeDashoffset: CIRCUMFERENCE,
                }}
              />
            </svg>
            <div className={styles.timer}>
              <span className={styles.time} ref={count}>
                10.0
              </span>
              <span className={styles.unit}>秒</span>
            </div>
          </div>
          <div className={styles.waves} aria-hidden="true">
            {BARS.map((i) => (
              <span
                key={i}
                ref={(node) => {
                  bars.current[i] = node;
                }}
              />
            ))}
          </div>
          <p className={styles.hint}>
            {phase === "recording" ? (
              <>
                今だけは、遠慮しなくて大丈夫。
                <br />
                普通の声で、言葉にしてみよう。
              </>
            ) : (
              <>
                スマホやパソコンに向かって、話してみて。
                <br />
                声の大きさに合わせて画面が反応するよ。
              </>
            )}
          </p>
          {!busy && (
            <button
              className={styles.primary}
              onClick={start}
              ref={startButton}
            >
              🎙️ 10秒間、吐き出す
            </button>
          )}
          {!busy && (
            <button className={styles.demo} onClick={demo}>
              マイクを使わず、デモを試す <span aria-hidden="true">→</span>
            </button>
          )}
          {busy && (
            <div className={styles.actions}>
              {phase === "recording" && (
                <button className={styles.secondary} onClick={complete}>
                  ここで終わる
                </button>
              )}
              <button className={styles.secondary} onClick={cancel}>
                {phase === "requesting" ? "マイクの開始をやめる" : "中止する"}
              </button>
            </div>
          )}
        </section>
      )}
      <p className={styles.status} role="status" aria-live="polite">
        {status}
      </p>
      {phase === "result" && result && (
        <section
          className={`${styles.panel} ${styles.result}`}
          aria-labelledby="result-title"
          tabIndex={-1}
          ref={resultPanel}
        >
          <p className={styles.eyebrow} id="result-title">
            {result.demo ? "デモの診断結果" : "血の気診断 結果"}
          </p>
          <p className={styles.sub}>
            {result.demo
              ? "こんな結果が表示されます。"
              : "吐き出し、おつかれさま。"}
          </p>
          <div className={styles.resultDrop} aria-hidden="true">
            🩸
          </div>
          <p className={styles.score}>
            {result.score}
            <span>%</span>
          </p>
          <p className={styles.scoreLabel}>
            血の気レベル{result.demo ? "（サンプル値）" : "（遊びの演出です）"}
          </p>
          <span className={styles.resultCategory}>
            {
              categories.find((category) => category.id === result.category)
                ?.label
            }
          </span>
          <p className={styles.quote}>{result.reply}</p>
          <p className={styles.invitation}>
            その勢い、誰かを助けるきっかけに。
            <br />
            献血について知ってみませんか？
          </p>
          <a
            className={styles.donation}
            href="https://www.jrc.or.jp/donation/"
            target="_blank"
            rel="noopener noreferrer"
          >
            献血について知る <span aria-hidden="true">↗</span>
            <span className={styles.visuallyHidden}>
              （日本赤十字社のサイトを新しいタブで開く）
            </span>
          </a>
          <p className={styles.small}>
            献血は誰かのために血液を提供する行動です。
            <br />
            体調や献血の基準を確認して、無理のない範囲で。
          </p>
          <button
            className={styles.secondary}
            onClick={() => {
              setResult(null);
              setText("");
              setPhase("idle");
              setStatus("もう一度、いつでも始められます。");
              requestAnimationFrame(() => startButton.current?.focus());
            }}
          >
            もう一度、吐き出す
          </button>
          {result.early && (
            <p className={styles.small}>
              途中で終了した時点の音量を使った演出です。
            </p>
          )}
        </section>
      )}
    </>
  );
}
