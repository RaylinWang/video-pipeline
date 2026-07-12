#!/usr/bin/env python3
# ============================================================
# 批量人物抠像 —— 给 text_behind 用的人物 PNG 序列。
# 从母版某个时间段逐帧抽帧 + rembg 抠人，按新分辨率重新跑，
# 别拿旧分辨率的序列凑合（会在缩放后显糊）。
#
# 用法:
#   python3 scripts/make_cutout.py public/master.mp4 7.5 8.0 public/cutout/c_
#   （从 7.5s 开始，抽 8.0s 时长，按母版 fps 逐帧，输出 c_001.png 起）
# ============================================================
import argparse
import subprocess
import sys
from pathlib import Path

REMBG_BIN = str(Path.home() / ".local/bin/rembg")


def probe_fps(video: str) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0",
         "-show_entries", "stream=r_frame_rate", "-of", "csv=p=0", video],
        capture_output=True, text=True, check=True,
    ).stdout.strip()
    num, den = out.split("/")
    return float(num) / float(den)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("start", type=float)
    ap.add_argument("duration", type=float)
    ap.add_argument("out_prefix", help="如 public/cutout/c_，会产出 c_001.png 起")
    ap.add_argument("--fps", type=float, default=None, help="不填就读母版实际 fps")
    args = ap.parse_args()

    fps = args.fps or probe_fps(args.video)
    count = round(args.duration * fps)
    out_dir = Path(args.out_prefix).parent
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"抽 {count} 帧（{fps:.3f}fps），逐帧抠像到 {args.out_prefix}NNN.png ...", file=sys.stderr)

    for i in range(1, count + 1):
        t = args.start + (i - 1) / fps
        frame = out_dir / f"_raw_{i:03d}.png"
        cut = Path(f"{args.out_prefix}{i:03d}.png")
        subprocess.run(
            ["ffmpeg", "-v", "error", "-y", "-ss", str(t), "-i", args.video,
             "-frames:v", "1", str(frame)],
            check=True,
        )
        subprocess.run([REMBG_BIN, "i", str(frame), str(cut)], check=True, capture_output=True)
        frame.unlink()
        if i % 20 == 0 or i == count:
            print(f"  {i}/{count}", file=sys.stderr)

    print(f"完成：{count} 帧", file=sys.stderr)


if __name__ == "__main__":
    main()
