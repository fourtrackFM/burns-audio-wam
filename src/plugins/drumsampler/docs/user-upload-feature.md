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

## Polyphonic Mode

The DrumSampler now includes a **Polyphonic Mode** that allows you to play a single sample across the keyboard with pitch control:

### How to Use Polyphonic Mode

1. Click the "Polyphonic Mode" button in the mode selector
2. Select which sample slot to use from the dropdown
3. Set the "Start Note" (default is C3/MIDI 60) - this is the note at which the sample plays at its original pitch
4. Play different MIDI notes to hear the sample pitch-shifted accordingly

### Polyphonic Mode Features

- **Pitch Control**: Notes higher than the start note will play the sample at a higher pitch, notes lower will play at a lower pitch
- **Polyphony**: Up to 8 simultaneous notes can be played at once
- **Voice Stealing**: When all 8 voices are in use, the oldest voice will be stopped to make room for new notes
- **Note Off Support**: Unlike drum mode, polyphonic mode responds to note-off messages to stop individual notes
- **Sample Controls**: All the same sample editing features (start/end times, tone, pan, gain) are available

### Technical Details

- Pitch shifting is achieved using the `playbackRate` property of `AudioBufferSourceNode`
- Pitch ratio is calculated as: `Math.pow(2, (targetNote - startNote) / 12)`
- Each polyphonic voice has its own audio processing chain (filters, gain, pan)
- MIDI note-on and note-off messages are handled for natural keyboard-style playing
