import { h, Component } from "preact";
import { Knob } from "../../../shared/ui/Knob";

import DrumSampler from "..";

import styleRoot from "./DrumSamplerView.scss";
import { DrumSamplerKit } from "../Kit";
import { DrumSamplerVoiceState } from "../Voice";
import { WaveformView } from "./WaveformView";
import { WamAsset } from "wam-extensions";

// @ts-ignore
let styles = styleRoot.locals as typeof styleRoot;

const c = (a: string[]) => a.filter((el) => !!el).join(" ");

type KitPad = {
  label: string;
  note: number;
};

type Kit = {
  pads: KitPad[];
};

export interface DrumSamplerViewProps {
  plugin: DrumSampler;
  initialState: Record<string, number>;
}

type DrumSamplerState = {
  selectedPad: number;
  isRecording: boolean;
  recordingStream: MediaStream | null;
};

export class DrumSamplerView extends Component<
  DrumSamplerViewProps,
  DrumSamplerState
> {
  wamState!: Record<string, number>;
  automationStatePoller: number;
  kit: DrumSamplerKit;

  constructor() {
    super();
    this.pollAutomationState = this.pollAutomationState.bind(this);
    this.state = {
      selectedPad: 0,
      isRecording: false,
      recordingStream: null,
    };
  }

  componentWillMount(): void {
    this.wamState = this.props.initialState;
    this.kit = this.props.plugin.audioNode.kit;
    this.props.plugin.audioNode.callback = () => {
      this.forceUpdate();
    };
  }

  componentDidMount() {
    this.automationStatePoller = window.requestAnimationFrame(
      this.pollAutomationState
    );
  }

  componentWillUnmount() {
    window.cancelAnimationFrame(this.automationStatePoller);
    this.props.plugin.audioNode.callback = undefined;

    // Make sure we stop any ongoing recording
    if (this.state.isRecording && this.state.recordingStream) {
      this.state.recordingStream.getTracks().forEach((track) => track.stop());
    }
  }

  renderVoice(index: number) {
    var slot = this.kit.state.slots[index];
    var voice = this.kit.voices[index];

    return (
      <div style="display: flex; flex-direction: column; padding-left: 5px; padding-right: 5px; width: 60px;">
        <label>{index + 1}</label>
        {this.knob("Tone", `tone${index + 1}`, -1, 1)}
        {this.knob("Pan", `pan${index + 1}`, -1, 1)}
        {this.knob("Gain", `gain${index + 1}`, 0, 1.5)}

        <label>{slot ? slot.name : ""}</label>
      </div>
    );
  }

  selectPad(index: number) {
    this.setState({ selectedPad: index });
  }

  renderPad(index: number) {
    let slot = this.kit.state.slots[index];

    return (
      <div class={styles.padContainer}>
        <div
          class={c([
            styles.pad,
            this.state.selectedPad == index && styles.padSelected,
          ])}
          onClick={() => this.selectPad(index)}
        >
          <div class={styles.padLabel}>{slot?.name}</div>
        </div>
      </div>
    );
  }

  renderPadRow(index: number) {
    return (
      <div class={styles.padRow}>
        {this.renderPad(index)}
        {this.renderPad(index + 1)}
        {this.renderPad(index + 2)}
        {this.renderPad(index + 3)}
      </div>
    );
  }

  renderPads() {
    return (
      <div class={styles.bigPanel}>
        {this.renderPadRow(12)}
        {this.renderPadRow(8)}
        {this.renderPadRow(4)}
        {this.renderPadRow(0)}
      </div>
    );
  }

  loadAsset(index: number) {
    if (!window.WAMExtensions.assets) {
      console.error("Host must implement asset WAM extension");
      return;
    }

    let backupSlot = { ...this.kit.state.slots[index] };

    window.WAMExtensions.assets.pickAsset(
      this.props.plugin.instanceId,
      "AUDIO",
      async (asset: WamAsset) => {
        if (asset) {
          let slot = { ...this.kit.state.slots[index] };
          slot.name = asset.name;
          slot.uri = asset.uri;

          await this.kit.updateSlot(index, slot);

          this.forceUpdate();
        } else {
          await this.kit.updateSlot(index, backupSlot);
        }
      }
    );
  }

  renderEditorTitleBar(index: number, slot: DrumSamplerVoiceState) {
    return (
      <div class={styles.editorTitleBar}>
        <div class={styles.editorTitle}>{slot.name}</div>
        <div>
          <button
            class={styles.button}
            style={
              this.state.isRecording
                ? "background-color: #c03030; animation: pulse 2s infinite;"
                : ""
            }
            onClick={() => {
              this.handleRecord(index);
            }}
          >
            {this.state.isRecording ? "Stop" : "Record"}
          </button>
          <button
            class={styles.button}
            style="margin-left: 4px;"
            onClick={() => {
              this.handleFileUpload(index);
            }}
          >
            Upload
          </button>
          <button
            class={styles.button}
            style="margin-left: 4px;"
            onClick={() => {
              this.loadAsset(index);
            }}
          >
            Load
          </button>
        </div>
      </div>
    );
  }

  handleFileUpload(index: number) {
    // Create a hidden file input element
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "audio/*";
    fileInput.style.display = "none";
    document.body.appendChild(fileInput);

    // Handle file selection
    fileInput.onchange = async (event) => {
      const target = event.target as HTMLInputElement;
      const files = target.files;

      if (files && files.length > 0) {
        const file = files[0];
        await this.kit.loadFileToSlot(index, file);
        this.forceUpdate();
      }

      // Clean up the file input
      document.body.removeChild(fileInput);
    };

    // Trigger the file dialog
    fileInput.click();
  }

  renderWaveform() {
    let index = this.state.selectedPad;
    let buffer = this.props.plugin.audioNode.kit.buffers[index];
    let slot = this.kit.state.slots[index];

    return (
      <WaveformView
        width={400}
        height={175}
        buffer={buffer}
        startTime={slot?.startTime}
        endTime={slot?.endTime}
        onStartTimeChange={(time) => this.handleStartTimeChange(index, time)}
        onEndTimeChange={(time) => this.handleEndTimeChange(index, time)}
      />
    );
  }

  handleStartTimeChange(index: number, time: number) {
    // Update the start time for the selected pad
    let slot = { ...this.kit.state.slots[index] };
    slot.startTime = time;
    this.kit.updateSlot(index, slot);

    // Update the parameter value
    const paramName = `startTime${index + 1}`;
    this.parameterChanged(paramName, time);

    this.forceUpdate();
  }

  handleEndTimeChange(index: number, time: number) {
    // Update the end time for the selected pad
    let slot = { ...this.kit.state.slots[index] };
    slot.endTime = time;
    this.kit.updateSlot(index, slot);

    // Update the parameter value
    const paramName = `endTime${index + 1}`;
    this.parameterChanged(paramName, time);

    this.forceUpdate();
  }

  renderControls(slot: DrumSamplerVoiceState) {
    let index = this.state.selectedPad;
    let buffer = this.props.plugin.audioNode.kit.buffers[index];
    const maxDuration = buffer ? buffer.duration : 10;

    return (
      <div>
        <div class={styles.controlPanel}>
          <div class={styles.controlPanelHead}>Output</div>
          <div class={styles.controlPanelContent}>
            {this.knob("Tone", `tone${index + 1}`, -1, 1)}
            {this.knob("Pan", `pan${index + 1}`, -1, 1)}
            {this.knob("Gain", `gain${index + 1}`, 0, 1.5)}
          </div>
        </div>

        <div class={styles.controlPanel}>
          <div class={styles.controlPanelHead}>Sample Timing</div>
          <div class={styles.controlPanelContent}>
            {this.knob(
              "Start",
              `startTime${index + 1}`,
              0,
              maxDuration,
              slot.startTime || 0
            )}
            {this.knob(
              "End",
              `endTime${index + 1}`,
              0,
              maxDuration,
              slot.endTime || maxDuration
            )}
          </div>
          <div style="font-size: 10px; padding: 4px; text-align: center;">
            Drag markers on waveform or use knobs to adjust
          </div>
        </div>
      </div>
    );
  }

  renderPadEditor() {
    let slot = this.kit.state.slots[this.state.selectedPad];
    if (!slot) {
      console.error("no slot, something went wrong");
      return <div></div>;
    }

    return (
      <div class={styles.bigPanel}>
        <div style="display: flex; flex-direction: column;">
          {this.renderEditorTitleBar(this.state.selectedPad, slot)}
          {this.state.isRecording ? (
            <div style="width: 400px; height: 175px; background-color: #c03030; display: flex; justify-content: center; align-items: center; animation: pulseBg 2s infinite;">
              <div style="color: #ffffff; font-size: 24px; font-weight: bold; text-align: center;">
                Recording...
              </div>
            </div>
          ) : (
            this.renderWaveform()
          )}
        </div>

        {this.renderControls(slot)}
      </div>
    );
  }

  render() {
    h("div", {});

    return (
      <div class={styles.root}>
        {this.renderPads()}
        {this.renderPadEditor()}
      </div>
    );
  }

  knob(
    label: string,
    param: string,
    low: number,
    high: number,
    initialValue?: number
  ) {
    return (
      <div class={styles.knobContainer}>
        <Knob
          label={label}
          size={40}
          bipolar={low < 0}
          defaultValue={
            initialValue !== undefined ? initialValue : low < 0 ? 0 : 1
          }
          minimumValue={low}
          maximumValue={high}
          value={() => this.value(param)}
          onChange={(e) => this.parameterChanged(param, e)}
        />
      </div>
    );
  }

  parameterChanged(name: string, value: number) {
    this.wamState[name] = value;

    this.props.plugin.audioNode.paramMgr.setParamValue(name, value);
  }

  async pollAutomationState() {
    this.wamState =
      await this.props.plugin.audioNode.paramMgr.getParamsValues();
    this.automationStatePoller = window.requestAnimationFrame(
      this.pollAutomationState
    );
  }

  value(name: string) {
    if (this.wamState && this.wamState[name]) {
      return this.wamState[name];
    } else {
      return 0;
    }
  }

  // Handle recording functionality
  async handleRecord(index: number) {
    if (this.state.isRecording) {
      try {
        // Generate a default name for the recording
        const recordingName = `Recording ${new Date().toLocaleTimeString()}`;

        // Stop recording and save to slot
        await this.kit.stopRecordingToSlot(index, recordingName);

        // Update component state
        this.setState({
          isRecording: false,
          recordingStream: null,
        });

        this.forceUpdate();
      } catch (error) {
        console.error("Error stopping recording:", error);
        alert("Failed to stop recording. See console for details.");
      }
    } else {
      try {
        // Start recording
        const stream = await this.kit.recordToSlot(index);

        // Update component state
        this.setState({
          isRecording: true,
          recordingStream: stream,
        });
      } catch (error) {
        console.error("Error starting recording:", error);
        alert(
          "Failed to start recording. Make sure microphone access is allowed."
        );
      }
    }
  }
}
