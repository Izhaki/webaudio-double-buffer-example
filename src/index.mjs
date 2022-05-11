import transport from "./transport.mjs";
import ui from "./ui.mjs";
import loadFile from "./loadFile.mjs";

const { floor } = Math;

const sampleRate = 44100;
const bufferSize = 4096;

function frameToSeconds(frame) {
  const samplesPlayed = frame * bufferSize;
  return samplesPlayed / sampleRate;
}

const audioContext = new window.AudioContext({ sampleRate });
const channels = await loadFile(audioContext, "/audio/lonely-side-of-town.mp3");
const sampleCount = channels[0].length; // How many samples in the file.
const frameCount = floor(sampleCount / bufferSize); // How many frame in the file.

function createBuffer(length) {
  return audioContext.createBuffer(channels.length, length, sampleRate);
}

function getSubArray(array, start, length) {
  const end = start + length + 1;
  // We use `subarray` here, which does not copy any memory.
  return array.subarray(start, end);
}

function scheduleFrame(startTime, startSample, sampleCount) {
  // Calculate the frame buffer.
  const frameBuffer = createBuffer(sampleCount);
  channels.forEach((channel, channelIndex) => {
    const samples = channels[channelIndex];

    const frameSamples = getSubArray(samples, startSample, sampleCount);
    frameBuffer.copyToChannel(frameSamples, channelIndex);
  });

  // Schedule the frame.
  const frameSource = audioContext.createBufferSource();
  frameSource.buffer = frameBuffer;
  frameSource.connect(audioContext.destination);
  frameSource.start(startTime);
}

const { play, pause, getCurrentHeadFrame, setHeadFrame } = transport({
  audioContext,
  bufferSize,
  frameCount,
  scheduleFrame,
});

ui({
  frameCount,
  getCurrentHeadFrame,
  frameToSeconds,
  onPlay: play,
  onPause: pause,
  onScrub: setHeadFrame,
});
