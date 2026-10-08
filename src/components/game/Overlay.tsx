import type { RefObject } from "react";
import { Eye, Pause, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Engine } from "@/game/engine";
import { useGameStore } from "@/game/store";
import { assetUrl } from "@/lib/asset";

type Props = {
  engineRef: RefObject<Engine | null>;
};

export function Overlay({ engineRef }: Props) {
  const phase = useGameStore((s) => s.phase);
  const assetsReady = useGameStore((s) => s.assetsReady);
  const line = useGameStore((s) => s.line);
  const hint = useGameStore((s) => s.hint);
  const shardsLeft = useGameStore((s) => s.shardsLeft);
  const shardTotal = useGameStore((s) => s.shardTotal);
  const relicsCollected = useGameStore((s) => s.relicsCollected);
  const warning = useGameStore((s) => s.warning);
  const doorReady = useGameStore((s) => s.doorReady);
  const caughtCount = useGameStore((s) => s.caughtCount);
  const bestCaught = useGameStore((s) => s.bestCaught);
  const muted = useGameStore((s) => s.muted);
  const roomIndex = useGameStore((s) => s.roomIndex);
  const roomCount = useGameStore((s) => s.roomCount);

  const engine = () => engineRef.current;
  const playing = phase === "playing" || phase === "caught";

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {(phase === "title" || phase === "boot") && (
        <div className="pointer-events-auto absolute inset-0 flex flex-col justify-end overflow-hidden bg-bg">
          <img
            src={assetUrl("art/title.jpg")}
            alt=""
            className="absolute inset-0 size-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/40" />
          <div className="relative flex flex-col items-center px-6 pb-[max(3rem,env(safe-area-inset-bottom))] pt-16 text-center">
            <p className="ui-enter font-sans text-xs font-medium uppercase tracking-[0.32em] text-muted">
              A game of stillness
            </p>
            <h1 className="ui-enter ui-enter-delay-1 mt-3 font-display text-[clamp(3.5rem,14vw,7rem)] font-medium leading-none tracking-tight text-fg">
              I <span className="italic">Still</span>
            </h1>
            <p className="ui-enter ui-enter-delay-2 mt-5 max-w-sm font-sans text-base leading-relaxed text-muted">
              When he looks, do not move. Collect what remains of you.
            </p>
            <Button
              className="ui-enter ui-enter-delay-3 mt-8 min-w-44"
              size="lg"
              disabled={!assetsReady}
              onClick={() => engine()?.start()}
            >
              {assetsReady ? "Begin" : "Loading"}
            </Button>
            <p className="mt-6 max-w-xs font-sans text-xs leading-relaxed text-subtle">
              Hold the room to walk. Release to stop. One relic opens the door.
              {bestCaught != null ? ` Quietest run: seen ${bestCaught} times.` : ""}
            </p>
          </div>
        </div>
      )}

      {playing && (
        <>
          <div className="absolute left-4 top-[max(1rem,env(safe-area-inset-top))] right-4 flex items-start justify-between gap-3">
            <div>
              <p className="font-display text-xl italic leading-tight text-fg sm:text-2xl">{line}</p>
              <p className="mt-1 font-sans text-xs text-muted">
                {roomIndex + 1} / {roomCount}
                {doorReady ? " · The door is open" : " · One relic opens the door"}
              </p>
            </div>
            <div className="pointer-events-auto flex gap-2">
              <Button
                variant="subtle"
                size="icon"
                aria-label={muted ? "Unmute" : "Mute"}
                onClick={() => engine()?.toggleMute()}
              >
                {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
              </Button>
              <Button
                variant="subtle"
                size="icon"
                aria-label="Pause"
                onClick={() => engine()?.pause()}
              >
                <Pause className="size-4" />
              </Button>
            </div>
          </div>

          <div className="absolute left-1/2 top-[max(4.25rem,calc(env(safe-area-inset-top)+3.5rem))] flex -translate-x-1/2 items-center gap-3">
            <img
              src={assetUrl("sprites/relic-icon.png")}
              alt=""
              className="size-14 drop-shadow-[0_6px_16px_rgba(0,0,0,0.65)] sm:size-[4.5rem]"
            />
            <span className="font-display text-4xl italic leading-none text-fg sm:text-5xl">
              = {relicsCollected}
            </span>
          </div>

          {warning && (
            <div className="absolute inset-x-0 top-1/4 flex justify-center">
              <p className="still-warn font-display text-5xl italic tracking-[0.2em] text-fg sm:text-6xl">
                Still
              </p>
            </div>
          )}

          <div className="absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-4 right-4 flex justify-end">
            <p className="hidden font-sans text-[11px] text-subtle sm:block">
              Hold to walk · {shardTotal - shardsLeft}/{shardTotal} in this room
            </p>
          </div>
        </>
      )}

      {phase === "caught" && (
        <div className="absolute inset-0 flex items-center justify-center bg-danger/10">
          <p className="ui-enter font-display text-4xl italic text-fg">It saw you.</p>
        </div>
      )}

      {phase === "paused" && (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-bg/70 px-6">
          <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
            <h2 className="font-display text-3xl italic text-fg">Paused</h2>
            <p className="mt-2 font-sans text-sm text-muted">{hint}</p>
            <div className="mt-6 flex flex-col gap-2">
              <Button onClick={() => engine()?.resume()}>Resume</Button>
              <Button variant="ghost" onClick={() => engine()?.restartRoom()}>
                Restart room
              </Button>
              <Button variant="ghost" onClick={() => engine()?.toggleMute()}>
                {muted ? "Unmute" : "Mute"}
              </Button>
              <Button variant="ghost" onClick={() => engine()?.goTitle()}>
                Title
              </Button>
            </div>
          </div>
        </div>
      )}

      {phase === "roomclear" && (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-bg/55 px-6">
          <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 text-center">
            <p className="font-sans text-xs uppercase tracking-[0.28em] text-muted">Remembered</p>
            <h2 className="mt-3 font-display text-4xl italic text-fg">{line}</h2>
            <Button className="mt-8" onClick={() => engine()?.continueRoom()}>
              Continue
            </Button>
          </div>
        </div>
      )}

      {phase === "ending" && (
        <div className="pointer-events-auto absolute inset-0 flex flex-col items-center justify-center bg-bg px-6 text-center">
          <Eye className="mb-6 size-8 text-muted" strokeWidth={1.5} />
          <h2 className="font-display text-5xl italic text-fg">I still remain.</h2>
          <p className="mt-4 max-w-sm font-sans text-sm leading-relaxed text-muted">
            You were seen {caughtCount} {caughtCount === 1 ? "time" : "times"}.
            {bestCaught != null ? ` Quietest run: ${bestCaught}.` : ""}
          </p>
          <Button className="mt-8" size="lg" onClick={() => engine()?.start()}>
            Begin again
          </Button>
        </div>
      )}
    </div>
  );
}
