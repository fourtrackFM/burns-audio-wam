export class PolyphonicVoice {
  gain: GainNode;
  pan: StereoPannerNode;
  lowShelf: BiquadFilterNode;
  highShelf: BiquadFilterNode;
  context: BaseAudioContext;

  private activeSource: AudioBufferSourceNode | null = null;
  private noteNumber: number = -1;
  private startTime: number = 0;

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

  isActive(): boolean {
    return this.activeSource !== null;
  }

  getNoteNumber(): number {
    return this.noteNumber;
  }

  getAge(): number {
    return this.context.currentTime - this.startTime;
  }

  play(
    buffer: AudioBuffer | undefined,
    midiNote: number,
    baseNote: number,
    startTime: number = 0,
    endTime?: number
  ) {
    if (!buffer) {
      return;
    }

    // Stop any currently playing note
    this.stop();

    // Calculate pitch ratio based on semitone difference
    const semitoneOffset = midiNote - baseNote;
    const pitchRatio = Math.pow(2, semitoneOffset / 12);

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

    // Create and configure the audio source
    this.activeSource = this.context.createBufferSource();
    this.activeSource.buffer = buffer;
    this.activeSource.playbackRate.setValueAtTime(
      pitchRatio,
      this.context.currentTime
    );
    this.activeSource.connect(this.lowShelf);

    // Store note info for voice management
    this.noteNumber = midiNote;
    this.startTime = this.context.currentTime;

    // Set up cleanup when the source ends
    this.activeSource.onended = () => {
      this.activeSource = null;
      this.noteNumber = -1;
    };

    // Start with offset and duration
    const duration = actualEndTime - startTime;
    this.activeSource.start(this.context.currentTime, startTime, duration);
  }

  stop() {
    if (this.activeSource) {
      try {
        this.activeSource.stop();
      } catch (e) {
        // Source might already be stopped
      }
      this.activeSource = null;
      this.noteNumber = -1;
    }
  }

  connect(node: AudioNode) {
    this.gain.connect(node);
  }
}
