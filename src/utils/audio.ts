/**
 * Web Audio API notification sound generator.
 * Plays a clean, professional chime sound without external file dependencies.
 */

let audioCtx: AudioContext | null = null;

/**
 * Verifica si Web Audio API está disponible en el navegador.
 * Útil para navegadores antiguos o entornos sin soporte de audio.
 */
export function isAudioSupported(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
}

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    } else {
      console.warn("[Audio] Web Audio API no está soportada en este navegador.");
      return null;
    }
  }
  return audioCtx;
}

/**
 * Plays a pleasant, dual-tone harmonic chime (e.g. Ding-Dong) to notify of new orders.
 * Safe to call; handles browser autoplay blocks gracefully.
 * @returns Promise<boolean> true if audio played, false if context was suspended or failed.
 */
export async function playNewOrderSound(): Promise<boolean> {
  const ctx = getAudioContext();
  if (!ctx) return false;

  try {
    // If context is suspended (blocked by autoplay policy), try to resume it
    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    if (ctx.state === "suspended") {
      console.warn("AudioContext is suspended. Autoplay policy block in effect.");
      return false;
    }

    const now = ctx.currentTime;

    // --- First Tone: E5 (659.25 Hz) ---
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(659.25, now); // E5 note
    
    // Smooth volume ramp to avoid pop sounds
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.25, now + 0.05);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    
    osc1.start(now);
    osc1.stop(now + 0.35);

    // --- Second Tone: A5 (880.00 Hz) - slightly offset ---
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880.00, now + 0.12); // A5 note
    
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.setValueAtTime(0, now + 0.12);
    gain2.gain.linearRampToValueAtTime(0.25, now + 0.17);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    
    osc2.start(now + 0.12);
    osc2.stop(now + 0.55);

    return true;
  } catch (error) {
    console.error("Failed to generate notification chime:", error);
    return false;
  }
}

/**
 * Explicitly triggers a test sound and attempts to resume/unlock the AudioContext.
 * Call this from a user-interaction handler (e.g. click).
 */
export async function forceAudioUnlock(): Promise<boolean> {
  const ctx = getAudioContext();
  if (!ctx) return false;
  
  try {
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
    return await playNewOrderSound();
  } catch (error) {
    console.error("Failed to unlock AudioContext:", error);
    return false;
  }
}
