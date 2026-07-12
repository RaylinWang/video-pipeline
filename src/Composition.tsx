import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  OffthreadVideo,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { Subtitle } from "./components/Subtitle";
import { FloatShot } from "./components/FloatShot";
import { ZoomHighlight } from "./components/ZoomHighlight";
import { DimOverlay } from "./components/DimOverlay";
import { HighlightShot } from "./components/HighlightShot";
import { HandArrow } from "./components/HandArrow";
import { PersonSlide } from "./components/PersonSlide";
import { NumberCards } from "./components/NumberCards";
import { TextFx } from "./components/TextFx";
import { TextBehind } from "./components/TextBehind";
import { FloatClip } from "./components/FloatClip";
import { SplitBoard } from "./components/SplitBoard";
import { Slide } from "./components/Slide";
import { PhotoScatter } from "./components/PhotoScatter";
import { HorizontalSteps } from "./components/HorizontalSteps";
import { ProcessCompare } from "./components/ProcessCompare";
import { TreeToc } from "./components/TreeToc";
import { ShotSceneRenderer } from "./shot-language/ShotSceneRenderer";
import { Fonts } from "./Fonts";
import type { Storyboard, WhisperResult } from "./types";

// ============================================================
// Main composition
// 图层顺序（从下到上）：
//   1. 母版口播视频（全程铺底，声音来自这里；
//      person_slide 镜头期间由 masterTransform 驱动位移/缩放）
//   2. 各 scene 的动效浮层（Sequence 按时间挂载，
//      组件内部一律使用「相对本镜头起点」的本地时间）
//   3. 字幕（最顶层，全程存在）
// ============================================================

type Props = {
  storyboard: Storyboard;
  transcript: WhisperResult;
};

// person_slide 期间母版的位移/缩放，0.5s 缓入缓出。
// 返回 CSS transform；不在任何 person_slide 时间段内则为 none
const masterTransform = (storyboard: Storyboard, t: number): string => {
  for (const s of storyboard.scenes) {
    if (s.type !== "person_slide") continue;
    if (t < s.start || t > s.end) continue;
    const ramp = 0.5;
    const ease = Easing.inOut(Easing.cubic);
    const p =
      interpolate(t, [s.start, s.start + ramp], [0, 1], {
        easing: ease,
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      }) *
      interpolate(t, [s.end - ramp, s.end], [1, 0], {
        easing: ease,
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
    const shift = (s.shiftPct ?? 22) * (s.side === "right" ? 1 : -1);
    const scale = 1 - (1 - (s.scale ?? 0.9)) * p;
    return `translateX(${shift * p}%) scale(${scale})`;
  }
  return "none";
};

// 所有组件的字号/间距/圆角都是按 1920×1080 这个「逻辑画布」写死的像素值。
// 画布换成别的分辨率（比如 4K）时，不去改每个组件的每个 px——那是十几个
// 文件的体力活，还容易漏改。而是让全部内容继续在 1920×1080 逻辑坐标系里
// 布局，最外层用 CSS transform 整体缩放铺满实际画布。文字/SVG 这类矢量
// 内容在 transform scale 下是合成阶段做的，不会因为放大而糊；只有本身就是
// 位图的素材（截图、人物抠像序列）分辨率不够时才会显出来，这是素材本身的
// 极限，不是这层缩放造成的。
const BASE_WIDTH = 1920;
const BASE_HEIGHT = 1080;

export const Main: React.FC<Props> = ({ storyboard, transcript }) => {
  const { fps } = storyboard;
  const frame = useCurrentFrame();
  const t = frame / fps;
  const scale = storyboard.width / BASE_WIDTH;

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Fonts />

      {/* 1. 母版视频 —— 真实分辨率原生显示，不进缩放容器，
          否则会先被压成 1920 宽的图层再放大，等于白转了高分辨率源 */}
      <AbsoluteFill style={{ transform: masterTransform(storyboard, t) }}>
        <OffthreadVideo src={staticFile(storyboard.master)} />
      </AbsoluteFill>

      {/* 2+3. 动效浮层 + 字幕 —— 按 1920×1080 逻辑坐标设计，
          transform scale 整体铺满实际画布，矢量内容（文字/SVG）缩放不糊 */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: BASE_WIDTH,
          height: BASE_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
      {/* 2. 动效浮层 */}
      {storyboard.scenes.map((scene, i) => {
        if (scene.type === "talk") return null;
        const from = Math.round(scene.start * fps);
        const duration = Math.round((scene.end - scene.start) * fps);
        return (
          <Sequence
            key={i}
            from={from}
            durationInFrames={duration}
            layout="none"
          >
            {scene.type === "float_shot" && <FloatShot scene={scene} />}
            {scene.type === "zoom_highlight" && <ZoomHighlight scene={scene} />}
            {scene.type === "dim" && <DimOverlay scene={scene} />}
            {scene.type === "highlight_shot" && <HighlightShot scene={scene} />}
            {scene.type === "hand_arrow" && <HandArrow scene={scene} />}
            {scene.type === "person_slide" && <PersonSlide scene={scene} />}
            {scene.type === "number_cards" && <NumberCards scene={scene} />}
            {scene.type === "text_fx" && <TextFx scene={scene} />}
            {scene.type === "text_behind" && <TextBehind scene={scene} />}
            {scene.type === "float_clip" && <FloatClip scene={scene} />}
            {scene.type === "split_board" && <SplitBoard scene={scene} />}
            {scene.type === "slide" && <Slide scene={scene} />}
            {scene.type === "photo_scatter" && <PhotoScatter scene={scene} />}
            {scene.type === "horizontal_steps" && (
              <>
                {(scene.dim ?? 0) > 0 && (
                  <DimOverlay
                    scene={{
                      type: "dim",
                      start: scene.start,
                      end: scene.end,
                      dim: scene.dim,
                    }}
                  />
                )}
                <HorizontalSteps
                  steps={scene.steps}
                  title={scene.title}
                  highlightMode={scene.highlightMode}
                  subtitleSafeBottomPx={scene.subtitleSafeBottomPx}
                  safeGapPx={scene.safeGapPx}
                  widthPct={scene.widthPct}
                  fontSize={scene.fontSize}
                  accentColor={scene.accentColor}
                />
              </>
            )}
            {scene.type === "process_compare" && (
              <>
                {(scene.dim ?? 0) > 0 && (
                  <DimOverlay
                    scene={{
                      type: "dim",
                      start: scene.start,
                      end: scene.end,
                      dim: scene.dim,
                    }}
                  />
                )}
                <ProcessCompare
                  traditional={scene.traditional}
                  ai={scene.ai}
                  title={scene.title}
                  traditionalAtSec={scene.traditionalAtSec}
                  aiAtSec={scene.aiAtSec}
                  stepIntervalSec={scene.stepIntervalSec}
                  subtitleSafeBottomPx={scene.subtitleSafeBottomPx}
                  safeGapPx={scene.safeGapPx}
                  widthPct={scene.widthPct}
                  stepFontSize={scene.stepFontSize}
                  traditionalColor={scene.traditionalColor}
                  aiColor={scene.aiColor}
                />
              </>
            )}
            {scene.type === "tree_toc" && <TreeToc scene={scene} />}
            {scene.type === "shot" && (
              <ShotSceneRenderer scene={scene} master={storyboard.master} />
            )}
          </Sequence>
        );
      })}

      {/* 3. 字幕 */}
      <Subtitle
        transcript={transcript}
        fontFamily={storyboard.subtitle?.fontFamily}
        fontSize={storyboard.subtitle?.fontSize}
        bottomPx={storyboard.subtitle?.bottomPx}
        maxWidthPx={storyboard.subtitle?.maxWidthPx}
      />
      </div>
    </AbsoluteFill>
  );
};
