export type DrumSamplerVoiceState = {
  name: string;
  uri: string;
  note: number;
  startTime?: number; // Start time in seconds
  endTime?: number; // End time in seconds
  pitch?: number; // Pitch adjustment in semitones
  playbackRate?: number; // Direct playback rate multiplier
};

export class DrumSamplerVoice {
  gain: GainNode;
  pan: StereoPannerNode;
  lowShelf: BiquadFilterNode;
  highShelf: BiquadFilterNode;
  context: BaseAudioContext;

  // Store current pitch values
  private _pitch: number = 0; // in semitones
  private _playbackRate: number = 1; // direct multiplier

  constructor(context: BaseAudioContext) {
    this.context = context;
    this.lowShelf = context.createBiquadFilter();
    this.highShelf = context.createBiquadFilter();
    this.pan = context.createStereoPanner();
    this.gain = context.createGain();

    this.lowShelf.type = "lowshelf";
    this.highShelf.type = "highshelf";

    this.lowShelf.connect(this.highShelf);
    this.highShelf.connect(this.pan);
    this.pan.connect(this.gain);

    this.lowShelf.frequency.setValueAtTime(300, 0);
    this.highShelf.frequency.setValueAtTime(2000, 0);
  }

  paramsConfig(index: number): Record<string, any> {
    var result: Record<string, any> = {};
    result[`gain${index}`] = {
      defaultValue: 1,
      minValue: 0,
      maxValue: 1.5,
    };
    result[`pan${index}`] = {
      defaultValue: 0,
      minValue: -1,
      maxValue: 1,
    };
    result[`tone${index}`] = {
      defaultValue: 0,
      minValue: -1,
      maxValue: 1,
    };
    result[`startTime${index}`] = {
      defaultValue: 0,
      minValue: 0,
      maxValue: 10,
    };
    result[`endTime${index}`] = {
      defaultValue: 10,
      minValue: 0,
      maxValue: 10,
    };
    // Add pitch control (in semitones, -24 to +24 = 2 octaves range)
    result[`pitch${index}`] = {
      defaultValue: 0,
      minValue: -24,
      maxValue: 24,
    };
    // Add direct playback rate control (0.5x to 2x speed)
    result[`playbackRate${index}`] = {
      defaultValue: 1,
      minValue: 0.25,
      maxValue: 4,
    };

    return result;
  }

  internalParamsConfig(index: number): Record<string, any> {
    var result: Record<string, any> = {};
    result[`gain${index}`] = this.gain.gain;
    result[`pan${index}`] = this.pan.pan;
    result[`lowShelf${index}`] = this.lowShelf.gain;
    result[`highShelf${index}`] = this.highShelf.gain;
    result[`startTime${index}`] = { value: 0 };
    result[`endTime${index}`] = { value: 10 };
    // Add internal pitch params (these will store the current values)
    result[`pitch${index}`] = { value: 0 };
    result[`playbackRate${index}`] = { value: 1 };
    return result;
  }

  paramsMapping(index: number): Record<string, any> {
    var result: Record<string, any> = {};
    result[`tone${index}`] = {};
    result[`tone${index}`][`lowShelf${index}`] = {
      sourceRange: [0, 1],
      targetRange: [0, -60],
    };
    result[`tone${index}`][`highShelf${index}`] = {
      sourceRange: [-1, 0],
      targetRange: [-60, 0],
    };
    return result;
  }

  // Method to set pitch in semitones
  setPitch(semitones: number) {
    this._pitch = semitones;
  }

  // Method to set direct playback rate
  setPlaybackRate(rate: number) {
    this._playbackRate = Math.max(0.25, Math.min(4, rate));
  }

  // Convert semitones to playback rate multiplier
  private semitonesToPlaybackRate(semitones: number): number {
    return Math.pow(2, semitones / 12);
  }

  // Get the final playback rate (combining pitch and direct rate adjustments)
  private getFinalPlaybackRate(): number {
    const pitchRate = this.semitonesToPlaybackRate(this._pitch);
    return pitchRate * this._playbackRate;
  }

  play(
    buffer: AudioBuffer | undefined,
    startTime: number = 0,
    endTime?: number
  ) {
    if (!buffer) {
      return;
    }

    // Make sure we have valid start and end times
    startTime = Math.max(0, Math.min(startTime, buffer.duration));

    // If endTime is not provided or greater than buffer duration, use buffer duration
    const actualEndTime =
      endTime !== undefined
        ? Math.min(endTime, buffer.duration)
        : buffer.duration;

    // Make sure endTime is greater than startTime
    if (actualEndTime <= startTime) {
      return; // Invalid time range
    }

    var source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.lowShelf);

    // Apply pitch/playback rate adjustment
    const finalPlaybackRate = this.getFinalPlaybackRate();
    source.playbackRate.setValueAtTime(
      finalPlaybackRate,
      this.context.currentTime
    );

    // Start with offset and duration
    const duration = actualEndTime - startTime;
    source.start(this.context.currentTime, startTime, duration);
  }

  connect(node: AudioNode) {
    this.gain.connect(node);
  }
}
