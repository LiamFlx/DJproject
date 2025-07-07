/**
 * Audio Debugger Utility
 * 
 * This utility helps diagnose audio playback issues by checking various
 * common problems and providing helpful debug information.
 */

/**
 * Checks if audio is working properly in the browser
 * @returns Object with diagnostic information
 */
export function diagnoseAudioIssues(): { 
  canPlayAudio: boolean; 
  issues: string[];
  audioContext: boolean;
  autoplayAllowed: boolean;
} {
  const issues: string[] = [];
  let canPlayAudio = true;
  let audioContextWorks = false;
  let autoplayAllowed = false;

  // Check if Audio API is available
  if (typeof Audio === 'undefined') {
    issues.push('Audio API is not available in this browser');
    canPlayAudio = false;
  }

  // Check if AudioContext is available
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) {
      issues.push('AudioContext is not supported in this browser');
    } else {
      const ctx = new AudioContext();
      audioContextWorks = ctx.state !== 'closed';
      if (ctx.state === 'suspended') {
        issues.push('AudioContext is suspended. User interaction needed to resume');
      }
      // Clean up
      if (ctx.state !== 'closed') {
        ctx.close();
      }
    }
  } catch (error) {
    issues.push(`AudioContext error: ${error instanceof Error ? error.message : String(error)}`);
    audioContextWorks = false;
  }

  // Check for autoplay policy
  const autoplayTest = document.createElement('audio');
  autoplayTest.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAAA='; // Silent audio
  
  autoplayTest.play()
    .then(() => {
      autoplayAllowed = true;
      console.log('✅ Autoplay is allowed');
    })
    .catch(error => {
      autoplayAllowed = false;
      issues.push(`Autoplay blocked: ${error instanceof Error ? error.message : String(error)}`);
      console.warn('⚠️ Autoplay is blocked by browser policy');
    });

  // Check volume settings
  const testAudio = new Audio();
  if (testAudio.volume === 0) {
    issues.push('Default audio volume is 0');
  }
  if (testAudio.muted) {
    issues.push('Audio is muted by default');
  }

  // Check for browser-specific issues
  const ua = navigator.userAgent;
  if (ua.includes('Safari') && !ua.includes('Chrome') && !ua.includes('Firefox')) {
    issues.push('Safari may require user interaction before playing audio');
  }
  
  if (ua.includes('Firefox') && ua.includes('Mobile')) {
    issues.push('Firefox Mobile has stricter autoplay policies');
  }

  return {
    canPlayAudio,
    issues,
    audioContext: audioContextWorks,
    autoplayAllowed
  };
}

/**
 * Attempts to fix common audio issues
 * @returns Promise resolving to true if fixes were applied
 */
export async function fixCommonAudioIssues(): Promise<boolean> {
  let fixed = false;

  // Try to resume AudioContext
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContext) {
      const ctx = new AudioContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
        fixed = true;
        console.log('✅ AudioContext resumed');
      }
    }
  } catch (error) {
    console.warn('Failed to resume AudioContext:', error);
  }

  // Unlock audio on iOS
  const unlockAudio = () => {
    const silentAudio = new Audio();
    silentAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAAA=';
    silentAudio.load();
    silentAudio.play()
      .then(() => {
        console.log('✅ Audio unlocked');
        fixed = true;
      })
      .catch(e => console.warn('Failed to unlock audio:', e));
  };

  // Try to unlock audio
  unlockAudio();

  // Add event listeners to unlock audio on user interaction
  const events = ['touchstart', 'touchend', 'mousedown', 'keydown'];
  const unlockOnce = () => {
    unlockAudio();
    events.forEach(e => document.removeEventListener(e, unlockOnce));
  };
  events.forEach(e => document.addEventListener(e, unlockOnce));

  return fixed;
}

/**
 * Logs the current state of all audio elements on the page
 */
export function logAudioElementsState(): void {
  const audioElements = document.querySelectorAll('audio');
  console.log(`Found ${audioElements.length} audio elements on the page`);
  
  audioElements.forEach((audio, index) => {
    console.log(`Audio #${index}:`, {
      src: audio.src.substring(0, 50) + '...',
      paused: audio.paused,
      muted: audio.muted,
      volume: audio.volume,
      currentTime: audio.currentTime,
      duration: audio.duration,
      readyState: audio.readyState,
      error: audio.error ? audio.error.message : null
    });
  });
}

/**
 * Forces audio playback by creating a user interaction event
 */
export function forceAudioPlayback(): void {
  // Create a temporary button
  const tempButton = document.createElement('button');
  tempButton.style.position = 'fixed';
  tempButton.style.top = '-9999px';
  tempButton.style.left = '-9999px';
  tempButton.textContent = 'Enable Audio';
  document.body.appendChild(tempButton);
  
  // Simulate a click
  tempButton.click();
  
  // Clean up
  setTimeout(() => {
    document.body.removeChild(tempButton);
  }, 100);
  
  console.log('🔊 Forced audio playback through simulated user interaction');
}