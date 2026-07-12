import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import type { WhisperResult } from "../types";

// ============================================================
// Subtitle —— 手写风底部字幕
// 输入：Whisper 转录结果（segment 级即可，词级更精确）
// 逻辑：找到当前时间所在的 segment，整句显示（对标参考视频的
//       一句一屏硬切风格，不做逐词卡拉OK——那是另一种视觉语言）
// ============================================================

type Props = {
  transcript: WhisperResult;
  fontFamily?: string;
  fontSize?: number;
  bottomPx?: number;
  maxWidthPx?: number;
};

export const Subtitle: React.FC<Props> = ({
  transcript,
  fontFamily = '"Muyao-Softbrush", "PingFang SC", sans-serif',
  fontSize = 44,
  bottomPx = 64,
  maxWidthPx = 1480,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const seg = transcript.segments.find((s) => t >= s.start && t < s.end);
  if (!seg) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: Math.max(0, bottomPx),
        display: "flex",
        justifyContent: "center",
        boxSizing: "border-box",
        padding: "0 64px",
        pointerEvents: "none",
      }}
    >
      <span
        style={{
          display: "block",
          minWidth: 0,
          maxWidth: maxWidthPx,
          boxSizing: "border-box",
          fontFamily,
          fontSize,
          lineHeight: 1.25,
          color: "#fff",
          fontWeight: 800,
          letterSpacing: 2,
          padding: "6px 18px",
          textAlign: "center",
          textWrap: "balance",
          // 用 8 方向 shadow 模拟黑描边（比 WebkitTextStroke 稳：
          // stroke 居中绘制会吃掉细笔画字体的白色填充）
          textShadow: [
            "-2px -2px 0 #000",
            "2px -2px 0 #000",
            "-2px 2px 0 #000",
            "2px 2px 0 #000",
            "0 -2px 0 #000",
            "0 2px 0 #000",
            "-2px 0 0 #000",
            "2px 0 0 #000",
            "0 4px 12px rgba(0,0,0,0.8)",
          ].join(", "),
          whiteSpace: "normal",
          lineBreak: "strict",
          wordBreak: "normal",
          overflowWrap: "anywhere",
        }}
      >
        {seg.text.trim()}
      </span>
    </div>
  );
};
