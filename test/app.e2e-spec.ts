import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { SpeechService } from '../src/speech/speech.service';
import { EventEmitter } from 'events';
import { SpeechClient } from '@google-cloud/speech';
import { io, Socket } from 'socket.io-client';

// Mock the entire Google Speech client
jest.mock('@google-cloud/speech', () => ({
  SpeechClient: jest.fn().mockImplementation(() => ({
    streamingRecognize: jest.fn().mockImplementation(() => new FakeRecognitionStream()),
  })),
}));

class FakeRecognitionStream extends EventEmitter {
  writable = true;
  ended = false;

  write(data: Buffer) {
    if (this.ended) return false;
    setImmediate(() => {
      this.emit('data', {
        results: [{
          alternatives: [{ transcript: 'interim result', confidence: 0.85 }],
          isFinal: false,
          stability: 0.8
        }]
      });

      setTimeout(() => {
        this.emit('data', {
          results: [{
            alternatives: [{ transcript: 'final result', confidence: 0.98 }],
            isFinal: true,
            stability: 1.0
          }]
        });
      }, 500);
    });
    return true;
  }

  end() {
    this.ended = true;
    this.emit('end');
  }
}

describe('SpeechGateway (e2e)', () => {
  let app: INestApplication;
  let socket: Socket;
  let server: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    server = app.getHttpServer();
    await new Promise<void>((resolve) => server.listen(0, resolve));
  });

  beforeEach(async () => {
    const address = server.address();
    const port = address.port;

    socket = io(`http://localhost:${port}`, {
      transports: ['websocket'],
      forceNew: true,
    });

    // Wait for connection
    await new Promise<void>((resolve) => socket.on('connect', resolve));
  });

  afterEach(async () => {
    if (socket) {
      await new Promise<void>((resolve) => {
        socket.close();
        resolve();
      });
    }
  });

  afterAll(async () => {
    await new Promise(resolve => server.close(resolve));
    await app.close();
  });

  it('should establish websocket connection', () => {
    expect(socket.connected).toBeTruthy();
  });

  it('should receive interim and final transcripts when sending audio', (done) => {
    const messages: any[] = [];

    socket.on('message', (msg: any) => {
      messages.push(msg);

      if (messages.length === 2) {
        try {
          expect(messages[0]).toMatchObject({
            alternatives: [{ transcript: 'interim result', confidence: 0.85 }],
            isFinal: false,
          });

          expect(messages[1]).toMatchObject({
            alternatives: [{ transcript: 'final result', confidence: 0.98 }],
            isFinal: true,
          });

          done();
        } catch (err) {
          done(err);
        }
      }
    });

    socket.emit('audio', Buffer.from('test audio data'));
  });

  it('should handle disconnection gracefully', (done) => {
    socket.on('disconnect', () => {
      expect(socket.connected).toBeFalsy();
      done();
    });

    socket.disconnect();
  });

  it('should stop receiving messages after disconnection', (done) => {
    let messageReceived = false;

    socket.on('message', () => {
      messageReceived = true;
    });

    socket.disconnect();

    socket.emit('audio', Buffer.from('test audio data'));

    setTimeout(() => {
      expect(messageReceived).toBeFalsy();
      done();
    }, 1000);
  });
});