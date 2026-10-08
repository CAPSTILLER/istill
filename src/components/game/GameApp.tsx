import { useEffect, useRef } from "react";
import { Overlay } from "@/components/game/Overlay";
import { createEngine, type Engine } from "@/game/engine";

export function GameApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    let handle: Engine | null = null;

    void createEngine(canvas).then((engine) => {
      if (cancelled) {
        engine.destroy();
        return;
      }
      handle = engine;
      engineRef.current = engine;
    });

    return () => {
      cancelled = true;
      handle?.destroy();
      engineRef.current = null;
    };
  }, []);

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-bg text-fg">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 size-full touch-none select-none"
        style={{ touchAction: "none" }}
      />
      <Overlay engineRef={engineRef} />
    </main>
  );
}
