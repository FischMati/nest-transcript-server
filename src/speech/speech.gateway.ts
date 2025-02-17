import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { SpeechService } from './speech.service';

@WebSocketGateway()
export class SpeechGateway implements OnGatewayConnection, OnGatewayDisconnect {
  // Map each connected socket to its corresponding recognition stream.
  private clientStreams = new Map<Socket, any>();

  constructor(private readonly speechService: SpeechService) { }

  handleConnection(socket: Socket) {
    console.log(`Client connected: ${socket.id}`);

    // Create a recognition stream for this client.
    const stream = this.speechService.createRecognizeStream(
      (data) => {
        if (data.results && data.results[0]) {
          socket.emit('message', { ...data.results[0], timestamp: Date.now() });
        }
      },
      (error) => {
        socket.emit('message', { error: error.message });
      },
    );

    this.clientStreams.set(socket, stream);
  }

  @SubscribeMessage('audio')
  handleAudio(@MessageBody() data: Buffer, @ConnectedSocket() socket: Socket) {
    const stream = this.clientStreams.get(socket);
    if (stream && stream.writable) {
      try {
        stream.write(data);
      } catch (err) {
        console.error('Error writing to stream:', err);
        socket.emit('message', { error: (err as Error).message || 'Stream write error' });
      }
    }
  }

  handleDisconnect(socket: Socket) {
    console.log(`Client disconnected: ${socket.id}`);
    const stream = this.clientStreams.get(socket);
    if (stream) {
      stream.end();
      this.clientStreams.delete(socket);
    }
  }
}
