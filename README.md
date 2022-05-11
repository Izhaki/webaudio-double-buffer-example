Accurate timing and low latency are critical to many audio applications, like editors and sequencers.

This repo demonstrates the **double-buffer** strategy, similar to the one used in DAWs and native applications.

This is an alternative strategy to [Chris Wilson's A Tale Of Two Clocks](https://www.html5rocks.com/en/tutorials/audio/scheduling/), as [mentioned on MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Advanced_techniques#playing_the_audio_in_time), which uses **timeouts**.

# Demo

The demo loads a song, and allow to play/pause and scrub using a slider.

All the double-buffer logic is in `src/transport.mjs`.

<details>
<summary>A note on delay logs.</summary>

The app logs to the console the _event lag_ per frame - the delay (in samples) between when the "buffer ended" event should have arrived, and when it actually arrived.

Delays may be caused by extra browser/machine activity (for example, opening the browser's developer tools yield such delay).

Under "normal" working conditions and on a modern machine, the delay is 0-128 samples.

Long delays (especially those approaching the buffer size) mean the app has less time to calculate the next buffer. This can cause audio drop-outs.

</details>

<p align="center">

![App user interface](/images/double-buffer-ui.jpg)

<p>

## Serving locally

```
$ npm install -g serve
$ serve
```

# Double Buffering

With double-buffering:

- The user chooses a buffer size.
- The smaller the buffer size, the lower the latency (time for UI changes to reflect in sound).
- For non-web applications on modern machines a buffer size of 1024 samples would be considered high.
- With a sample rate of 44100, 1024 samples equate 2.3 milliseconds.
- The latency is twice the buffer size.

Then the algorithm goes as follows:

- The user presses play.
- The app calculates the first audio buffer (buffer 1), and schedule it for playback.
- Once done it immediately calculates the second audio buffer (buffer 2) and schedule it right after buffer 1.
- When buffer 1 ends, the app is notified, it calculates the next audio buffer (buffer 3) and schedules it right after (the currently playing) buffer 2.
- The last step repeats until the user presses stop.

The can be depicted like so:

![The double-buffer flow](/images/algorithm.jpeg)

Note that there is no audio playing during the buffer 0 frame. This is because we must tell the app when to schedule its audio, and the end of the first buffer is sensible.

# How DAWs differ?

The Web Audio API employs a "push" strategy, in that it lets us schedule many sounds either immediately, or at some time in the future. This is outright fitting for many use cases, like games. The API also allows the configuration of a graph to manipulate these sounds.

However, native audio APIs use a "pull" strategy in that they simply call the app requesting a _single_ buffer to play next (once the current buffer playback has ended). The app must have the buffer ready - calculating it while the current buffer is played.

The same approach can be taken with Web Audio, but it means that instead of scheduling many buffers, we only schedule a _single_ buffer at the time. This means we cannot use the graph (say for mixing multiple audio sources, or gain processors).
