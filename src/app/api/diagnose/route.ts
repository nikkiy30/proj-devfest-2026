import { getGemini, GEMINI_MODEL } from "@/lib/gemini";

// 環境構築の疎通確認用の最小実装。プロンプトや出力形式はチームで作り込む。
const MAX_LENGTH = 1000;

const SYSTEM_INSTRUCTION = `あなたは「血の気が多い診断」のキャラクターです。
ユーザーの愚痴を否定せずユーモアを交えて受け止め、最後に献血をすすめるオチをつけてください。
これはジョークであり、献血で怒りが収まるといった医学的な主張は絶対にしないでください。`;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    text?: unknown;
  } | null;
  const text = typeof body?.text === "string" ? body.text.trim() : "";

  if (!text) {
    return Response.json({ error: "text は必須です" }, { status: 400 });
  }
  if (text.length > MAX_LENGTH) {
    return Response.json(
      { error: `${MAX_LENGTH}文字以内で入力してください` },
      { status: 400 },
    );
  }

  try {
    const response = await getGemini().models.generateContent({
      model: GEMINI_MODEL,
      contents: text,
      config: { systemInstruction: SYSTEM_INSTRUCTION },
    });
    return Response.json({ result: response.text ?? "" });
  } catch (error) {
    console.error("[diagnose] Gemini 呼び出し失敗", error);
    return Response.json({ error: "診断に失敗しました" }, { status: 500 });
  }
}
