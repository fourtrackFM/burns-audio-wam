import { h, Component } from "preact";

export interface WaveformViewProps {
  width: number;
  height: number;
  buffer: AudioBuffer;
  startTime?: number;
  endTime?: number;
  onStartTimeChange?: (time: number) => void;
  onEndTimeChange?: (time: number) => void;
}

type WaveformFrame = {
  min: number;
  max: number;
};

export class WaveformView extends Component<WaveformViewProps, any> {
  canvasRef?: HTMLCanvasElement;
  canvas?: CanvasRenderingContext2D;
  container?: HTMLDivElement;
  isDraggingStart: boolean = false;
  isDraggingEnd: boolean = false;

  setupContainer(ref: HTMLDivElement | null) {
    if (!ref) {
      return;
    }
    this.container = ref;
    this.setup();
  }

  setupCanvas(ref: HTMLCanvasElement | null) {
    if (!ref) {
      return;
    }
    this.canvasRef = ref;

    // Set up mouse event handlers for dragging markers
    ref.addEventListener("mousedown", this.handleMouseDown);
    ref.addEventListener("mousemove", this.handleMouseMove);
    ref.addEventListener("mouseup", this.handleMouseUp);
    ref.addEventListener("mouseleave", this.handleMouseUp);

    this.setup();
  }

  handleMouseDown = (e: MouseEvent) => {
    if (!this.canvasRef || !this.props.buffer) return;

    const rect = this.canvasRef.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const bufferDuration = this.props.buffer.duration;
    const clickTime = (x / this.props.width) * bufferDuration;

    // Check if click is near the start marker
    if (this.props.startTime !== undefined) {
      const startPos =
        (this.props.startTime / bufferDuration) * this.props.width;
      if (Math.abs(x - startPos) < 5) {
        this.isDraggingStart = true;
        e.preventDefault();
        return;
      }
    }

    // Check if click is near the end marker
    if (this.props.endTime !== undefined) {
      const endPos = (this.props.endTime / bufferDuration) * this.props.width;
      if (Math.abs(x - endPos) < 5) {
        this.isDraggingEnd = true;
        e.preventDefault();
        return;
      }
    }
  };

  handleMouseMove = (e: MouseEvent) => {
    if (!this.canvasRef || !this.props.buffer) return;
    if (!this.isDraggingStart && !this.isDraggingEnd) return;

    const rect = this.canvasRef.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const bufferDuration = this.props.buffer.duration;
    const newTime = Math.max(
      0,
      Math.min((x / this.props.width) * bufferDuration, bufferDuration)
    );

    if (this.isDraggingStart && this.props.onStartTimeChange) {
      // Ensure start time doesn't exceed end time
      if (this.props.endTime === undefined || newTime < this.props.endTime) {
        this.props.onStartTimeChange(newTime);
      }
    } else if (this.isDraggingEnd && this.props.onEndTimeChange) {
      // Ensure end time doesn't precede start time
      if (
        this.props.startTime === undefined ||
        newTime > this.props.startTime
      ) {
        this.props.onEndTimeChange(newTime);
      }
    }
  };

  handleMouseUp = () => {
    this.isDraggingStart = false;
    this.isDraggingEnd = false;
  };

  componentWillUnmount() {
    if (this.canvasRef) {
      this.canvasRef.removeEventListener("mousedown", this.handleMouseDown);
      this.canvasRef.removeEventListener("mousemove", this.handleMouseMove);
      this.canvasRef.removeEventListener("mouseup", this.handleMouseUp);
      this.canvasRef.removeEventListener("mouseleave", this.handleMouseUp);
    }
  }

  calculateWaveform(channel: number): WaveformFrame[] {
    let data = this.props.buffer.getChannelData(0);
    let count = this.props.width;

    let result: WaveformFrame[] = [];

    let samplesPerPixel = data.length / count;

    let min = 0;
    let max = 0;
    let acc = 0;
    for (let i = 0; i < data.length; i++) {
      if (data[i] < min) {
        min = data[i];
      }
      if (data[i] > max) {
        max = data[i];
      }
      acc++;
      if (acc > samplesPerPixel) {
        result.push({ min, max });
        min = data[i];
        max = data[i];
        acc = 0;
      }
    }

    return result;
  }

  draw() {
    this.canvas.beginPath();
    this.canvas.rect(0, 0, this.props.width, this.props.height);
    this.canvas.fillStyle = "rgb(0,0,0)";
    this.canvas.fill();

    if (!this.props.buffer) {
      return;
    }

    let waveform = this.calculateWaveform(0);
    this.canvas.beginPath();
    this.canvas.lineWidth = 1;
    this.canvas.strokeStyle = "green";
    let mid = this.props.height / 2;
    for (let i = 0; i < waveform.length; i++) {
      this.canvas.moveTo(i, Math.round(mid + mid * waveform[i].min));
      this.canvas.lineTo(i, Math.round(mid + mid * waveform[i].max));
    }
    this.canvas.stroke();

    // Draw start and end time markers if defined
    if (this.props.startTime !== undefined && this.props.buffer) {
      const startPos =
        (this.props.startTime / this.props.buffer.duration) * this.props.width;
      this.canvas.beginPath();
      this.canvas.lineWidth = 2;
      this.canvas.strokeStyle = "rgba(255, 50, 50, 0.8)";
      this.canvas.moveTo(startPos, 0);
      this.canvas.lineTo(startPos, this.props.height);
      this.canvas.stroke();
    }

    if (this.props.endTime !== undefined && this.props.buffer) {
      const endPos =
        (this.props.endTime / this.props.buffer.duration) * this.props.width;
      this.canvas.beginPath();
      this.canvas.lineWidth = 2;
      this.canvas.strokeStyle = "rgba(50, 50, 255, 0.8)";
      this.canvas.moveTo(endPos, 0);
      this.canvas.lineTo(endPos, this.props.height);
      this.canvas.stroke();
    }
  }

  setup() {
    if (!this.container || !this.canvasRef) {
      return;
    }

    this.container.addEventListener("resize", (ev) => {
      console.log(
        "Waveform's container resized to ",
        this.container.clientWidth,
        this.container.clientHeight
      );
      this.canvasRef.width = this.container.clientWidth;
      this.canvasRef.height = this.container.clientHeight;
    });

    this.canvasRef.width = this.props.width;
    this.canvasRef.height = this.props.height;

    this.canvas = this.canvasRef.getContext("2d");

    this.draw();
  }

  render() {
    return (
      <div ref={(ref) => this.setupContainer(ref)} style="width:100%;">
        <canvas ref={(ref) => this.setupCanvas(ref)}></canvas>
      </div>
    );
  }
}
