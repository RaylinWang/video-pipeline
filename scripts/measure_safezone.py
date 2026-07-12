#!/usr/bin/env python3
# ============================================================
# 自动测量人像安全区 —— 给定母版+时间段，抽样跑 rembg 抠图，
# 测每帧人物轮廓的左右边界，取「最保守」的安全区百分比。
# 代替过去「渲一帧、目测、改数字、再渲」的试错循环。
#
# 用法:
#   python3 scripts/measure_safezone.py public/master.mp4 8.0 15.2
#   python3 scripts/measure_safezone.py public/master.mp4 51.0 57.05 --samples 6
#
# 输出: JSON，safe_left_pct / safe_right_pct 是「不会被人像碰到」
# 的两侧安全边界（左侧 0~该值可用，右侧该值~100可用）。
# 已经留了缓冲，不用再手动加余量。
# ============================================================
import argparse
import json
import subprocess
import sys
import tempfile
from pathlib import Path

REMBG_BIN = str(Path.home() / ".local/bin/rembg")


def extract_frame(video: str, t: float, out: Path):
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-ss", str(t), "-i", video,
         "-frames:v", "1", str(out)],
        check=True,
    )


def run_rembg(src: Path, dst: Path):
    subprocess.run([REMBG_BIN, "i", str(src), str(dst)], check=True, capture_output=True)


def measure_bounds(png: Path, y_bands_pct):
    from PIL import Image
    img = Image.open(png).convert("RGBA")
    w, h = img.size
    px = img.load()
    bounds = []
    for ypct in y_bands_pct:
        y = int(h * ypct / 100)
        xs = [x for x in range(w) if px[x, y][3] > 30]
        if not xs:
            continue
        bounds.append((ypct, min(xs) / w * 100, max(xs) / w * 100))
    return bounds


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("start", type=float)
    ap.add_argument("end", type=float)
    ap.add_argument("--samples", type=int, default=5, help="抽样帧数，默认 5")
    ap.add_argument(
        "--y-bands", default="10,20,30,40,50,60,70,80",
        help="测哪些高度（画面百分比，逗号分隔），默认覆盖头到腰",
    )
    ap.add_argument("--margin", type=float, default=2.0, help="额外留白百分比，默认 2")
    args = ap.parse_args()

    y_bands = [float(x) for x in args.y_bands.split(",")]
    times = [
        args.start + (args.end - args.start) * i / max(1, args.samples - 1)
        for i in range(args.samples)
    ]

    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        all_left, all_right = [], []
        per_frame = []
        for i, t in enumerate(times):
            frame = tmp / f"f{i}.png"
            cut = tmp / f"c{i}.png"
            extract_frame(args.video, t, frame)
            run_rembg(frame, cut)
            bounds = measure_bounds(cut, y_bands)
            if not bounds:
                continue
            lefts = [b[1] for b in bounds]
            rights = [b[2] for b in bounds]
            all_left.extend(lefts)
            all_right.extend(rights)
            per_frame.append({"t": round(t, 2), "left_min": round(min(lefts), 1), "right_max": round(max(rights), 1)})

        if not all_left:
            print(json.dumps({"error": "没测到人像，检查时间段是否有人入镜"}), file=sys.stderr)
            sys.exit(1)

        safe_left = round(min(all_left) - args.margin, 1)
        safe_right = round(max(all_right) + args.margin, 1)

        result = {
            "video": args.video,
            "range": [args.start, args.end],
            "samples": len(per_frame),
            "safe_left_pct": max(0, safe_left),
            "safe_right_pct": min(100, safe_right),
            "note": f"左侧 0-{safe_left}% 安全，右侧 {safe_right}-100% 安全（已留 {args.margin}% 缓冲）",
            "per_frame": per_frame,
        }
        print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
