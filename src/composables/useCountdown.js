import { ref, onUnmounted } from 'vue';
import { tickRemaining, elapsedSince } from '../timerMath.mjs';

export function useCountdown({ getRemaining, onTick, onFinish, onSave }) {
  const isRunning = ref(false);
  let intervalId = null;
  let lastTickAt = null;

  function stopInterval() {
    isRunning.value = false;
    clearInterval(intervalId);
    intervalId = null;
    lastTickAt = null;
  }

  function tick() {
    const elapsed = elapsedSince(lastTickAt);
    lastTickAt = Date.now();
    const remaining = tickRemaining(getRemaining(), elapsed);
    onTick(remaining);
    if (remaining <= 0) finishNow(true);
  }

  function finishNow(auto = false) {
    stopInterval();
    onFinish(auto);
    onSave();
  }

  function toggle() {
    if (isRunning.value) {
      stopInterval();
      onSave();
    } else {
      isRunning.value = true;
      lastTickAt = Date.now();
      intervalId = setInterval(tick, 1000);
    }
  }

  onUnmounted(stopInterval);

  return { isRunning, toggle, stopInterval, finishNow };
}
