import { NoteDefinition, WamAsset } from "wam-extensions";
import { MIDI, ScheduledMIDIEvent } from "../../shared/midi";
import { AudioPool } from "./AudioPool";
import { DrumSamplerVoice, DrumSamplerVoiceState } from "./Voice";

export type DrumSamplerKitState = {
  slots: DrumSamplerVoiceState[];
};

export class DrumSamplerKit {
  numVoices: number;
  audioPool: AudioPool;
  instanceId: string;
  audioContext: BaseAudioContext;

  loaded: boolean;
  state: DrumSamplerKitState;
  voices: DrumSamplerVoice[];
  buffers: (AudioBuffer | undefined)[];
  noteMap: Map<number, number[]>;

  callback?: () => void;

  constructor(
    instanceId: string,
    numVoices: number,
    audioContext: BaseAudioContext
  ) {
    this.instanceId = instanceId;
    this.audioContext = audioContext;

    this.numVoices = numVoices;
    this.voices = [];
    this.buffers = [];
    this.noteMap = new Map();

    this.audioPool = new AudioPool(audioContext);

    this.loaded = false;
    this.state = { slots: [] };

    for (var i = 0; i < numVoices; i++) {
      this.voices.push(new DrumSamplerVoice(audioContext));
      this.buffers.push(undefined);
    }
  }

  getState(): DrumSamplerKitState {
    return {
      slots: this.state.slots.map((s) => {
        return { ...s };
      }),
    };
  }

  async setState(state: DrumSamplerKitState): Promise<boolean> {
    if (state.slots) {
      return await this.updateSlots(state.slots);
    }
    return false;
  }

  async updateSlot(index: number, slot: DrumSamplerVoiceState) {
    let slots = [...this.state.slots];
    slots[index] = slot;

    await this.updateSlots(slots);
  }

  async loadFileToSlot(index: number, file: File) {
    return new Promise<void>((resolve) => {
      this.audioPool.loadSampleFromFile(file, (buffer: AudioBuffer) => {
        this.buffers[index] = buffer;

        let slot = this.state.slots[index] || ({} as DrumSamplerVoiceState);
        slot.name = file.name;
        // We'll use a special prefix to identify user uploaded files
        slot.uri = `user-upload:${file.name}`;

        // Initialize start and end times for the new sample
        slot.startTime = 0;
        slot.endTime = buffer.duration;

        // If there's no note assigned yet, keep the existing one or assign a default
        if (!slot.note && this.state.slots[index]) {
          slot.note = this.state.slots[index].note;
        } else if (!slot.note) {
          slot.note = 60; // Default to middle C if no note assigned
        }

        this.state.slots[index] = slot;

        // Update note mapping
        this.updateNoteMapping();

        if (this.callback) {
          this.callback();
        }

        resolve();
      });
    });
  }

  private updateNoteMapping() {
    let notes = new Map<number, number[]>();

    for (let i = 0; i < this.numVoices; i++) {
      if (this.state.slots[i]) {
        const arr = notes.get(this.state.slots[i].note) || [];
        arr.push(i);
        notes.set(this.state.slots[i].note, arr);
      }
    }

    this.noteMap = notes;
  }

  // New method to record audio directly to a slot
  async recordToSlot(index: number): Promise<MediaStream> {
    try {
      // Start recording using AudioPool
      const stream = await this.audioPool.startRecording();

      return stream;
    } catch (error) {
      console.error("Failed to start recording:", error);
      throw error;
    }
  }

  // New method to stop recording and save to slot
  async stopRecordingToSlot(
    index: number,
    recordingName: string
  ): Promise<void> {
    try {
      // Stop recording and get the audio buffer
      const buffer = await this.audioPool.stopRecording();

      // Save buffer to the slot
      this.buffers[index] = buffer;

      // Update slot information
      let slot = this.state.slots[index] || ({} as DrumSamplerVoiceState);
      slot.name =
        recordingName || `Recording ${new Date().toLocaleTimeString()}`;
      slot.uri = `recorded:${slot.name}`;

      // Initialize start and end times for the new sample
      slot.startTime = 0;
      slot.endTime = buffer.duration;

      // If there's no note assigned yet, keep the existing one or assign a default
      if (!slot.note && this.state.slots[index]) {
        slot.note = this.state.slots[index].note;
      } else if (!slot.note) {
        slot.note = 60; // Default to middle C if no note assigned
      }

      this.state.slots[index] = slot;

      // Update note mapping
      this.updateNoteMapping();

      if (this.callback) {
        this.callback();
      }
    } catch (error) {
      console.error("Failed to stop recording:", error);
      throw error;
    }
  }

  async updateSlots(slots: DrumSamplerVoiceState[]): Promise<boolean> {
    let notes = new Map<number, number[]>();

    var noteMapChanged = false;

    for (let i = 0; i < this.numVoices; i++) {
      if (slots[i] && slots[i].uri) {
        // new state has a value for this slot
        if (!this.state.slots[i] || slots[i].uri != this.state.slots[i].uri) {
          // url previously didn't exist, or changed

          if (window.WAMExtensions && window.WAMExtensions.assets) {
            // depend on host to load uri: might not be public URL
            window.WAMExtensions.assets
              .loadAsset(this.instanceId, slots[i].uri)
              .then(async (asset: WamAsset) => {
                if (asset.content) {
                  let buffer = await asset.content.arrayBuffer();

                  this.audioContext.decodeAudioData(
                    buffer,
                    (buffer: AudioBuffer) => {
                      this.buffers[i] = buffer;

                      // Initialize start and end times if not already set
                      if (slots[i].startTime === undefined) {
                        this.state.slots[i].startTime = 0;
                      }
                      if (slots[i].endTime === undefined) {
                        this.state.slots[i].endTime = buffer.duration;
                      }

                      if (this.callback) {
                        this.callback();
                      }
                    }
                  );
                }
              });
          } else {
            this.audioPool.loadSample(slots[i].uri, (buffer: AudioBuffer) => {
              this.buffers[i] = buffer;

              // Initialize start and end times if not already set
              if (slots[i].startTime === undefined) {
                this.state.slots[i].startTime = 0;
              }
              if (slots[i].endTime === undefined) {
                this.state.slots[i].endTime = buffer.duration;
              }

              if (this.callback) {
                this.callback();
              }
            });

            noteMapChanged = true;
          }
        }
        this.state.slots[i] = { ...slots[i] };
      } else {
        if (this.state.slots[i]) {
          noteMapChanged = true;
        }

        this.state.slots[i] = undefined;
        this.buffers[i] = undefined;
      }

      if (slots[i]) {
        var arr = notes.get(slots[i].note);
        if (!arr) {
          arr = [];
          notes.set(slots[i].note, arr);
        }
        arr.push(i);
      }
    }

    this.noteMap = notes;
    return noteMapChanged;
  }

  connect(node: AudioNode) {
    for (let v of this.voices) {
      v.connect(node);
    }
  }

  processMIDIEvents(midiEvents: ScheduledMIDIEvent[]) {
    midiEvents.forEach((message) => {
      if (message.event[0] == MIDI.NOTE_ON && message.event[2] > 0) {
        let midiNote = message.event[1];
        let voices = this.noteMap.get(midiNote);
        if (voices) {
          for (let i of voices) {
            const slot = this.state.slots[i];
            const startTime = slot.startTime || 0;
            const endTime = slot.endTime;
            this.voices[i].play(this.buffers[i], startTime, endTime);
          }
        }
      }
    });
  }

  notes(): NoteDefinition[] {
    var notes: NoteDefinition[] = [];
    this.state.slots.forEach((slot: DrumSamplerVoiceState) => {
      if (!slot) {
        return;
      }
      notes.push({
        blackKey: false,
        name: slot.name,
        number: slot.note,
      });
    });

    notes = notes.sort((a, b) => a.number - b.number);

    return notes;
  }
}
