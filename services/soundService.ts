export const AVAILABLE_SOUNDS = [
  { name: 'Subtle Alert', url: '/sounds/alert_subtle.mp3' },
  { name: 'Digital Ping', url: '/sounds/alert_digital.mp3' },
  { name: 'Upbeat Chime', url: '/sounds/alert_chime.mp3' },
];

let audio: HTMLAudioElement | null = null;

export const playSound = (soundUrl: string) => {
  if (typeof window !== 'undefined') {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    audio = new Audio(soundUrl);
    audio.play().catch(error => {
      console.error("Error playing sound:", error);
      // Autoplay is often blocked by browsers until the user interacts with the page.
    });
  }
};
