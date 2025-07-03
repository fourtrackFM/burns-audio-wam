// Recording Test Script for DrumSampler
// This file contains basic code to test the recording functionality

// Sample code to programmatically test the recording feature
async function testRecordingFeature() {
  try {
    // Check if browser supports getUserMedia
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error("getUserMedia is not supported in this browser");
      return;
    }

    // Test microphone access
    console.log("Testing microphone access...");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    console.log("Microphone access granted!");

    // Create a simple recorder
    const mediaRecorder = new MediaRecorder(stream);
    const chunks = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    // Record for 3 seconds
    console.log("Recording test audio for 3 seconds...");
    mediaRecorder.start();

    setTimeout(() => {
      mediaRecorder.stop();
      console.log("Recording stopped.");

      // Stop all tracks
      stream.getTracks().forEach((track) => track.stop());

      // Create blob from chunks
      const blob = new Blob(chunks, { type: "audio/webm" });
      console.log("Recording size: " + (blob.size / 1024).toFixed(2) + " KB");

      // Create a URL for the blob
      const url = URL.createObjectURL(blob);
      console.log("Temporary URL for playback: " + url);

      // Create audio element for testing playback
      const audio = new Audio(url);
      audio.controls = true;
      document.body.appendChild(audio);
    }, 3000);
  } catch (error) {
    console.error("Error testing recording feature:", error);
  }
}

// Example usage:
// testRecordingFeature();

/*
Troubleshooting Recording Issues:

1. Microphone Access Denied:
   - Make sure you've granted the browser permission to access your microphone
   - Check browser settings to ensure permissions are correct
   - Try using a different browser if issues persist

2. No Sound Recorded:
   - Check that your microphone is properly connected
   - Make sure the correct microphone is selected in your system settings
   - Check volume levels in your system settings

3. Poor Sound Quality:
   - Use a better quality microphone
   - Record in a quiet environment
   - Position the microphone appropriately for your sound source
*/
