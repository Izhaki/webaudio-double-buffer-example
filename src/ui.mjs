const toInt = (str) => parseInt(str, 10);

const toTimeDisplay = (seconds) =>
  new Date(seconds * 1000).toISOString().substring(14, 22);

export default function ui({
  frameCount,
  getCurrentHeadFrame,
  frameToSeconds,
  onPlay,
  onPause,
  onScrub,
}) {
  const time = document.getElementById("time");
  const playBtn = document.getElementById("play-btn");
  const scrubber = document.getElementById("scrubber");

  let playing = false;

  function updateTime(frame) {
    time.textContent = toTimeDisplay(frameToSeconds(frame));
  }

  function refresh() {
    if (playing) {
      const frame = getCurrentHeadFrame();
      if (frame !== null) {
        updateTime(frame);
        scrubber.value = frame;
        requestAnimationFrame(refresh);
      } else {
        pause();
      }
    }
  }

  scrubber.setAttribute("max", frameCount);
  scrubber.addEventListener("input", (event) => {
    const frame = toInt(event.target.value);
    updateTime(frame);
    onScrub(frame);
  });

  function play() {
    playing = true;
    playBtn.className = "playing";
    refresh();
  }

  function pause() {
    playing = false;
    playBtn.className = "paused";
  }

  playBtn.onclick = () => {
    if (playing) {
      onPause();
      pause();
    } else {
      onPlay();
      play();
    }
  };
}
