"use client";

import {
  DEFAULT_TRADING_SETTINGS,
  type FastAsset,
  type FastTimeframe,
  type TradingSettings,
} from "./tradingSettings";

const SETTINGS_ASSETS: FastAsset[] = ["BTC", "ETH", "SOL", "XRP"];
const SETTINGS_TIMEFRAMES: FastTimeframe[] = ["5m", "15m", "1h"];

/**
 * Risk presets and market filters.
 *
 * Shared by the profile page and the terminal's settings drawer so both edit one
 * source of truth — the guards in `useOrderTicket` read exactly these values.
 * `compact` drops to a single column for the drawer.
 */
export function PositionSettingsPanel({
  settings,
  onChange,
  compact = false,
}: {
  settings: TradingSettings;
  onChange: (settings: TradingSettings) => void;
  compact?: boolean;
}) {
  const update = (patch: Partial<TradingSettings>) => {
    onChange({ ...settings, ...patch });
  };
  const updateQuickSize = (index: number, value: string) => {
    const next = [...settings.quickSizes];
    next[index] = value;
    update({ quickSizes: next });
  };
  const updateAsset = (asset: FastAsset, enabled: boolean) => {
    update({
      allowedAssets: { ...settings.allowedAssets, [asset]: enabled },
    });
  };
  const updateTimeframe = (timeframe: FastTimeframe, enabled: boolean) => {
    update({
      allowedTimeframes: {
        ...settings.allowedTimeframes,
        [timeframe]: enabled,
      },
    });
  };

  return (
    <section
      className={
        compact ? "grid gap-4" : "grid gap-5 lg:grid-cols-[1.2fr_1fr]"
      }
    >
      <Panel title="Risk and execution">
        <div className="grid gap-4">
          <div className={compact ? "grid gap-3" : "grid gap-3 md:grid-cols-2"}>
            <SettingsInput
              label="Default order size"
              value={settings.defaultOrderSize}
              suffix="pUSD"
              onChange={(value) => update({ defaultOrderSize: value })}
            />
            <SettingsInput
              label="Max order size"
              value={settings.maxOrderSize}
              suffix="pUSD"
              onChange={(value) => update({ maxOrderSize: value })}
            />
            <SettingsInput
              label="Max position per market"
              value={settings.maxPositionSize}
              suffix="pUSD"
              onChange={(value) => update({ maxPositionSize: value })}
            />
            <SettingsInput
              label="Max spread"
              value={settings.maxSpreadPercent}
              suffix="%"
              onChange={(value) => update({ maxSpreadPercent: value })}
            />
            <SettingsInput
              label="Minimum side liquidity"
              value={settings.minBookLiquidity}
              suffix="shares"
              onChange={(value) => update({ minBookLiquidity: value })}
            />
          </div>

          <div className="border theme-border bg-[var(--surface-muted)] p-4">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide theme-muted">
              Quick sizes
            </div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {settings.quickSizes.map((value, index) => (
                <input
                  key={index}
                  value={value}
                  onChange={(event) =>
                    updateQuickSize(index, event.target.value)
                  }
                  inputMode="decimal"
                  className="border theme-border bg-[var(--terminal-bg)] px-3 py-2 font-mono text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                />
              ))}
            </div>
          </div>

          <div className={compact ? "grid gap-2" : "grid gap-2 md:grid-cols-2"}>
            <SettingsToggle
              label="Post-only by default"
              text="Avoid crossing the spread when possible."
              checked={settings.postOnly}
              onChange={(value) => update({ postOnly: value })}
            />
            <SettingsToggle
              label="Require explicit send"
              text="Stage first, send only by button."
              checked={settings.requireConfirm}
              onChange={(value) => update({ requireConfirm: value })}
            />
            <SettingsToggle
              label="One-click mode"
              text="Click a live book cell to send immediately."
              checked={settings.oneClickTrading}
              onChange={(value) => update({ oneClickTrading: value })}
            />
            <SettingsToggle
              label="Warn on expiring markets"
              text="Flag the countdown in the last seconds of a window."
              checked={settings.autoCloseOnMarketEnd}
              onChange={(value) => update({ autoCloseOnMarketEnd: value })}
            />
          </div>
        </div>
      </Panel>

      <Panel title="Fast market filters">
        <div className="flex h-full flex-col gap-5">
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide theme-muted">
              Assets
            </div>
            <div className="grid grid-cols-2 gap-2">
              {SETTINGS_ASSETS.map((asset) => (
                <SettingsCheckbox
                  key={asset}
                  label={asset}
                  checked={settings.allowedAssets[asset]}
                  onChange={(value) => updateAsset(asset, value)}
                />
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide theme-muted">
              Timeframes
            </div>
            <div className="grid grid-cols-3 gap-2">
              {SETTINGS_TIMEFRAMES.map((timeframe) => (
                <SettingsCheckbox
                  key={timeframe}
                  label={timeframe}
                  checked={settings.allowedTimeframes[timeframe]}
                  onChange={(value) => updateTimeframe(timeframe, value)}
                />
              ))}
            </div>
          </div>

          <div className="mt-auto border theme-border bg-[var(--surface-muted)] p-4">
            <div className="text-xs font-semibold uppercase tracking-wide theme-muted">
              Current preset
            </div>
            <div className="mt-3 grid gap-2 font-mono text-xs text-[var(--foreground)]">
              <div>Size: {settings.defaultOrderSize} pUSD</div>
              <div>Max order: {settings.maxOrderSize} pUSD</div>
              <div>Spread guard: {settings.maxSpreadPercent}%</div>
              <div>
                Execution: {settings.postOnly ? "post-only" : "standard"}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onChange(DEFAULT_TRADING_SETTINGS)}
              className="mt-4 border theme-border px-3 py-2 text-xs font-semibold text-[var(--foreground)] transition hover:border-[var(--accent)] hover:bg-[var(--surface-soft)]"
            >
              Reset preset
            </button>
          </div>
        </div>
      </Panel>
    </section>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-col border theme-border theme-surface shadow-sm">
      <div className="border-b theme-border px-5 py-4 text-sm font-semibold text-[var(--foreground)]">
        {title}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">{children}</div>
    </div>
  );
}

function SettingsInput({
  label,
  value,
  suffix,
  onChange,
}: {
  label: string;
  value: string;
  suffix: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block border theme-border bg-[var(--surface-muted)] p-3">
      <span className="text-[11px] uppercase tracking-wide theme-muted">
        {label}
      </span>
      <span className="mt-2 grid grid-cols-[1fr_auto] items-center gap-2">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          inputMode="decimal"
          className="min-w-0 bg-transparent font-mono text-lg text-[var(--foreground)] outline-none"
        />
        <span className="text-xs theme-muted">{suffix}</span>
      </span>
    </label>
  );
}

function SettingsToggle({
  label,
  text,
  checked,
  onChange,
}: {
  label: string;
  text: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 border theme-border bg-[var(--surface-muted)] p-3">
      <span>
        <span className="block text-sm font-medium text-[var(--foreground)]">
          {label}
        </span>
        <span className="mt-1 block text-xs theme-muted">{text}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-[var(--accent)]"
      />
    </label>
  );
}

function SettingsCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center justify-between border px-3 py-2 font-mono text-sm transition ${
        checked
          ? "border-[var(--accent)] bg-[var(--surface-soft)] text-[var(--foreground)]"
          : "theme-border bg-[var(--surface-muted)] theme-muted"
      }`}
    >
      {label}
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-[var(--accent)]"
      />
    </label>
  );
}
