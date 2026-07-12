import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

// ============================================================
// HorizontalSteps —— 横向步骤／关键词依次点亮
//
// 适合「三个结论」「三个阶段」「三个关键词」这类口播。组件只负责
// 信息层，不压暗画面；默认放在字幕安全区上方，避免与底部字幕重叠。
// 所有标签强制单行，长文案会按字符数略微缩小，仍建议传入 2–8 字短句。
// ============================================================

export type HorizontalStepItem = {
  /** 单行标签，建议 2–8 个汉字或 1–3 个英文单词。 */
  label: string;
  /** 本步骤相对镜头起点的出现时间（秒）。未填则按 intervalSec 依次出现。 */
  atSec?: number;
  /** 可选的步骤编号；不传则显示 01、02、03。 */
  marker?: string;
};

export type HorizontalStepsProps = {
  steps: readonly HorizontalStepItem[];
  /** 可选的小标题，例如「AI 工作流」。 */
  title?: string;
  /** 第一个步骤的出现时间（秒）。 */
  startAtSec?: number;
  /** 没有为 step 单独指定 atSec 时，两个步骤之间的间隔（秒）。 */
  intervalSec?: number;
  /** 已点亮的步骤是否保持高亮；默认是。 */
  highlightMode?: "cumulative" | "current";
  /** 底部字幕安全区高度。Subtitle 默认在底部约 64px，建议保留至少 170px。 */
  subtitleSafeBottomPx?: number;
  /** 距离字幕安全区的额外间距。 */
  safeGapPx?: number;
  /** 信息条所占画面宽度百分比。 */
  widthPct?: number;
  /** 默认标签字号。为保证单行，实际字号可能稍小。 */
  fontSize?: number;
  /** 主题强调色。 */
  accentColor?: string;
  /** 未激活步骤的文字色。 */
  mutedColor?: string;
  /** 设置后，在该时刻开始淡出；适合直接挂在全局 Composition 的场景。 */
  exitAtSec?: number;
  exitDurationSec?: number;
};

const FONT = '"PingFang SC", "Microsoft YaHei", sans-serif';

const visualLength = (text: string) =>
  [...text].reduce((sum, char) => sum + (/^[\u0000-\u00ff]$/.test(char) ? 0.58 : 1), 0);

const fitSingleLineFontSize = (
  text: string,
  preferred: number,
  availableWidth: number,
) => {
  // 0.98 让中英文混排在 PingFang 下仍能留出一点呼吸空间。
  const byLength = availableWidth / Math.max(visualLength(text) * 0.98, 1);
  return Math.max(22, Math.min(preferred, byLength));
};

export const HorizontalSteps: React.FC<HorizontalStepsProps> = ({
  steps,
  title,
  startAtSec = 0.2,
  intervalSec = 0.68,
  highlightMode = "cumulative",
  subtitleSafeBottomPx = 170,
  safeGapPx = 34,
  widthPct = 82,
  fontSize = 38,
  accentColor = "#FF8A00",
  mutedColor = "rgba(255,255,255,0.48)",
  exitAtSec,
  exitDurationSec = 0.28,
}) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const timeSec = frame / fps;

  if (steps.length === 0) return null;

  const times = steps.map(
    (step, index) => step.atSec ?? startAtSec + index * intervalSec,
  );
  const activeIndex = times.reduce(
    (latest, atSec, index) => (timeSec >= atSec ? index : latest),
    -1,
  );
  const exitOpacity =
    exitAtSec === undefined
      ? 1
      : interpolate(timeSec, [exitAtSec, exitAtSec + exitDurationSec], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

  // 每个节点可用的标签宽度：总宽度 - 节点和箭头的预计占用。
  const containerWidth = width * (widthPct / 100);
  const markerAndArrowWidth = 102 * steps.length - 34;
  const labelWidth = Math.max(
    120,
    (containerWidth - markerAndArrowWidth) / steps.length,
  );

  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: exitOpacity }}>
      <div
        style={{
          position: "absolute",
          left: "50%",
          bottom: subtitleSafeBottomPx + safeGapPx,
          width: `${widthPct}%`,
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          fontFamily: FONT,
        }}
      >
        {title ? (
          <div
            style={{
              alignSelf: "flex-start",
              padding: "7px 16px",
              borderRadius: 999,
              background: "rgba(4,8,17,0.78)",
              border: `1px solid ${accentColor}`,
              color: "#fff",
              fontSize: 24,
              fontWeight: 800,
              letterSpacing: 1.5,
              whiteSpace: "nowrap",
              boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
            }}
          >
            {title}
          </div>
        ) : null}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            minWidth: 0,
          }}
        >
          {steps.map((step, index) => {
            const atSec = times[index] ?? 0;
            const enter = spring({
              frame: frame - Math.round(atSec * fps),
              fps,
              config: { damping: 15, mass: 0.72, stiffness: 160 },
            });
            const isActive =
              highlightMode === "cumulative"
                ? index <= activeIndex
                : index === activeIndex;
            const light = interpolate(
              timeSec,
              [atSec, atSec + 0.22],
              [0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            );
            const labelFontSize = fitSingleLineFontSize(
              step.label,
              fontSize,
              labelWidth - 28,
            );

            return (
              <React.Fragment key={`${step.label}-${index}`}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 13,
                    minWidth: 0,
                    opacity: 0.36 + enter * 0.64,
                    transform: `translateY(${(1 - enter) * 26}px) scale(${0.93 + enter * 0.07})`,
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "50%",
                      color: isActive ? "#101319" : "#fff",
                      background: isActive ? accentColor : "rgba(8,11,18,0.82)",
                      border: `2px solid ${isActive ? accentColor : "rgba(255,255,255,0.42)"}`,
                      fontSize: 20,
                      fontWeight: 900,
                      boxShadow: isActive
                        ? `0 0 ${14 + light * 20}px ${accentColor}88`
                        : "0 5px 14px rgba(0,0,0,0.34)",
                    }}
                  >
                    {step.marker ?? String(index + 1).padStart(2, "0")}
                  </div>
                  <div
                    style={{
                      minWidth: 0,
                      color: isActive ? "#fff" : mutedColor,
                      fontSize: labelFontSize,
                      fontWeight: 900,
                      lineHeight: 1,
                      letterSpacing: 1,
                      whiteSpace: "nowrap",
                      textShadow: isActive
                        ? "0 3px 15px rgba(0,0,0,0.86)"
                        : "0 2px 10px rgba(0,0,0,0.64)",
                    }}
                  >
                    {step.label}
                  </div>
                </div>

                {index < steps.length - 1 ? (
                  <div
                    aria-hidden
                    style={{
                      height: 3,
                      flex: 1,
                      minWidth: 28,
                      margin: "0 18px",
                      borderRadius: 999,
                      position: "relative",
                      overflow: "visible",
                      background: "rgba(255,255,255,0.24)",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: `${interpolate(
                          timeSec,
                          [atSec + 0.13, atSec + 0.4],
                          [0, 100],
                          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
                        )}%`,
                        borderRadius: 999,
                        background: accentColor,
                        boxShadow: `0 0 12px ${accentColor}99`,
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        right: -1,
                        top: "50%",
                        width: 10,
                        height: 10,
                        borderTop: `3px solid ${index < activeIndex ? accentColor : "rgba(255,255,255,0.38)"}`,
                        borderRight: `3px solid ${index < activeIndex ? accentColor : "rgba(255,255,255,0.38)"}`,
                        transform: "translateY(-50%) rotate(45deg)",
                      }}
                    />
                  </div>
                ) : null}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
