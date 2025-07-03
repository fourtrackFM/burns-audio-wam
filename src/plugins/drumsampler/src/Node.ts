/* eslint-disable no-underscore-dangle */
import {
  CompositeAudioNode,
  ParamMgrNode,
} from "@webaudiomodules/sdk-parammgr";
import { ScheduledMIDIEvent } from "../../shared/midi";
import { DrumSamplerKit, DrumSamplerKitState } from "./Kit";

export const NUM_VOICES = 16;

export type DrumSamplerState = {
  params?: any;
  kit: DrumSamplerKitState;
};

export class DrumSamplerNode extends CompositeAudioNode {
  compressor: DynamicsCompressorNode;
  kit: DrumSamplerKit;
  paramMgr: ParamMgrNode;
  callback?: () => void;

  constructor(
    instanceId: string,
    audioContext: BaseAudioContext,
    options = {}
  ) {
    super(audioContext, options);
    this.kit = new DrumSamplerKit(instanceId, NUM_VOICES, audioContext);
    this.kit.callback = () => {
      if (this.callback) {
        this.callback();
      }
    };

    this.createNodes();
  }

  async getState(): Promise<any> {
    let state = {
      params: await super.getState(),
      kit: this.kit.getState(),
    };

    return state;
  }

  async setState(state: DrumSamplerState) {
    if (!state) {
      return;
    }
    if (state.params) {
      await super.setState(state.params);
    }
    if (state.kit) {
      let changed = this.kit.setState(state.kit);

      if (changed) {
        this.updateNoteExtension();
      }
    }
  }

	setup(paramMgr: ParamMgrNode) {
        // @ts-ignore
        paramMgr.addEventListener('wam-midi', (e) => this.processMIDIEvents([{event: e.detail.data.bytes, time: 0}]));

    // Listen for parameter changes
    // @ts-ignore
    paramMgr.addEventListener("wam-automation", (e) =>
      this.handleParameterChange(e.detail.data.id, e.detail.data.value)
    );

    this._wamNode = paramMgr;
    this.paramMgr = paramMgr;
  }

  handleParameterChange(paramId: string, value: number) {
    switch (paramId) {
      case "mode":
        this.kit.setMode(value > 0.5 ? "polyphonic" : "drum");
        break;
      case "polyphonicSampleIndex":
        this.kit.setPolyphonicSampleIndex(Math.round(value));
        break;
      case "polyphonicStartNote":
        this.kit.setPolyphonicStartNote(Math.round(value));
        break;
    }
  }

  processMIDIEvents(midiEvents: ScheduledMIDIEvent[]) {
    this.kit.processMIDIEvents(midiEvents);
  }

  isEnabled = true;
  set status(_sig: boolean) {
    this.isEnabled = _sig;
  }

  /*  #########  Personnal code for the web audio graph  #########   */
  createNodes() {
    this.compressor = this.context.createDynamicsCompressor();
    this._output = this.context.createGain();

    this.compressor.connect(this._output);
    this.kit.connect(this.compressor);
  }

  updateNoteExtension() {
    if (!(window.WAMExtensions && window.WAMExtensions.notes)) {
      return;
    }

    let notes = this.kit.notes();

    window.WAMExtensions.notes.setNoteList(this.instanceId, notes);
  }
}
