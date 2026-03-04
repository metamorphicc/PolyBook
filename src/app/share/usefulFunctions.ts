export function getCurrent15mEpoch() {
  const nowSec = Math.floor(Date.now() / 1000);
  const interval = 15 * 60;
  return Math.floor(nowSec / interval) * interval;
}
export function getCurrent5mEpoch() {
    const nowSec = Math.floor(Date.now() / 1000);
    const interval = 5 * 60;
    return Math.floor(nowSec / interval) * interval;
  }
  export function getCurrent1hEpoch() {
    const nowSec = Math.floor(Date.now() / 1000);
    const interval = 60 * 60;
    return Math.floor(nowSec / interval) * interval;
  }
    