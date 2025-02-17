import { Injectable } from '@nestjs/common';
import { SpeechClient } from '@google-cloud/speech';
import { google } from '@google-cloud/speech/build/protos/protos';

type StreamingRecognizeResponse = google.cloud.speech.v1.IStreamingRecognizeResponse;
type DataCallback = (data: StreamingRecognizeResponse) => void;
type ErrorCallback = (error: Error) => void;

@Injectable()
export class SpeechService {
  private readonly speechClient: SpeechClient;
  private readonly request: any;

  constructor() {
    this.speechClient = new SpeechClient();

    const AudioEncoding = google.cloud.speech.v1.RecognitionConfig.AudioEncoding;
    const InteractionType = google.cloud.speech.v1.RecognitionMetadata.InteractionType;
    const MicrophoneDistance = google.cloud.speech.v1.RecognitionMetadata.MicrophoneDistance;
    const OriginalMediaType = google.cloud.speech.v1.RecognitionMetadata.OriginalMediaType;

    this.request = {
      config: {
        encoding: AudioEncoding.WEBM_OPUS,
        sampleRateHertz: 48000,
        languageCode: 'en-US',
        enableAutomaticPunctuation: true,
        enableWordTimeOffsets: true,
        enableWordConfidence: true,
        useEnhanced: true,
        model: 'latest_long',
        metadata: {
          interactionType: InteractionType.PRESENTATION,
          microphoneDistance: MicrophoneDistance.NEARFIELD,
          originalMediaType: OriginalMediaType.AUDIO,
        },
      },
      interimResults: true,
    };
  }

  /**
   * Creates a streaming recognition call to Google Cloud Speech.
   *
   * @param onData Callback for streaming data.
   * @param onError Callback for errors.
   * @returns A streaming object to which audio data can be written.
   */
  createRecognizeStream(onData: DataCallback, onError: ErrorCallback): any {
    let retryAttempts = 0;
    const maxRetries = 5;
    let currentStream: any;

    const startStream = (): any => {
      currentStream = this.speechClient
        .streamingRecognize(this.request)
        .on('error', (error: Error) => {
          console.error('Google API error:', error);
          onError(error);
          currentStream.end();

          if (retryAttempts < maxRetries) {
            const delay = Math.pow(2, retryAttempts) * 1000;
            retryAttempts++;
            setTimeout(() => {
              console.log(`Retrying streamingRecognize (attempt ${retryAttempts})...`);
              startStream();
            }, delay);
          }
        })
        .on('data', (data: StreamingRecognizeResponse) => {
          onData(data);
        });
      return currentStream;
    };

    return startStream();
  }
}
