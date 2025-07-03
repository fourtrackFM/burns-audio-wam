# DrumSampler User Upload Feature

This feature allows users to upload their own audio samples to the DrumSampler module.

## How to Use

1. Click on a pad to select it
2. In the editor panel, click the "Upload" button
3. Select an audio file from your computer
4. The sample will be loaded into the selected pad

## Supported File Types

The DrumSampler supports common audio file formats including:

- WAV (.wav)
- MP3 (.mp3)
- OGG (.ogg)
- FLAC (.flac)

Note: Browser support for different audio formats may vary. WAV files are most widely supported and recommended for best results.

## Technical Implementation

The upload feature works by:

1. Creating a file input element when the Upload button is clicked
2. Reading the selected file using the FileReader API
3. Decoding the audio data using Web Audio API's decodeAudioData
4. Storing the decoded buffer in the sampler's audio buffer array
5. Updating the pad display and waveform visualization

Sample files are loaded directly in the browser without being sent to any server.
