import { useEffect, useMemo, useState } from "react";
import { Bookmark, BookmarkCheck, Check, Copy, Minus, Plus, Trash2 } from "lucide-react";
import {
  estimatePassphraseEntropy,
  estimatePasswordEntropy,
  generatePassphrase,
  generatePassword,
  strengthFromEntropy,
  type StrengthLevel,
} from "../lib/generator";
import { readStorage, writeStorage } from "../lib/storage";

type Mode = "password" | "passphrase";

type Settings = {
  mode: Mode;
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
  wordCount: number;
  separator: string;
  capitalize: boolean;
  includeNumber: boolean;
  quantity: number;
};

type BatchItem = {
  id: string;
  value: string;
  mode: Mode;
};

type SavedItem = BatchItem & { savedAt: number };

const SETTINGS_KEY = "passcraft:settings";
const BATCH_KEY = "passcraft:batch";
const SAVED_KEY = "passcraft:saved";

const DEFAULT_SETTINGS: Settings = {
  mode: "password",
  length: 10,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
  wordCount: 4,
  separator: "-",
  capitalize: true,
  includeNumber: false,
  quantity: 5,
};

const SEPARATORS: { label: string; value: string }[] = [
  { label: "hyphen", value: "-" },
  { label: "underscore", value: "_" },
  { label: "period", value: "." },
  { label: "space", value: " " },
];

const STRENGTH_COPY: Record<StrengthLevel, string> = {
  weak: "weak",
  fair: "fair",
  good: "good",
  strong: "strong",
  "very strong": "very strong",
};

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createBatchItem(settings: Settings): BatchItem {
  const value =
    settings.mode === "password"
      ? generatePassword(settings)
      : generatePassphrase(settings);
  return { id: newId(), value, mode: settings.mode };
}

export default function PasswordGenerator() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [batch, setBatch] = useState<BatchItem[]>([]);
  const [saved, setSaved] = useState<SavedItem[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Load persisted state on mount (client-only; SSR has no window).
  useEffect(() => {
    setSettings(readStorage(SETTINGS_KEY, DEFAULT_SETTINGS));
    setBatch(readStorage<BatchItem[]>(BATCH_KEY, []));
    setSaved(readStorage<SavedItem[]>(SAVED_KEY, []));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) writeStorage(SETTINGS_KEY, settings);
  }, [settings, hydrated]);

  useEffect(() => {
    if (hydrated) writeStorage(BATCH_KEY, batch);
  }, [batch, hydrated]);

  useEffect(() => {
    if (hydrated) writeStorage(SAVED_KEY, saved);
  }, [saved, hydrated]);

  useEffect(() => {
    if (!copiedId) return;
    const timeout = setTimeout(() => setCopiedId(null), 1600);
    return () => clearTimeout(timeout);
  }, [copiedId]);

  const activeCharTypeCount = [
    settings.uppercase,
    settings.lowercase,
    settings.numbers,
    settings.symbols,
  ].filter(Boolean).length;

  const entropyBits =
    settings.mode === "password"
      ? estimatePasswordEntropy(settings)
      : estimatePassphraseEntropy(settings);
  const strength = strengthFromEntropy(entropyBits);

  const savedValues = useMemo(() => new Set(saved.map((item) => item.value)), [saved]);

  function updateSettings(patch: Partial<Settings>) {
    setSettings((prev) => ({ ...prev, ...patch }));
  }

  function toggleCharType(key: "uppercase" | "lowercase" | "numbers" | "symbols") {
    setSettings((prev) => {
      const next = !prev[key];
      const remainingActive = [prev.uppercase, prev.lowercase, prev.numbers, prev.symbols].filter(
        Boolean
      ).length;
      // Refuse to turn off the last remaining character type.
      if (!next && remainingActive <= 1) return prev;
      return { ...prev, [key]: next };
    });
  }

  function handleGenerate() {
    const items = Array.from({ length: settings.quantity }, () => createBatchItem(settings));
    setBatch(items);
  }

  function handleClearBatch() {
    setBatch([]);
  }

  async function handleCopy(item: BatchItem) {
    try {
      await navigator.clipboard.writeText(item.value);
      setCopiedId(item.id);
    } catch {
      // Clipboard access denied - nothing more we can do here.
    }
  }

  function toggleSave(item: BatchItem) {
    setSaved((prev) => {
      const exists = prev.find((s) => s.value === item.value);
      if (exists) return prev.filter((s) => s.value !== item.value);
      return [{ ...item, id: newId(), savedAt: Date.now() }, ...prev];
    });
  }

  function removeSaved(id: string) {
    setSaved((prev) => prev.filter((item) => item.id !== id));
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
      <header className="mb-10 max-w-xl">
        <p className="text-xs text-ink-soft">Generated in your browser. Nothing is sent anywhere.</p>
        <h1 className="mt-3 font-display text-4xl font-semibold italic text-ink sm:text-5xl">
          PassCraft
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          Create a batch of passwords or passphrases. Tune exactly what goes into them and copy
          or keep the ones you want. Your settings and saved list stay on this device.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[21rem_1fr] lg:items-start">
        <Controls
          settings={settings}
          activeCharTypeCount={activeCharTypeCount}
          entropyBits={entropyBits}
          strength={strength}
          onUpdate={updateSettings}
          onToggleCharType={toggleCharType}
          onGenerate={handleGenerate}
        />

        <div className="flex flex-col gap-6">
          <ResultsPanel
            batch={batch}
            copiedId={copiedId}
            savedValues={savedValues}
            onCopy={handleCopy}
            onToggleSave={toggleSave}
            onClear={handleClearBatch}
          />

          {saved.length > 0 && (
            <SavedPanel
              saved={saved}
              copiedId={copiedId}
              onCopy={handleCopy}
              onRemove={removeSaved}
            />
          )}
        </div>
      </div>

      <footer className="mt-14 border-t border-line pt-6 text-xs leading-relaxed text-ink-soft">
        Passwords are generated locally using your browser's Web Crypto API. Settings, the
        current batch, and anything you save are kept in this browser's localStorage only.
      </footer>
    </div>
  );
}

function Controls({
  settings,
  activeCharTypeCount,
  entropyBits,
  strength,
  onUpdate,
  onToggleCharType,
  onGenerate,
}: {
  settings: Settings;
  activeCharTypeCount: number;
  entropyBits: number;
  strength: StrengthLevel;
  onUpdate: (patch: Partial<Settings>) => void;
  onToggleCharType: (key: "uppercase" | "lowercase" | "numbers" | "symbols") => void;
  onGenerate: () => void;
}) {
  return (
    <div className="border border-ink bg-surface p-5 lg:sticky lg:top-6">
      <div className="segmented w-full">
        <button
          type="button"
          className="flex-1"
          data-active={settings.mode === "password"}
          onClick={() => onUpdate({ mode: "password" })}
        >
          Password
        </button>
        <button
          type="button"
          className="flex-1"
          data-active={settings.mode === "passphrase"}
          onClick={() => onUpdate({ mode: "passphrase" })}
        >
          Passphrase
        </button>
      </div>

      <div className="mt-6 flex flex-col gap-6">
        {settings.mode === "password" ? (
          <>
            <SliderField
              label="Length"
              value={settings.length}
              unit={settings.length === 1 ? "character" : "characters"}
              min={4}
              max={64}
              onChange={(length) => onUpdate({ length })}
            />

            <div className="flex flex-col gap-3">
              <ToggleRow
                label="Uppercase"
                hint="A–Z"
                checked={settings.uppercase}
                onChange={() => onToggleCharType("uppercase")}
              />
              <ToggleRow
                label="Lowercase"
                hint="a–z"
                checked={settings.lowercase}
                onChange={() => onToggleCharType("lowercase")}
              />
              <ToggleRow
                label="Numbers"
                hint="0–9"
                checked={settings.numbers}
                onChange={() => onToggleCharType("numbers")}
              />
              <ToggleRow
                label="Symbols"
                hint="!@#$…"
                checked={settings.symbols}
                onChange={() => onToggleCharType("symbols")}
              />
              {activeCharTypeCount === 1 && (
                <p className="text-xs text-ink-soft">
                  At least one character type has to stay on.
                </p>
              )}
            </div>
          </>
        ) : (
          <>
            <SliderField
              label="Words"
              value={settings.wordCount}
              unit={settings.wordCount === 1 ? "word" : "words"}
              min={3}
              max={10}
              onChange={(wordCount) => onUpdate({ wordCount })}
            />

            <div>
              <p className="text-sm text-ink">Separator</p>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {SEPARATORS.map((sep) => (
                  <button
                    key={sep.value}
                    type="button"
                    title={sep.label}
                    aria-label={sep.label}
                    aria-pressed={settings.separator === sep.value}
                    onClick={() => onUpdate({ separator: sep.value })}
                    className={`border py-2 text-sm ${
                      settings.separator === sep.value
                        ? "border-ink bg-ink text-paper"
                        : "border-line text-ink-soft"
                    }`}
                  >
                    {sep.value === " " ? "␣" : sep.value}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <ToggleRow
                label="Capitalize"
                hint="Word → Word"
                checked={settings.capitalize}
                onChange={() => onUpdate({ capitalize: !settings.capitalize })}
              />
              <ToggleRow
                label="Include a number"
                hint="adds one digit pair"
                checked={settings.includeNumber}
                onChange={() => onUpdate({ includeNumber: !settings.includeNumber })}
              />
            </div>
          </>
        )}

        <div>
          <p className="text-sm text-ink">How many to generate</p>
          <div className="mt-2 flex items-center border border-line">
            <button
              type="button"
              aria-label="Fewer passwords"
              className="p-2.5 text-ink-soft hover:text-ink disabled:opacity-30"
              disabled={settings.quantity <= 1}
              onClick={() => onUpdate({ quantity: Math.max(1, settings.quantity - 1) })}
            >
              <Minus size={14} />
            </button>
            <span className="flex-1 text-center text-sm tabular-nums">{settings.quantity}</span>
            <button
              type="button"
              aria-label="More passwords"
              className="p-2.5 text-ink-soft hover:text-ink disabled:opacity-30"
              disabled={settings.quantity >= 20}
              onClick={() => onUpdate({ quantity: Math.min(20, settings.quantity + 1) })}
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={onGenerate}
          className="bg-ink py-3 text-sm text-paper transition-colors hover:bg-accent"
        >
          Generate {settings.quantity > 1 ? `${settings.quantity} ` : ""}
          {settings.mode === "password" ? "passwords" : "passphrases"}
        </button>

        <p className="-mt-2 text-center text-xs text-ink-soft">
          ~{Math.round(entropyBits)} bits of entropy each · {STRENGTH_COPY[strength]}
        </p>
      </div>
    </div>
  );
}

function SliderField({
  label,
  value,
  unit,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label className="text-sm text-ink">{label}</label>
        <span className="text-sm tabular-nums text-ink-soft">
          {value} {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-3"
      />
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button type="button" className="toggle-row" onClick={onChange}>
      <span className="text-sm text-ink">
        {label} <span className="text-ink-soft">{hint}</span>
      </span>
      <span className="switch" data-checked={checked} role="switch" aria-checked={checked}>
        <span className="switch-thumb" />
      </span>
    </button>
  );
}

function ResultsPanel({
  batch,
  copiedId,
  savedValues,
  onCopy,
  onToggleSave,
  onClear,
}: {
  batch: BatchItem[];
  copiedId: string | null;
  savedValues: Set<string>;
  onCopy: (item: BatchItem) => void;
  onToggleSave: (item: BatchItem) => void;
  onClear: () => void;
}) {
  return (
    <section className="border border-ink bg-surface">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <h2 className="text-sm text-ink">
          Generated{" "}
          <span className="text-ink-soft">
            {batch.length > 0 ? `· ${batch.length}` : ""}
          </span>
        </h2>
        {batch.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-ink-soft transition-colors hover:text-clay"
          >
            Clear
          </button>
        )}
      </div>

      {batch.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <p className="text-sm text-ink-soft">
            Set your options on the left and generate to see passwords here.
          </p>
        </div>
      ) : (
        <ul>
          {batch.map((item, index) => (
            <ResultRow
              key={item.id}
              item={item}
              index={index}
              copied={copiedId === item.id}
              saved={savedValues.has(item.value)}
              onCopy={() => onCopy(item)}
              onToggleSave={() => onToggleSave(item)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function ResultRow({
  item,
  index,
  copied,
  saved,
  onCopy,
  onToggleSave,
}: {
  item: BatchItem;
  index: number;
  copied: boolean;
  saved: boolean;
  onCopy: () => void;
  onToggleSave: () => void;
}) {
  return (
    <li
      className="ledger-row flex items-center gap-3 border-b border-line px-5 py-3 last:border-b-0 hover:bg-accent-soft/40"
      style={{ animationDelay: `${Math.min(index, 12) * 35}ms` }}
    >
      <span className="w-6 shrink-0 text-xs text-ink-soft tabular-nums">
        {String(index + 1).padStart(2, "0")}
      </span>
      <span className="flex-1 select-all break-all text-sm tracking-wide text-ink">
        {item.value}
      </span>
      <button
        type="button"
        onClick={onToggleSave}
        aria-label={saved ? "Remove from saved" : "Save this one"}
        aria-pressed={saved}
        className={`p-1.5 transition-colors ${saved ? "text-gold" : "text-ink-soft hover:text-ink"}`}
      >
        {saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
      </button>
      <button
        type="button"
        onClick={onCopy}
        aria-label="Copy to clipboard"
        className={`flex items-center gap-1.5 border px-2.5 py-1.5 text-xs transition-colors ${
          copied ? "border-accent text-accent" : "border-line text-ink-soft hover:border-ink hover:text-ink"
        }`}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
        {copied ? "Copied" : "Copy"}
      </button>
    </li>
  );
}

function SavedPanel({
  saved,
  copiedId,
  onCopy,
  onRemove,
}: {
  saved: SavedItem[];
  copiedId: string | null;
  onCopy: (item: BatchItem) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <section className="border border-ink bg-surface">
      <div className="border-b border-line px-5 py-3">
        <h2 className="text-sm text-ink">
          Saved <span className="text-ink-soft">· {saved.length}</span>
        </h2>
      </div>
      <ul>
        {saved.map((item) => (
          <li
            key={item.id}
            className="flex items-center gap-3 border-b border-line px-5 py-3 last:border-b-0"
          >
            <span className="flex-1 select-all break-all text-sm tracking-wide text-ink">
              {item.value}
            </span>
            <button
              type="button"
              onClick={() => onCopy(item)}
              aria-label="Copy to clipboard"
              className={`flex items-center gap-1.5 border px-2.5 py-1.5 text-xs transition-colors ${
                copiedId === item.id
                  ? "border-accent text-accent"
                  : "border-line text-ink-soft hover:border-ink hover:text-ink"
              }`}
            >
              {copiedId === item.id ? <Check size={14} /> : <Copy size={14} />}
              {copiedId === item.id ? "Copied" : "Copy"}
            </button>
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              aria-label="Remove from saved"
              className="p-1.5 text-ink-soft transition-colors hover:text-clay"
            >
              <Trash2 size={16} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
