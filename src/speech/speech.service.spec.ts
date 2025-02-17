import { SpeechService } from './speech.service';
import { EventEmitter } from 'events';

jest.useFakeTimers();

class FakeStream extends EventEmitter {
  end = jest.fn();
}

describe('SpeechService', () => {
  let speechService: SpeechService;
  let fakeStreamIndex = 0;
  const fakeStreams: FakeStream[] = [];

  // Create a fake SpeechClient with a streamingRecognize method.
  const fakeSpeechClient = {
    streamingRecognize: jest.fn((): FakeStream => {
      const stream = new FakeStream();
      fakeStreams.push(stream);
      fakeStreamIndex++;
      return stream;
    }),
  };

  beforeEach(() => {
    // Create a new instance.
    speechService = new SpeechService();

    // Override the private speechClient.
    (speechService as any).speechClient = fakeSpeechClient;

    // Reset fakeStreams and counters.
    fakeStreams.length = 0;
    fakeStreamIndex = 0;
    fakeSpeechClient.streamingRecognize.mockClear();
  });

  it('should create a streaming recognize stream and call onData when data event is emitted', () => {
    const onData = jest.fn();
    const onError = jest.fn();

    const stream = speechService.createRecognizeStream(onData, onError) as FakeStream;

    // Ensure streamingRecognize was called with the proper request.
    expect(fakeSpeechClient.streamingRecognize).toHaveBeenCalledTimes(1);

    // Simulate a data event.
    const sampleData = { results: [{ transcript: 'Test transcript' }] };
    stream.emit('data', sampleData);

    expect(onData).toHaveBeenCalledWith(sampleData);
  });

  it('should call onError and end the stream when an error event is emitted and then retry once', () => {
    const onData = jest.fn();
    const onError = jest.fn();

    // Create the initial stream.
    const stream = speechService.createRecognizeStream(onData, onError) as FakeStream;
    expect(fakeSpeechClient.streamingRecognize).toHaveBeenCalledTimes(1);

    // Simulate an error event.
    const error = new Error('Test error');
    stream.emit('error', error);

    // onError should have been called and current stream ended.
    expect(onError).toHaveBeenCalledWith(error);
    expect(stream.end).toHaveBeenCalled();

    // A retry should be scheduled.
    // The retry delay is 2^0 * 1000 = 1000ms.
    // Advance the timers:
    jest.advanceTimersByTime(1000);

    // After the timer, streamingRecognize should be called again.
    expect(fakeSpeechClient.streamingRecognize).toHaveBeenCalledTimes(2);

    // The new stream should be active. Simulate data on new stream.
    const newStream = fakeStreams[1];
    const sampleData = { results: [{ transcript: 'Retry transcript' }] };
    newStream.emit('data', sampleData);
    expect(onData).toHaveBeenCalledWith(sampleData);
  });

  it('should retry up to maxRetries on consecutive errors', () => {
    const onData = jest.fn();
    const onError = jest.fn();

    // Create the initial stream.
    const stream = speechService.createRecognizeStream(onData, onError) as FakeStream;
    expect(fakeSpeechClient.streamingRecognize).toHaveBeenCalledTimes(1);

    // Function to simulate an error and trigger retry.
    const simulateErrorRetry = (streamInstance: FakeStream, expectedCallCount: number, delayMs: number) => {
      const error = new Error('Consecutive error');
      streamInstance.emit('error', error);
      expect(onError).toHaveBeenCalledWith(error);
      expect(streamInstance.end).toHaveBeenCalled();
      jest.advanceTimersByTime(delayMs);
      expect(fakeSpeechClient.streamingRecognize).toHaveBeenCalledTimes(expectedCallCount);
    };

    // First error: delay = 2^0 * 1000 = 1000ms.
    simulateErrorRetry(stream, 2, 1000);

    // Second error: delay = 2^1 * 1000 = 2000ms.
    const stream2 = fakeStreams[1];
    simulateErrorRetry(stream2, 3, 2000);

    // Third error: delay = 2^2 * 1000 = 4000ms.
    const stream3 = fakeStreams[2];
    simulateErrorRetry(stream3, 4, 4000);

    // Fourth error: delay = 2^3 * 1000 = 8000ms.
    const stream4 = fakeStreams[3];
    simulateErrorRetry(stream4, 5, 8000);

    // Fifth error: delay = 2^4 * 1000 = 16000ms.
    const stream5 = fakeStreams[4];
    simulateErrorRetry(stream5, 6, 16000);

    // Exceed max retries (maxRetries is 5); no further call should be scheduled.
    const stream6 = fakeStreams[5];
    const error = new Error('Exceeded error');
    stream6.emit('error', error);
    expect(onError).toHaveBeenCalledWith(error);
    expect(stream6.end).toHaveBeenCalled();

    // Advance timers; no new call because maxRetries has been reached.
    jest.advanceTimersByTime(32000);
    expect(fakeSpeechClient.streamingRecognize).toHaveBeenCalledTimes(6);
  });
});