let ctx: AudioContext | null = null

/** Short synthesized camera click, so no audio file has to load. */
export function playShutter() {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    const now = ctx.currentTime
    const length = Math.floor(ctx.sampleRate * 0.12)
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < length; i++) {
      // Two quick clicks: shutter open and close.
      const t = i / ctx.sampleRate
      const env = Math.exp(-t * 90) + (t > 0.06 ? Math.exp(-(t - 0.06) * 110) * 0.7 : 0)
      data[i] = (Math.random() * 2 - 1) * env
    }
    const src = ctx.createBufferSource()
    src.buffer = buffer
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 2400
    const gain = ctx.createGain()
    gain.gain.value = 0.6
    src.connect(filter).connect(gain).connect(ctx.destination)
    src.start(now)
  } catch {
    // Sound is a nice-to-have; ignore browsers that block audio.
  }
}
