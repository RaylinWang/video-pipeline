import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { TextFxItem, TextFxScene } from "../types";
import { FONT_FAMILIES } from "../Fonts";

// ============================================================
// TextFx —— 通用文字特效镜头
// 大字块按时刻依次弹入：公式（row）、逐条列点（stack）、
// 单句 punch、带贴纸标签的引述卡，全走这一个组件。
// 约定：「」包裹的词渲染成橙色；单字符 +/= 渲染成橙色符号。
// ============================================================

const ACCENT = "#FF2442";
const OUTLINE = [
  "-3px -3px 0 #000",
  "3px -3px 0 #000",
  "-3px 3px 0 #000",
  "3px 3px 0 #000",
  "0 -3px 0 #000",
  "0 3px 0 #000",
  "-3px 0 0 #000",
  "3px 0 0 #000",
  "0 6px 18px rgba(0,0,0,0.8)",
].join(", ");

// 「」内的文字标橙（括号一起标）
const renderAccented = (text: string): React.ReactNode[] =>
  text.split(/(「[^」]*」)/).map((part, i) =>
    part.startsWith("「") ? (
      <span key={i} style={{ color: ACCENT }}>
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );

const isSymbol = (t: string) => /^[+=＋＝×]$/.test(t.trim());

type Props = {
  scene: TextFxScene;
};

export const TextFx: React.FC<Props> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const localT = frame / fps;
  const remainT = scene.end - scene.start - localT;

  const layout = scene.layout ?? "row";
  const dim = scene.dim ?? 0.55;
  const baseSize = scene.size ?? (layout === "row" ? 72 : 60);

  const dimOpacity =
    interpolate(localT, [0, 0.3], [0, dim], { extrapolateRight: "clamp" }) *
    interpolate(remainT, [0, 0.3], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  const exitFade = interpolate(remainT, [0, 0.25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const enterOf = (at: number) =>
    spring({
      frame: frame - Math.round(at * fps),
      fps,
      config: { damping: 13, mass: 0.7 },
    });

  // row 布局按 newRow 分行
  const rows: TextFxItem[][] = [];
  for (const item of scene.items) {
    if (rows.length === 0 || item.newRow) rows.push([]);
    rows[rows.length - 1].push(item);
  }

  const renderItem = (item: TextFxItem, index: number) => {
    const at = item.at ?? 0.2 + index * 0.25;
    const enter = enterOf(at);
    const symbol = isSymbol(item.text);
    const style: React.CSSProperties = scene.card
      ? {
          background: "#fff",
          color: "#111",
          borderRadius: 14,
          padding: "22px 40px",
          fontSize: baseSize,
          fontWeight: 700,
          fontFamily: '"PingFang SC", sans-serif',
          boxShadow: "0 12px 44px rgba(0,0,0,0.55)",
          maxWidth: (scene.anchor ?? "center") === "center" ? 1100 : 620,
          lineHeight: 1.45,
        }
      : {
          color: symbol ? ACCENT : "#fff",
          fontSize: symbol ? baseSize * 1.1 : baseSize,
          fontWeight: 900,
          fontFamily: '"PingFang SC", sans-serif',
          letterSpacing: 2,
          textShadow: OUTLINE,
          whiteSpace: "nowrap",
        };
    return (
      <div
        key={index}
        style={{
          ...style,
          opacity: enter,
          transform: `translateY(${(1 - enter) * 30}px) scale(${0.8 + 0.2 * enter})`,
        }}
      >
        {scene.card || !symbol ? renderAccented(item.text) : item.text}
      </div>
    );
  };

  let itemIndex = 0;
  const punchEnter = scene.punch ? enterOf(scene.punch.at) : 0;
  const tagEnter = enterOf(0.1);

  const anchor = scene.anchor ?? "center";
  const anchorStyle: React.CSSProperties =
    anchor === "center"
      ? { alignItems: "center", justifyContent: "center", padding: "0 6%" }
      : {
          alignItems: anchor === "top-left" ? "flex-start" : "flex-end",
          justifyContent: "flex-start",
          padding: "9% 6% 0",
        };

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill style={{ background: `rgba(0,0,0,${dimOpacity})` }} />

      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          gap: layout === "row" ? 28 : 34,
          opacity: exitFade,
          ...anchorStyle,
        }}
      >
        {scene.tag && (
          <div
            style={{
              background: "#000",
              color: "#fff",
              border: "2px solid #fff",
              borderRadius: 10,
              padding: "8px 28px",
              fontSize: 34,
              fontWeight: 700,
              fontFamily: '"PingFang SC", sans-serif',
              opacity: tagEnter,
              transform: `scale(${0.85 + 0.15 * tagEnter})`,
            }}
          >
            {scene.tag}
          </div>
        )}

        {layout === "row"
          ? rows.map((row, r) => (
              <div
                key={r}
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 26,
                }}
              >
                {row.map((item) => renderItem(item, itemIndex++))}
              </div>
            ))
          : scene.items.map((item, i) => renderItem(item, i))}

        {scene.punch && (
          <div
            style={{
              marginTop: scene.items.length > 0 ? 26 : 0,
              opacity: punchEnter,
              transform: `translateY(${(1 - punchEnter) * 40}px) scale(${0.75 + 0.25 * punchEnter})`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div
              style={{
                color: "#fff",
                fontSize: scene.punch.size ?? 110,
                fontWeight: 900,
                fontFamily: scene.punch.font
                  ? `"${FONT_FAMILIES[scene.punch.font]}"`
                  : '"PingFang SC", sans-serif',
                letterSpacing: 4,
                textShadow: OUTLINE,
                whiteSpace: "nowrap",
              }}
            >
              {renderAccented(scene.punch.text)}
            </div>
            <div
              style={{
                height: 12,
                borderRadius: 6,
                background: ACCENT,
                width: "70%",
                marginTop: 10,
                transform: `scaleX(${punchEnter})`,
              }}
            />
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
