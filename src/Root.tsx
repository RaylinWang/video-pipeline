import React from "react";
import { Composition, staticFile, registerRoot } from "remotion";
import { Main } from "./Composition";
import storyboard from "../storyboard.json";
import type { Storyboard, WhisperResult } from "./types";
import { ShotLanguageCatalog } from "./shot-language/ShotCatalog";

// ============================================================
// Root —— 注册 composition
// storyboard.json 决定分辨率/帧率/时长；
// transcript JSON 在这里异步读取（放 public/ 下）
// ============================================================

const sb = storyboard as Storyboard;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Main"
        component={Main}
        width={sb.width}
        height={sb.height}
        fps={sb.fps}
        durationInFrames={Math.round(sb.durationSec * sb.fps)}
        defaultProps={{
          storyboard: sb,
          transcript: { segments: [] } as WhisperResult,
        }}
        calculateMetadata={async ({ props }) => {
          const res = await fetch(staticFile(sb.transcript));
          const transcript = (await res.json()) as WhisperResult;
          return {
            props: { ...props, transcript },
          };
        }}
      />
      <Composition
        id="ShotLanguageCatalog"
        component={ShotLanguageCatalog}
        width={1920}
        height={1080}
        fps={30}
        durationInFrames={1}
      />
    </>
  );
};

registerRoot(RemotionRoot);
