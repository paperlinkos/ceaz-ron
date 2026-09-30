import confetti from 'canvas-confetti';

/**
 * Vibrant celebratory color palette tailored for CEAZ1 Reachout Nigeria:
 * - Nigerian Emerald Green: #008751
 * - Neon Harvest Green: #00ff87
 * - Victory Gold: #FFD700
 * - Radiant Amber: #ffaa00
 * - Pure White: #ffffff
 */
const CAMPAIGN_COLORS = ['#008751', '#00ff87', '#FFD700', '#ffaa00', '#ffffff'];

let activeInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Triggers a full-screen, high-energy stadium confetti celebration.
 * Fires multi-directional cannons from both sides and star bursts from center.
 */
export function fireFullCelebration(durationMs = 5000): void {
  // Clear any existing celebration interval
  if (activeInterval) {
    clearInterval(activeInterval);
    activeInterval = null;
  }

  const animationEnd = Date.now() + durationMs;
  const defaults = {
    startVelocity: 45,
    spread: 360,
    ticks: 80,
    zIndex: 999999,
    colors: CAMPAIGN_COLORS,
    disableForReducedMotion: true,
  };

  // 1. Initial explosive blast from center
  confetti({
    ...defaults,
    particleCount: 100,
    origin: { x: 0.5, y: 0.5 },
    spread: 100,
    startVelocity: 55,
  });

  // 2. Continuous multi-cannon streams from left and right edges
  activeInterval = setInterval(() => {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      if (activeInterval) clearInterval(activeInterval);
      activeInterval = null;
      return;
    }

    const particleCount = 40 * (timeLeft / durationMs);

    // Left cannon shooting up & inwards
    confetti({
      ...defaults,
      particleCount: Math.floor(particleCount),
      angle: 60,
      spread: 65,
      origin: { x: 0, y: 0.75 },
    });

    // Right cannon shooting up & inwards
    confetti({
      ...defaults,
      particleCount: Math.floor(particleCount),
      angle: 120,
      spread: 65,
      origin: { x: 1, y: 0.75 },
    });

    // Random star drops from sky
    if (Math.random() > 0.6) {
      confetti({
        ...defaults,
        particleCount: 25,
        shapes: ['circle', 'square'],
        origin: { x: 0.2 + Math.random() * 0.6, y: 0.1 },
        gravity: 0.8,
        scalar: 1.1,
      });
    }
  }, 220);
}

/**
 * Generates an uplifting celebratory victory chime chord using Web Audio API.
 * Safely plays without needing any external audio assets.
 */
export function playCelebrationSound(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    // Triumphant fanfare frequencies (C5, E5, G5, C6)
    const notes = [523.25, 659.25, 783.99, 1046.5];
    const now = ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.001, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.18, now + idx * 0.08 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 1.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 1.3);
    });
  } catch (err) {
    // Audio autoplay restrictions or unsupported context
    console.debug('Audio autoplay restriction, continuing visual celebration:', err);
  }
}

export const CELEBRATED_STORAGE_KEY = 'ron_celebrated_zonal_milestones';

/**
 * Resets local storage of celebrated milestones so testing or next intervals can re-trigger.
 */
export function resetCelebratedMilestones(): void {
  try {
    localStorage.removeItem(CELEBRATED_STORAGE_KEY);
  } catch (e) {
    console.warn('Could not reset celebrated milestones:', e);
  }
}
