export class AudioPool {
  audioContext: BaseAudioContext;
  mediaRecorder: MediaRecorder | null = null;
  recordedChunks: Blob[] = [];
  isRecording: boolean = false;

  constructor(audioContext: BaseAudioContext) {
    this.audioContext = audioContext;
  }

  loadSample(url: string, callback: Function) {
    var request = new XMLHttpRequest();
    request.open("GET", url, true);
    request.responseType = "arraybuffer";

    // Decode asynchronously
    request.onload = () => {
      this.audioContext.decodeAudioData(request.response, (buffer) => {
        callback(buffer);
      });
    };
    request.send();
  }

  loadSampleFromFile(file: File, callback: Function) {
    const reader = new FileReader();

    reader.onload = (event) => {
      const arrayBuffer = event.target.result as ArrayBuffer;
      this.audioContext.decodeAudioData(
        arrayBuffer,
        (buffer) => {
          callback(buffer);
        },
        (error) => {
          console.error("Error decoding audio data", error);
        }
      );
    };

    reader.readAsArrayBuffer(file);
  }

  async startRecording(): Promise<MediaStream> {
    if (this.isRecording) {
      throw new Error("Already recording");
    }

    // Reset recorded chunks
    this.recordedChunks = [];

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Create MediaRecorder instance
      this.mediaRecorder = new MediaRecorder(stream);

      // Set up event handlers
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      // Start recording
      this.mediaRecorder.start();
      this.isRecording = true;

      return stream;
    } catch (error) {
      console.error("Error accessing microphone:", error);
      throw error;
    }
  }

  stopRecording(): Promise<AudioBuffer> {
    if (!this.isRecording || !this.mediaRecorder) {
      return Promise.reject(new Error("Not recording"));
    }

    return new Promise((resolve, reject) => {
      this.mediaRecorder!.onstop = async () => {
        try {
          // Combine recorded chunks into a single blob
          const audioBlob = new Blob(this.recordedChunks, {
            type: "audio/webm",
          });

          // Convert blob to ArrayBuffer
          const arrayBuffer = await audioBlob.arrayBuffer();

          // Decode audio data
          this.audioContext.decodeAudioData(
            arrayBuffer,
            (buffer) => {
              this.isRecording = false;
              resolve(buffer);
            },
            (error) => {
              this.isRecording = false;
              console.error("Error decoding audio data:", error);
              reject(error);
            }
          );
        } catch (error) {
          this.isRecording = false;
          console.error("Error processing recorded audio:", error);
          reject(error);
        }
      };

      // Stop recording
      this.mediaRecorder!.stop();

      // Stop all tracks in the stream
      this.mediaRecorder!.stream.getTracks().forEach((track) => track.stop());
    });
  }
}
