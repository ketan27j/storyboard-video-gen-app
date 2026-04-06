import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PipelineSession } from './entities/pipeline-session.entity';
import { PipelineState } from '../pipeline/graph/state';

@Injectable()
export class DatabaseService {
  constructor(
    @InjectRepository(PipelineSession)
    private readonly sessionRepository: Repository<PipelineSession>,
  ) {}

  async saveSession(sessionId: string, state: Partial<PipelineState>): Promise<void> {
    let session = await this.sessionRepository.findOne({ where: { id: sessionId } });

    if (!session) {
      session = this.sessionRepository.create({ id: sessionId });
    }

    // Map state fields to entity
    if (state.movieIdea) session.movieIdea = state.movieIdea;
    if (state.storySnapshot) session.storySnapshot = state.storySnapshot;
    if (state.finalResolution) session.finalResolution = state.finalResolution;
    if (state.characterDefinitions) session.characterDefinitions = state.characterDefinitions;
    
    // Merge new scenes with existing generated assets
    if (state.scenes && Array.isArray(state.scenes)) {
      const existingScenes = session.scenes || [];
      const newScenes = [...state.scenes];
      
      // Preserve generated assets from existing scenes
      for (let i = 0; i < newScenes.length && i < existingScenes.length; i++) {
        if (existingScenes[i] && existingScenes[i].imageSequence) {
          if (!newScenes[i].imageSequence) {
            newScenes[i].imageSequence = existingScenes[i].imageSequence;
          } else {
            // Merge individual image statuses
            for (let j = 0; j < newScenes[i].imageSequence.length && j < existingScenes[i].imageSequence.length; j++) {
              if (existingScenes[i].imageSequence[j].generatedUrl || existingScenes[i].imageSequence[j].status === 'done') {
                newScenes[i].imageSequence[j] = existingScenes[i].imageSequence[j];
              }
            }
          }
          
          if (!newScenes[i].videoMotionPrompts && existingScenes[i].videoMotionPrompts) {
            newScenes[i].videoMotionPrompts = existingScenes[i].videoMotionPrompts;
          } else if (newScenes[i].videoMotionPrompts && existingScenes[i].videoMotionPrompts) {
            // Merge individual video statuses
            for (let j = 0; j < newScenes[i].videoMotionPrompts.length && j < existingScenes[i].videoMotionPrompts.length; j++) {
              if (existingScenes[i].videoMotionPrompts[j].generatedUrl || existingScenes[i].videoMotionPrompts[j].status === 'done') {
                newScenes[i].videoMotionPrompts[j] = existingScenes[i].videoMotionPrompts[j];
              }
            }
          }
        }
      }
      
      session.scenes = newScenes;
    }
    
    if (state.currentSceneIndex !== undefined) session.currentSceneIndex = state.currentSceneIndex;

    await this.sessionRepository.save(session);
  }

  async getSession(sessionId: string): Promise<PipelineState | null> {
    const session = await this.sessionRepository.findOne({ where: { id: sessionId } });

    if (!session) return null;

    return {
      sessionId: session.id,
      movieIdea: session.movieIdea,
      storySnapshot: session.storySnapshot,
      finalResolution: session.finalResolution,
      characterDefinitions: session.characterDefinitions || {},
      scenes: session.scenes || [],
      currentSceneIndex: session.currentSceneIndex,
      scenesApproved: false,
      currentSceneApproved: false,
      regenerateScenes: false,
      regenerateCurrentScene: false,
      lastError: null,
      messages: [],
    } as PipelineState;
  }

  async listSessions(): Promise<PipelineSession[]> {
    return this.sessionRepository.find({
      order: { updatedAt: 'DESC' },
      select: ['id', 'movieIdea', 'status', 'screen', 'createdAt', 'updatedAt'],
    });
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.sessionRepository.delete({ id: sessionId });
  }

  async updateSession(sessionId: string, updater: (session: PipelineSession) => Partial<PipelineState>): Promise<void> {
    let session = await this.sessionRepository.findOne({ where: { id: sessionId } });
    
    if (!session) {
      session = this.sessionRepository.create({ id: sessionId });
    }

    const updates = updater(session);
    await this.saveSession(sessionId, updates);
  }
}
