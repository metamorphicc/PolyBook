import Image from "next/image";
import Link from "next/link";
import { getAppMode, isTradingMode } from "./lib/appMode";
import styles from "./portfolio.module.css";

export default function Main() {
  const mode = getAppMode();
  const trading = isTradingMode(mode);

  return (
    <main className={styles.page}>
      <nav className={styles.commandNav} aria-label="Primary navigation">
        <Link href="/" className={styles.commandMark}>
          <span aria-hidden="true">$</span> polybook
        </Link>
        <div className={styles.commandLinks}>
          <a href="#workspace">--workspace</a>
          <a href="#architecture">--architecture</a>
          <Link href="/terminal">--open-terminal</Link>
          <span className={styles.cursor} aria-hidden="true">▮</span>
        </div>
      </nav>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>
            {trading
              ? "Trading workspace · authenticated execution"
              : "Product portfolio · market research"}
          </p>
          <h1>
            {trading
              ? "Move from market signal to guarded execution."
              : "Read the fast market before you touch the orderbook."}
          </h1>
          <p className={styles.lede}>
            PolyBook brings Polymarket quotes, crypto reference data, staged order
            controls, and account state into one keyboard-first workspace.
          </p>
        </div>
        <dl className={styles.scope} aria-label="Product scope">
          <div><dt>Markets</dt><dd>BTC · ETH · SOL · XRP</dd></div>
          <div><dt>Windows</dt><dd>5m · 15m · 1h</dd></div>
          <div>
            <dt>Mode</dt>
            <dd>{trading ? "Wallet-backed trading" : "Read-only portfolio"}</dd>
          </div>
        </dl>
      </section>

      <section id="workspace" className={styles.workbench} aria-labelledby="workspace-title">
        <div className={styles.sectionHead}>
          <p>01 / Workspace</p>
          <h2 id="workspace-title">One screen for the decision loop.</h2>
        </div>
        <figure className={styles.capture}>
          <Image
            src="/terminal-preview.png"
            alt="PolyBook terminal showing a market rail, chart, orderbook, and blotter"
            width={1600}
            height={1000}
            priority
          />
          <figcaption>
            Select a market, compare the live book with the reference chart, stage
            an order, then review positions and fills without changing context.
          </figcaption>
        </figure>
      </section>

      <section id="architecture" className={styles.architecture} aria-labelledby="architecture-title">
        <div className={styles.sectionHead}>
          <p>02 / Boundaries</p>
          <h2 id="architecture-title">
            {trading
              ? "Execution stays behind explicit account and risk checks."
              : "Market research stays useful without wallet access."}
          </h2>
        </div>
        <ol className={styles.flow}>
          <li><span>01</span><strong>Resolve</strong><p>Find the active fast-market window and its outcome tokens.</p></li>
          <li><span>02</span><strong>Observe</strong><p>Read public CLOB books, price history, and reference crypto data.</p></li>
          <li><span>03</span><strong>Guard</strong><p>Validate spread, size, liquidity, network, and wallet readiness.</p></li>
          <li>
            <span>04</span>
            <strong>{trading ? "Submit" : "Review"}</strong>
            <p>
              {trading
                ? "Send an order only after wallet, session, balance, and allowance checks pass."
                : "Inspect the full decision workspace without connecting a wallet or sending an order."}
            </p>
          </li>
        </ol>
      </section>

      <aside className={styles.stickyCta}>
        <div>
          <strong>Explore the terminal</strong>
          <span>
            {trading
              ? "Authenticated account data and guarded order execution."
              : "Live public market data. No wallet access or order submission."}
          </span>
        </div>
        <Link href="/terminal">Open workspace →</Link>
      </aside>

      <footer className={styles.footer}>
        <span>Next.js · TypeScript · Polymarket CLOB · MySQL · WalletConnect</span>
        <a href="https://github.com/metamorphicc/PolyBook" target="_blank" rel="noreferrer">Source ↗</a>
      </footer>
    </main>
  );
}
