const { round } = Math;

export default function transport({
  // Web Audio context.
  audioContext,
  // The requested buffer size. Latency is bufferSize * 2.
  bufferSize,
  // Total frames in the song, so we know when to stop.
  frameCount,
  // A callback asking consumers to schedule a frame
  scheduleFrame,
}) {
  const { sampleRate } = audioContext;
  const frameDuration = bufferSize / sampleRate;
  const blankBuffer = audioContext.createBuffer(1, bufferSize, sampleRate);

  /**
   * The playback starts when the user presses play, and continues until pause is pressed.
   *
   * It is oblivious to the actual head position of the audio being played (which can change with
   * rewind, scrub or loops).
   *
   * Note that the first buffer is scheduled to play one frame (duration) after playback starts,
   * so the audio will only be heard then.
   */
  const playback = {
    // Pressing play makes this true, pause makes this false.
    on: false,
    // The amount of frames that have been queued since playback began.
    queuedFramesCount: 0,
    // Start time, in audio context time. Determined by the user pressing play.
    startTime: null,
  };

  /**
   * The position (in frames) of the material being played. This is user controlled and will change
   * when the user rewinds, scrubs, or loops the content.
   */
  let headFrame = 0;

  /**
   * Currently queued frames. There will be 2, barring a fraction of time between the end of a
   * frame playback and the queuing of another one.
   */
  const queuedFrames = [];

  /**
   * Logs to the console how late the buffer playback end event was. The longer it is, the less
   * time for the app to schedule another frame.
   *
   * For instance, if the buffer size is 4096, and the lag is 3000 samples, the app will only have
   * time equivalent to 1096 samples to schedule the buffer after the currently playing one.
   */
  function logEventLag(frame) {
    const eventTime = audioContext.currentTime;
    const expectedTime = frame.startTime + frameDuration;
    const timeLag = eventTime - expectedTime;
    const samplesLag = round(timeLag * sampleRate);
    console.log(samplesLag);
  }

  function createBlankBufferSource() {
    const source = audioContext.createBufferSource();
    source.buffer = blankBuffer;
    source.connect(audioContext.destination);
    return source;
  }

  /**
   * @returns the (audioCotext) start time of the next frame. Used for scheduling the next frame.
   */
  function getNextFrameScheduleTime() {
    playback.queuedFramesCount += 1;
    const startTime =
      playback.startTime + playback.queuedFramesCount * frameDuration;
    return startTime;
  }

  /**
   * Called when the currently played frame has ended.
   */
  function onFramePlayed() {
    const frame = queuedFrames.shift();

    logEventLag(frame);

    if (playback.on) {
      queueFrame();
    }
  }

  /**
   * Queue (ie, schedule) a frame.
   */
  function queueFrame() {
    // Stop if we reached the end of content
    if (headFrame >= frameCount) {
      pause();
      return;
    }

    // Prepare a buffer source.
    const source = createBlankBufferSource();
    // Listen to the `end` event so we can queue another frame.
    source.addEventListener("ended", onFramePlayed);

    const startTime = getNextFrameScheduleTime();

    // Save the currently queued frame so we can stop it later and get the current head frame for
    // the UI.
    queuedFrames.push({
      source,
      headFrame,
      startTime,
    });

    // Ask the consumer to schedule a frame.
    scheduleFrame(
      // The (audio context) time at which the frame should start.
      startTime,
      // The (song) sample index this frame begins with.
      headFrame * bufferSize,
      // The frame size
      bufferSize
    );
    headFrame += 1;

    // Schedule our empty source buffer at the frame start time.
    source.start(startTime);
  }

  function play() {
    playback.on = true;
    playback.startTime = audioContext.currentTime;
    playback.queuedFramesCount = 0;

    queueFrame();
    queueFrame();
  }

  function pause() {
    playback.on = false;
    queuedFrames.forEach((frame) => frame.source.stop());
  }

  function setHeadFrame(frame) {
    headFrame = frame;
  }

  /**
   *
   * @returns the head (ie, content position) of the currently playing frame
   */
  function getCurrentHeadFrame() {
    return queuedFrames[0] ? queuedFrames[0].headFrame : null;
  }

  return {
    play,
    pause,
    getCurrentHeadFrame,
    setHeadFrame,
  };
}
