"use client";

import { useEffect, useRef } from "react";

interface Raindrop {
  x: number;
  y: number;
  length: number;
  speed: number;
  opacity: number;
}

export default function RainFogOverlay() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const dropCount = Math.floor((width * height) / 9000);
    const drops: Raindrop[] = Array.from({ length: dropCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      length: 12 + Math.random() * 22,
      speed: 7 + Math.random() * 9,
      opacity: 0.12 + Math.random() * 0.28,
    }));

    let animationFrame: number;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.strokeStyle = "rgba(205, 216, 224, 0.6)";
      ctx.lineCap = "round";
      ctx.lineWidth = 1;

      for (const drop of drops) {
        ctx.globalAlpha = drop.opacity;
        ctx.beginPath();
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x - 3, drop.y + drop.length);
        ctx.stroke();

        drop.y += drop.speed;
        drop.x -= 0.7;

        if (drop.y > height) {
          drop.y = -drop.length;
          drop.x = Math.random() * width;
        }
        if (drop.x < -10) {
          drop.x = width + 10;
        }
      }

      ctx.globalAlpha = 1;
      animationFrame = requestAnimationFrame(draw);
    };

    draw();

    // ResizeObserver (not just window resize) so the rain keeps pace when this
    // sits inside a container that grows/shrinks on its own, like the
    // scroll-expanding hero window.
    const resizeObserver = new ResizeObserver(() => {
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    });
    resizeObserver.observe(canvas);

    return () => {
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="rain-fog-layer rain-fog-layer-1" />
      <div className="rain-fog-layer rain-fog-layer-2" />

      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      <style jsx>{`
        .rain-fog-layer {
          position: absolute;
          width: 160%;
          height: 55%;
          background: radial-gradient(
            ellipse at center,
            rgba(232, 237, 235, 0.16) 0%,
            rgba(232, 237, 235, 0) 70%
          );
          filter: blur(35px);
        }
        .rain-fog-layer-1 {
          left: -30%;
          top: 5%;
          animation: rainFogDriftRight 42s ease-in-out infinite alternate;
        }
        .rain-fog-layer-2 {
          left: -60%;
          top: 58%;
          height: 48%;
          opacity: 0.7;
          animation: rainFogDriftLeft 58s ease-in-out infinite alternate;
        }
        @keyframes rainFogDriftRight {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(18%);
          }
        }
        @keyframes rainFogDriftLeft {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-18%);
          }
        }
      `}</style>
    </div>
  );
}
