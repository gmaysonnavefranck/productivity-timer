import { ref, computed, onMounted, onUnmounted } from 'vue';

export function useCountdown({ getSpeedrun, onUpdate, onFinish, onSave }) {
  const now = ref(Date.now());
  let intervalId = null;

  const isRunning = computed(() => getSpeedrun().startedAt != null);

  const effectiveRemaining = computed(() => {
    const s = getSpeedrun();
    if (s.startedAt == null) return s.remainingSeconds;
    const elapsed = Math.floor((now.value - s.startedAt) / 1000);
    return Math.max(0, s.remainingSeconds - elapsed);
  });

  function runInterval() {
    if (intervalId) return;
    intervalId = setInterval(tick, 1000);
  }

  function stopInterval() {
    clearInterval(intervalId);
    intervalId = null;
  }

  function tick() {
    now.value = Date.now();
    if (effectiveRemaining.value <= 0) finishNow(true);
  }

  function start() {
    if (isRunning.value) return;
    now.value = Date.now();
    onUpdate({ startedAt: now.value });
    onSave();
    runInterval();
  }

  function pause() {
    if (!isRunning.value) return;
    onUpdate({ remainingSeconds: effectiveRemaining.value, startedAt: null });
    onSave();
    stopInterval();
  }

  function toggle() {
    if (isRunning.value) pause();
    else start();
  }

  function finishNow(auto = false) {
    const wasRunning = isRunning.value;
    if (wasRunning) pause();
    onFinish(auto);
    onSave();
  }

  onMounted(() => {
    now.value = Date.now();
    if (isRunning.value) runInterval();
  });

  onUnmounted(stopInterval);

  return { isRunning, effectiveRemaining, toggle, pause, finishNow };
}
