import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  namespace: '/pipeline',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
})
export class PipelineGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(PipelineGateway.name);

  @SubscribeMessage('join_session')
  handleJoinSession(
    @MessageBody() data: { sessionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const room = `session:${data.sessionId}`;
    client.join(room);
    this.logger.log(`Client ${client.id} joined room ${room}`);
    client.emit('joined', { sessionId: data.sessionId });
  }

  emitStatus(sessionId: string, status: 'running' | 'idle') {
    this.server.to(`session:${sessionId}`).emit('pipeline:status', { status });
  }

  emitStateUpdate(sessionId: string, state: any) {
    this.server.to(`session:${sessionId}`).emit('pipeline:update', { state });
  }

  emitInterrupt(sessionId: string, type: 'approve_plan' | 'approve_scene', state: any) {
    this.server.to(`session:${sessionId}`).emit('pipeline:interrupt', { type, state });
  }

  emitComplete(sessionId: string, state: any) {
    this.server.to(`session:${sessionId}`).emit('pipeline:complete', { state });
  }

  emitError(sessionId: string, message: string) {
    this.server.to(`session:${sessionId}`).emit('pipeline:error', { message });
  }

  emitImageProgress(
    sessionId: string,
    sceneIndex: number,
    imageIndex: number,
    status: string,
    url?: string,
  ) {
    this.server.to(`session:${sessionId}`).emit('image:progress', {
      sceneIndex,
      imageIndex,
      status,
      url,
    });
  }

  emitVideoProgress(
    sessionId: string,
    sceneIndex: number,
    videoIndex: number,
    status: string,
    url?: string,
  ) {
    this.server.to(`session:${sessionId}`).emit('video:progress', {
      sceneIndex,
      videoIndex,
      status,
      url,
    });
  }

  emitReferenceImageProgress(
    sessionId: string,
    status: string,
    url?: string,
  ) {
    this.server.to(`session:${sessionId}`).emit('reference-image:progress', {
      status,
      url,
    });
  }

  emitCharacterImageProgress(
    sessionId: string,
    characterName: string,
    status: string,
    url?: string,
  ) {
    this.server.to(`session:${sessionId}`).emit('character-image:progress', {
      characterName,
      status,
      url,
    });
  }
}
