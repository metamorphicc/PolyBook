# Trading release checklist

Run this on the dedicated trading test deployment with a separate test wallet
and the minimum practical balance. Record the deployment URL, Git commit, wallet
address, Deposit Wallet address, time, tester, and result. Never use the public
portfolio project for this test.

## Automated gate

- [ ] CI passes for both `portfolio` and `trading`.
- [ ] `npm audit --omit=dev` reports no high or critical vulnerabilities.
- [ ] Remote trading smoke passes with live market data:

```powershell
$env:SMOKE_BASE_URL='https://<test-deployment>'
$env:SMOKE_EXPECT_MODE='trading'
$env:SMOKE_CHECK_MARKET_DATA='1'
npm run smoke
```

## Wallet and authentication

- [ ] Open the exact `NEXT_PUBLIC_APP_URL` in a clean browser profile.
- [ ] Connect the test wallet and switch to Polygon when prompted.
- [ ] Inspect the EIP-4361 message before signing: domain and URI equal the test
      deployment, chain ID is 137, and the message has an expiration time.
- [ ] Confirm `/api/session` reports the connected EOA only after signing.
- [ ] Disconnect, reconnect another wallet, and confirm the first wallet's
      Deposit Wallet and balances are not shown.

## Account preparation

- [ ] Click **Enable trading** once. There is one PolyBook login signature and,
      when required, Polymarket authentication/deployment signatures.
- [ ] Confirm a deterministic Deposit Wallet is shown and persists after a page
      reload, while trading itself returns to the disabled state until enabled
      again (API credentials are intentionally memory-only).
- [ ] Confirm the Deposit Wallet is deployed and the UI reports a collateral
      balance and allowance without an unexplained `allowance: 0` error.
- [ ] If funding is needed, send only the minimum supported Polygon collateral
      to the displayed Deposit Wallet and verify the balance refreshes.

## Order lifecycle

- [ ] Select an active fast market with a non-empty orderbook.
- [ ] Enable post-only mode.
- [ ] Prepare a small GTC limit buy that does not cross the spread and satisfies
      the market's minimum size. Verify side, token, price, shares, and notional
      before submission.
- [ ] Submit the order. The ticket must display the returned status and order or
      trade reference; a generic success toast is not sufficient.
- [ ] Confirm the order appears in **Orders** with the same side, price, and
      original size.
- [ ] Cancel the order and confirm it disappears after refresh.
- [ ] If testing a fill is authorized, submit only the pre-agreed minimal order,
      verify the fill in **Fills**, verify the position and PnL, then close it and
      record both returned references. Otherwise mark the fill/close sub-step as
      intentionally not run; do not manufacture a live fill merely to complete
      a checklist.

## Negative cases

- [ ] In portfolio mode, `/profile` and all private APIs return 404.
- [ ] In trading mode without a session, wallet storage and builder signing
      return 401.
- [ ] A builder-sign request for anything except `POST /submit` returns 403.
- [ ] A relayer payload whose `from` differs from the signed-in EOA returns 403.
- [ ] An order larger than the displayed balance is blocked before signing.
- [ ] Reloading the page removes the in-memory trading credential and requires
      explicit re-activation.

## Release decision

- [ ] No unresolved wallet, auth, market-data, approval, submission, result,
      cancellation, or account-isolation errors remain.
- [ ] The portfolio smoke test still passes against the public portfolio URL.
- [ ] The exact tested trading build is promoted; no environment variable is
      changed between the passing run and promotion except the separately tested
      canonical URL when attaching a final domain.

If any required item fails, the decision is **do not launch yet**. Save the
browser console error, failed request/response status, order reference (when one
exists), and Git commit with the bug report.
