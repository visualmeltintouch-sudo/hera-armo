"use client";

import { useState } from "react";

type KeyboardVariant = "text" | "email" | "tel";

interface KioskKeyboardProps {
  visible: boolean;
  value: string;
  label: string;
  variant: KeyboardVariant;
  onChange: (value: string) => void;
  onClose: () => void;
}

const ROW_NUM = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
const ROW_1 = ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"];
const ROW_2 = ["a", "s", "d", "f", "g", "h", "j", "k", "l"];
const ROW_3 = ["z", "x", "c", "v", "b", "n", "m"];

function Key({
  label,
  onPress,
  wide,
  active,
}: {
  label: string;
  onPress: () => void;
  wide?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onPress}
      className={`h-[124px] ${wide ? "w-[144px] shrink-0" : "flex-1"} rounded-3xl text-[1.575rem] font-semibold transition-transform active:scale-90 select-none ${
        active ? "bg-primary text-white" : "bg-muted text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function KeyRow({
  keys,
  onPress,
  shift,
}: {
  keys: string[];
  onPress: (c: string) => void;
  shift?: boolean;
}) {
  return (
    <div className="flex flex-1 gap-4">
      {keys.map((k) => (
        <Key key={k} label={shift ? k.toUpperCase() : k} onPress={() => onPress(k)} />
      ))}
    </div>
  );
}

export function KioskKeyboard({
  visible,
  value,
  label,
  variant,
  onChange,
  onClose,
}: KioskKeyboardProps) {
  const [shift, setShift] = useState(false);

  function press(char: string) {
    onChange(value + (shift ? char.toUpperCase() : char));
    if (shift) setShift(false);
  }
  function backspace() {
    onChange(value.slice(0, -1));
  }
  function space() {
    onChange(value + " ");
  }
  function close() {
    onClose();
    (document.activeElement as HTMLElement)?.blur?.();
  }

  const quickKey = variant === "email" ? "@" : variant === "tel" ? "+" : null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 flex justify-center transition-transform duration-300 ease-out"
      style={{ transform: visible ? "translateY(0)" : "translateY(100%)" }}
      aria-hidden={!visible}
    >
      <div className="w-full max-w-[1080px] bg-card rounded-t-[48px] shadow-2xl px-8 pt-6 pb-10">
        <div className="flex items-center justify-between mb-4 px-2">
          <p className="text-[1.4rem] font-semibold uppercase tracking-widest text-muted-foreground">
            {label}
          </p>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={close}
            className="text-[1.4rem] font-bold text-primary px-8 py-3 rounded-full border-2 border-primary"
          >
            Fine
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex gap-4">
            <KeyRow keys={ROW_NUM} onPress={press} />
          </div>
          <div className="flex gap-4">
            <KeyRow keys={ROW_1} onPress={press} shift={shift} />
          </div>
          <div className="flex gap-4 px-[52px]">
            <KeyRow keys={ROW_2} onPress={press} shift={shift} />
          </div>
          <div className="flex gap-4">
            <Key label="⇧" wide active={shift} onPress={() => setShift((s) => !s)} />
            <KeyRow keys={ROW_3} onPress={press} shift={shift} />
            <Key label="⌫" wide onPress={backspace} />
          </div>
          <div className="flex gap-4 mt-2">
            {quickKey && <Key label={quickKey} onPress={() => press(quickKey)} />}
            <Key label="." onPress={() => press(".")} />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={space}
              className="flex-[3] h-[124px] rounded-3xl bg-muted text-foreground font-semibold text-[1.575rem] select-none active:scale-[0.98] transition-transform"
            >
              spazio
            </button>
            <Key label="-" onPress={() => press("-")} />
          </div>
        </div>
      </div>
    </div>
  );
}
