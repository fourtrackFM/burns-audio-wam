# DrumSampler Sample Trimming Feature

This feature allows users to adjust the start and end times of samples, enabling precise control over what portion of the audio is played.

## How to Use

1. Click on a pad to select it
2. In the waveform display, you'll see two colored markers:
   - Red marker: Start time
   - Blue marker: End time
3. Drag these markers to adjust where the sample starts and ends
4. Alternatively, use the Start and End knobs in the Sample Timing panel

## Benefits

- Remove silence at the beginning or end of samples
- Isolate specific sounds from longer recordings
- Create tighter, more precise drum hits
- Extract specific portions from longer audio files
- Create shorter variations of longer samples

## Technical Implementation

The trimming feature works by:

1. Storing start and end time values for each sample
2. Using the Web Audio API's `AudioBufferSourceNode.start()` method with offset and duration parameters
3. Providing visual feedback with draggable markers on the waveform display
4. Updating parameter values for automation

## Tips for Sample Trimming

- For percussive sounds, trim closely to the attack (beginning of the sound) for tighter timing
- Leave a small amount of space before the attack (a few milliseconds) to avoid clicks
- For sustained sounds, trim the end to control the decay time
- Use the waveform visualization to identify the exact parts of the sound you want to keep

## Limitations

- The trimming is non-destructive - the full sample remains in memory
- Very short samples (under 10ms) may cause audible clicks
- Changes to sample start/end times will be saved with your project
