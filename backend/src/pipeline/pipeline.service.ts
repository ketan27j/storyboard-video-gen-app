import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { getPipelineGraph } from './graph/pipeline.graph';
import { PipelineGateway } from './pipeline.gateway';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PipelineService {
  private readonly logger = new Logger(PipelineService.name);

  constructor(private readonly gateway: PipelineGateway) {}

  async startPipeline(movieIdea: string): Promise<{ sessionId: string }> {
    const sessionId = uuidv4();
    const graph = getPipelineGraph();
    const config = { configurable: { thread_id: sessionId } };

    this.logger.log(`Starting pipeline for session ${sessionId}`);
    this.gateway.emitStatus(sessionId, 'running');

    // Run graph async — it will interrupt at human_approve_plan
    this.runGraph(sessionId, { movieIdea, sessionId }, config).catch((err) => {
      this.logger.error(`Pipeline error: ${err.message}`);
      this.gateway.emitError(sessionId, err.message);
    });

    return { sessionId };
  }

  async approvePlan(sessionId: string, regenerate = false): Promise<void> {
    const graph = getPipelineGraph();
    const config = { configurable: { thread_id: sessionId } };

    // Update state with user decision
    await graph.updateState(config, { scenesApproved: !regenerate, regenerateScenes: regenerate });

    this.gateway.emitStatus(sessionId, 'running');

    // Resume the graph
    this.runGraph(sessionId, null, config).catch((err) => {
      this.logger.error(`Pipeline error after plan approval: ${err.message}`);
      this.gateway.emitError(sessionId, err.message);
    });
  }

  async approveScene(sessionId: string, regenerate = false, skip = false): Promise<void> {
    const graph = getPipelineGraph();
    const config = { configurable: { thread_id: sessionId } };

    const currentState = await graph.getState(config);
    const currentSceneIndex = currentState.values.currentSceneIndex ?? 0;

    let stateUpdate: Record<string, any> = {
      currentSceneApproved: !regenerate && !skip,
      regenerateCurrentScene: regenerate,
    };

    if (skip) {
      // Mark scene as skipped and advance index
      const scenes = [...(currentState.values.scenes || [])];
      if (scenes[currentSceneIndex]) {
        scenes[currentSceneIndex] = { ...scenes[currentSceneIndex], skipped: true, approved: false };
      }
      stateUpdate = {
        ...stateUpdate,
        scenes,
        currentSceneApproved: true,
        currentSceneIndex: currentSceneIndex + 1,
      };
    } else if (!regenerate) {
      // Mark scene as approved and advance index
      const scenes = [...(currentState.values.scenes || [])];
      if (scenes[currentSceneIndex]) {
        scenes[currentSceneIndex] = { ...scenes[currentSceneIndex], approved: true };
      }
      stateUpdate = {
        ...stateUpdate,
        scenes,
        currentSceneIndex: currentSceneIndex + 1,
      };
    }

    await graph.updateState(config, stateUpdate);
    this.gateway.emitStatus(sessionId, 'running');

    this.runGraph(sessionId, null, config).catch((err) => {
      this.logger.error(`Pipeline error after scene approval: ${err.message}`);
      this.gateway.emitError(sessionId, err.message);
    });
  }

  async getState(sessionId: string): Promise<any> {
    const graph = getPipelineGraph();
    const config = { configurable: { thread_id: sessionId } };
    try {
      const state = await graph.getState(config);
      return state.values;
    } catch {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }
  }

  private async runGraph(sessionId: string, input: any, config: any): Promise<void> {
    const graph = getPipelineGraph();

    try {
      for await (const event of await graph.stream(input, {
        ...config,
        streamMode: 'values',
      })) {
        this.logger.debug(`Graph event for ${sessionId}: ${JSON.stringify(Object.keys(event))}`);
        this.gateway.emitStateUpdate(sessionId, event);
      }

      // Check if we've hit an interrupt
      const state = await graph.getState(config);
      const nextNodes = state.next as string[];

      if (nextNodes && nextNodes.length > 0) {
        if (nextNodes.includes('human_approve_plan')) {
          this.gateway.emitInterrupt(sessionId, 'approve_plan', state.values);
          this.gateway.emitStatus(sessionId, 'idle');
        } else if (nextNodes.includes('human_approve_scene')) {
          this.gateway.emitInterrupt(sessionId, 'approve_scene', state.values);
          this.gateway.emitStatus(sessionId, 'idle');
        }
      } else {
        // Pipeline complete
        this.gateway.emitComplete(sessionId, state.values);
        this.gateway.emitStatus(sessionId, 'idle');
      }
    } catch (err) {
      this.gateway.emitStatus(sessionId, 'idle');
      throw err;
    }
  }
}
