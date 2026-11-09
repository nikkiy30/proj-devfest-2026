import "server-only";
import { GoogleGenAI } from "@google/genai";

// サーバー側だけで使う。"server-only" により、ブラウザ向けのコードから import するとビルドが失敗する。
let client: GoogleGenAI | null = null;

export function getGemini(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY が設定されていません（.env.local を確認）");
  }
  client ??= new GoogleGenAI({ apiKey });
  return client;
}

export const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
