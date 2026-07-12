#!/usr/bin/env bash
# ============================================================
# 用本地 mlx_whisper 转录母版视频，输出词级时间戳 JSON 到 public/
# 用法: bash scripts/transcribe.sh public/master.mp4
# ============================================================
set -euo pipefail

INPUT="${1:?用法: bash scripts/transcribe.sh <母版视频路径>}"
OUTDIR="public"
WHISPER_BIN="${WHISPER_BIN:-$HOME/.local/bin/mlx_whisper}"

if [ ! -x "$WHISPER_BIN" ]; then
  echo "找不到 mlx_whisper: $WHISPER_BIN（可用 WHISPER_BIN 环境变量覆盖）" >&2
  exit 1
fi

"$WHISPER_BIN" "$INPUT" \
  --language zh \
  --word-timestamps True \
  --output-format json \
  --output-dir "$OUTDIR"

BASE="$(basename "${INPUT%.*}")"
echo ""
echo "完成 → $OUTDIR/$BASE.json"
echo "把 storyboard.json 里的 transcript 字段指向该文件名即可。"
