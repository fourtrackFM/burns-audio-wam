// Sample File Upload Test Script for DrumSampler
// This file contains some basic code to test the file upload functionality

// Sample code to programmatically trigger a file upload for a specific pad
function uploadSampleToPad(padIndex) {
  // Create a file input
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "audio/*";

  // Trigger click and handle the file selection
  fileInput.onchange = (event) => {
    const file = event.target.files[0];
    if (file) {
      console.log(`Uploading ${file.name} to pad ${padIndex}`);
      // The file will be processed by the handleFileUpload method
    }
  };

  // Trigger the file dialog
  fileInput.click();
}

// Example usage:
// uploadSampleToPad(0); // Upload to the first pad

/*
Supported Audio Formats:
- WAV files (.wav)
- MP3 files (.mp3)
- OGG files (.ogg)
- FLAC files (.flac)

Note: Browser support for different audio formats may vary. 
WAV files are most widely supported and recommended for samples.
*/
