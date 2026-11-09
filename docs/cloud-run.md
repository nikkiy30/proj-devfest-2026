# Cloud Run の手動公開手順

この手順は承認後に操作するためのものです。コマンド例の作成は、GCP 上での実行や課金リソースの作成を意味しません。Docker のローカル導入は不要です。

## 1. 実行前に確認すること

- GCP プロジェクト ID と課金先、作業者に許可する権限
- リージョン（例は東京 `asia-northeast1`）とサービス名
- Cloud Run を一般公開するか。ブラウザでマイクを使うには HTTPS が必要です
- Cloud Build・Artifact Registry・Cloud Run・ログの費用。最小インスタンス0でも、ビルド・イメージ保管・通信・実際の稼働などの費用は発生します
- 既存 Firebase App Hosting の自動デプロイの有無。Cloud Run に移行するなら、二重公開にならないよう Firebase 側の連携を確認してください

プロジェクト所有者の権限をアプリに与えないでください。設定・ビルド・アプリ実行の権限を分けます。

| ID / 対象                          | 用途・必要な範囲                                                                                                                            |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 初期設定担当                       | API 有効化、リポジトリ・サービスアカウント作成、必要な IAM の設定。管理者が実施する工程                                                     |
| ビルド用サービスアカウント         | 対象 Artifact Registry の Writer、Cloud Logging の Log Writer、ソース送信用バケットの Object Viewer。プロジェクト全体の Editor は付与しない |
| ビルド実行者                       | ビルド送信権限と、指定したビルド用アカウントに対する `iam.serviceAccounts.actAs` 等。組織ポリシーに合わせて管理者が設定                     |
| Cloud Run 実行用サービスアカウント | 今回のアプリは外部サービスを呼ばないため追加の業務 API 権限・キーは不要                                                                     |
| デプロイ担当                       | Cloud Run のデプロイ、実行用アカウントへの actAs、対象イメージの読み取り。公開設定の変更権限は別途必要                                      |

以下のコマンドは **Cloud Shell** を想定しています。作業用の変数には非秘密の識別子だけを設定します。キーやトークンをコマンドやリポジトリに書かないでください。

```bash
export PROJECT_ID="実際のプロジェクトID"
export REGION="asia-northeast1"
export SERVICE="okimochi"
export REPOSITORY="okimochi"
export BUILD_SA="okimochi-build@${PROJECT_ID}.iam.gserviceaccount.com"
export RUNTIME_SA="okimochi-runtime@${PROJECT_ID}.iam.gserviceaccount.com"
export SOURCE_BUCKET="${PROJECT_ID}-okimochi-build-source"
gcloud config set project "$PROJECT_ID"
```

## 2. 初回の GCP 設定（承認後・管理者が実施）

```bash
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com iam.googleapis.com storage.googleapis.com

gcloud artifacts repositories create "$REPOSITORY" \
  --repository-format=docker --location="$REGION"

gcloud iam service-accounts create okimochi-build
gcloud iam service-accounts create okimochi-runtime

gcloud storage buckets create "gs://${SOURCE_BUCKET}" \
  --location="$REGION" --uniform-bucket-level-access

gcloud artifacts repositories add-iam-policy-binding "$REPOSITORY" \
  --location="$REGION" --member="serviceAccount:${BUILD_SA}" \
  --role=roles/artifactregistry.writer

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${BUILD_SA}" --role=roles/logging.logWriter

gcloud storage buckets add-iam-policy-binding "gs://${SOURCE_BUCKET}" \
  --member="serviceAccount:${BUILD_SA}" --role=roles/storage.objectViewer
```

既存のリソースがある場合は再作成せず内容を確認します。組織の制約、Cloud Build のサービスエージェント、ソースアップロード担当の権限によって追加の設定が必要になることがあります。権限エラーは対象と必要な操作を確認し、広い管理者権限で回避しないでください。ソースバケットと Artifact Registry の不要データの保持・削除ルールも設定してください。

## 3. ビルドとコンテナの起動検証（別途承認後）

レビュー対象のブランチを Cloud Shell に用意し、ローカルで以下が成功していることを確認します。

```bash
npm ci
npm run check
npm run build
npm run test:e2e
```

Cloud Shell にブラウザがない場合、E2E は開発環境・CI の結果を確認してください。`gcloud meta list-files-for-upload` で送信一覧を確認し、`.env.local`・`temp/`・秘密ファイルが含まれないことを確かめます。

```bash
gcloud meta list-files-for-upload

gcloud builds submit . --config=cloudbuild.yaml --region="$REGION" \
  --service-account="projects/${PROJECT_ID}/serviceAccounts/${BUILD_SA}" \
  --gcs-source-staging-dir="gs://${SOURCE_BUCKET}/source" \
  --substitutions="_REGION=${REGION},_REPOSITORY=${REPOSITORY},_SERVICE=${SERVICE}"
```

- `Dockerfile`：Node 22 で `npm ci`、Next.js の本番ビルド、standalone 出力のコピー、非 root ユーザーでの起動を定義します。コンテナ内の Node が `PORT` を読み、`0.0.0.0` で待ち受けます。
- `.dockerignore`：ビルドに必要なファイルだけを許可します。Cloud Build にソースを送る前段は `.gcloudignore` が担当します。
- `cloudbuild.yaml`：イメージを作り、コンテナの `/api/health`・ホーム・体験ページ・AI 無効状態・非 root 実行をテストします。失敗した場合はビルド全体が失敗し、後続のイメージ保存に進みません。
- ビルド時に Gemini キーは必要ありません。`.env` ファイルをコピーしません。
- この設定はデプロイを行いません。出力されたビルド ID・イメージ digest と検証結果を確認してから次に進みます。

Node ベースイメージは `22.23.4-bookworm-slim` のバージョンタグで指定しています。タグは不変ではありません。初回の実ビルドで取得したベースイメージの digest と脆弱性検査結果を確認し、本番公開前に digest 固定・更新運用を決定してください。Artifact Analysis 等の脆弱性スキャンは別の有効化・権限・費用確認が必要です。ロックファイルや非 root 実行だけで脆弱性がなくなるわけではありません。

## 4. Cloud Run の公開（ビルド結果を確認・別途承認後）

Artifact Registry から **確認した digest** を取得し、タグではなく digest を指定します。

```bash
export IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${SERVICE}@sha256:確認したdigest"

gcloud run deploy "$SERVICE" --image="$IMAGE" --region="$REGION" \
  --service-account="$RUNTIME_SA" --port=8080 \
  --cpu=1 --memory=512Mi --concurrency=40 \
  --min=0 --max=2 --timeout=60 \
  --no-allow-unauthenticated
```

最初は認証が必要な状態でデプロイします。`gcloud run services proxy "$SERVICE" --region="$REGION" --port=8080` とブラウザの localhost 接続で、一般公開前に確認できます。サービスの URL に直接アクセスする場合は認証設定に合う ID トークン等が必要です。

- ホームから体験へ移動できる
- タグ選択・任意入力で返答が変わる
- マイク拒否時の案内、実マイクでの10秒完了・途中終了・中止・再実行
- ページ移動・タブ非表示でマイクが停止する
- DevTools の Network で入力・音声が送信されていない
- CSS / JavaScript / アイコンの配信、スマートフォンでの操作

公開範囲を確認して一般公開する場合は、別途承認のうえで Invoker 設定を変更します。

```bash
gcloud run services add-iam-policy-binding "$SERVICE" --region="$REGION" \
  --member=allUsers --role=roles/run.invoker
```

組織ポリシーで `allUsers` が許可されない場合は、このコマンドを無理に通さず公開方式を管理者と確認します。最大インスタンス2は費用の完全な上限ではありません。予算通知・ログ保持・アクセス状況を確認してください。今回の API は常に無効ですが、将来課金される AI API を公開する際は、認証・利用制限・費用制御を先に設計します。

## 5. 将来の AI 接続

`POST /api/diagnose` は現在、本文やキーを読まず `503 / AI_DISABLED` を返します。環境変数の追加だけでは有効になりません。既存の `src/lib/gemini.ts` は server-only の未接続コードとして残し、本番の呼び出し経路から外しています。

将来はブラウザ → 同一オリジンの Next.js API → サーバー側の AI 接続とします。Cloud Run 上で直接 Vertex AI を利用するか、別の Cloud Run API に接続するかは未決定です。前者なら実行用サービスアカウント、後者なら対象サービスの Invoker と ID トークンによる認証を検討します。Gemini Developer API のキーが必要になった場合だけ Secret Manager を使います。

音声・入力を送信する機能は、今回のプライバシー説明と異なるため、送信前の同意・保存期間・ログ方針も別途変更・レビューします。

## 公式資料

- [Next.js standalone](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)
- [Cloud Build でコンテナをビルド](https://cloud.google.com/build/docs/building/build-containers)
- [独自のビルド用サービスアカウント](https://cloud.google.com/build/docs/securing-builds/configure-user-specified-service-accounts)
- [Cloud Run のコンテナ契約](https://cloud.google.com/run/docs/container-contract)
- [Cloud Run の公開設定](https://cloud.google.com/run/docs/authenticating/public)
