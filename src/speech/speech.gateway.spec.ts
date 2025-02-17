import { SpeechGateway } from './speech.gateway';
import { SpeechService } from './speech.service';
import { Socket } from 'socket.io';

describe('SpeechGateway', () => {
  let speechService: SpeechService;
  let speechGateway: SpeechGateway;
  let fakeSocket: Socket;
  let fakeStream: any;

  beforeEach(() => {
    fakeStream = {
      writable: true,
      write: jest.fn(),
      end: jest.fn(),
    };

    // Mock SpeechService which returns a fake stream.
    speechService = {
      createRecognizeStream: jest.fn().mockImplementation((dataCallback, errorCallback) => {
        return fakeStream;
      }),
    } as unknown as SpeechService;

    speechGateway = new SpeechGateway(speechService);

    fakeSocket = {
      id: 'test-socket',
      emit: jest.fn(),
    } as unknown as Socket;
  });

  it('should create a recognition stream on connection', () => {
    speechGateway.handleConnection(fakeSocket);
    expect(speechService.createRecognizeStream).toHaveBeenCalled();
    expect((speechGateway as any).clientStreams.get(fakeSocket)).toBe(fakeStream);
  });

  it('should handle audio by writing data to the stream', () => {
    (speechGateway as any).clientStreams.set(fakeSocket, fakeStream);
    const data = Buffer.from('audio data');
    speechGateway.handleAudio(data, fakeSocket);
    expect(fakeStream.write).toHaveBeenCalledWith(data);
  });

  it('should emit an error message if stream.write fails', () => {
    (speechGateway as any).clientStreams.set(fakeSocket, fakeStream);
    const data = Buffer.from('audio data');
    const error = new Error('Write error');
    fakeStream.write.mockImplementation(() => { throw error; });
    speechGateway.handleAudio(data, fakeSocket);
    expect(fakeSocket.emit).toHaveBeenCalledWith('message', { error: error.message });
  });

  it('should end the stream and remove the client on disconnect', () => {
    (speechGateway as any).clientStreams.set(fakeSocket, fakeStream);
    speechGateway.handleDisconnect(fakeSocket);
    expect(fakeStream.end).toHaveBeenCalled();
    expect((speechGateway as any).clientStreams.has(fakeSocket)).toBe(false);
  });

  it('should emit a recognized message when the recognition callback is triggered', () => {
    let recognitionCallback: (data: any) => void = () => { };
    let errorCallback: (error: any) => void = () => { };

    // Override createRecognizeStream to capture callbacks.
    speechService.createRecognizeStream = jest.fn().mockImplementation((dataCb, errCb) => {
      recognitionCallback = dataCb;
      errorCallback = errCb;
      return fakeStream;
    });
    speechGateway.handleConnection(fakeSocket);

    // Simulate recognition callback trigger with valid result.
    const sampleResult = { results: [{ transcript: 'Test transcript' }] };
    recognitionCallback(sampleResult);
    expect(fakeSocket.emit).toHaveBeenCalledWith('message', { transcript: 'Test transcript', timestamp: expect.any(Number) });
  });

  it('should emit an error message when the recognition error callback is triggered', () => {
    let recognitionCallback: (data: any) => void = () => { };
    let errorCallback: (error: any) => void = () => { };

    // Override createRecognizeStream to capture callbacks.
    speechService.createRecognizeStream = jest.fn().mockImplementation((dataCb, errCb) => {
      recognitionCallback = dataCb;
      errorCallback = errCb;
      return fakeStream;
    });
    speechGateway.handleConnection(fakeSocket);

    // Simulate error callback trigger.
    const error = new Error('Test error');
    errorCallback(error);
    expect(fakeSocket.emit).toHaveBeenCalledWith('message', { error: error.message });
  });
});