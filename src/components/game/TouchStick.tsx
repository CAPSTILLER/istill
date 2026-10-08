import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  onChange: (x: number, y: number) => void;
  className?: string;
};

export function TouchStick({ onChange, className }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const pointer = useRef<number | null>(null);

  const update = useCallback(
    (clientX: number, clientY: number) => {
      const el = rootRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      let dx = clientX - cx;
      let dy = clientY - cy;
      const max = r.width * 0.32;
      const mag = Math.hypot(dx, dy);
      if (mag > max) {
        dx = (dx / mag) * max;
        dy = (dy / mag) * max;
      }
      setKnob({ x: dx, y: dy });
      onChange(dx / max, dy / max);
    },
    [onChange],
  );

  function end() {
    pointer.current = null;
    setKnob({ x: 0, y: 0 });
    onChange(0, 0);
  }

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative size-28 touch-none rounded-full border border-border/80 bg-surface/70",
        className,
      )}
      onPointerDown={(e) => {
        e.preventDefault();
        pointer.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        update(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (pointer.current !== e.pointerId) return;
        update(e.clientX, e.clientY);
      }}
      onPointerUp={end}
      onPointerCancel={end}
      aria-hidden
    >
      <div
        className="absolute left-1/2 top-1/2 size-12 rounded-full bg-accent/85"
        style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
      />
    </div>
  );
}
