export default async function loadFile(audioContext, url) {
  const channels = [];
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();

  const songBuffer = await audioContext.decodeAudioData(buffer);

  /*
  `getChannelData` can take quite some time for large files (eg, ~20ms per channel for a 3m long 
  file). As we are going to use this immutable data many times per second, we just store it
  in memory - the `channels` array.
  */
  const { numberOfChannels } = songBuffer;
  for (let channel = 0; channel < numberOfChannels; channel++) {
    channels[channel] = songBuffer.getChannelData(channel);
  }
  return channels;
}
