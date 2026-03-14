import { StateGraph, START, END } from '@langchain/langgraph';
import { MemorySaver } from '@langchain/langgraph';
import { PipelineStateAnnotation, PipelineState } from './state';
import { generateScenesNode } from './nodes/sceneGenerator';
import { processSceneNode } from './nodes/videoScripter';
import { optimizeCameraNode } from './nodes/cameraOptimizer';

// Passthrough interrupt nodes
async function humanApprovePlanNode(state: PipelineState): Promise<Partial<PipelineState>> {
  return {};
}

async function humanApproveSceneNode(state: PipelineState): Promise<Partial<PipelineState>> {
  return {};
}

async function nextSceneOrFinishNode(state: PipelineState): Promise<Partial<PipelineState>> {
  return { currentSceneApproved: false };
}

// Routing functions
function routeAfterPlanApproval(state: PipelineState): string {
  if (state.regenerateScenes) return 'generate_scenes';
  if (state.scenesApproved) return 'process_scene';
  return END;
}

function routeAfterSceneApproval(state: PipelineState): string {
  if (state.regenerateCurrentScene) return 'process_scene';
  if (state.currentSceneApproved) return 'optimize_camera';
  return 'next_scene_or_finish';
}

function routeAfterNext(state: PipelineState): string {
  if (state.currentSceneIndex < state.scenes.length) {
    return 'process_scene';
  }
  return END;
}

let compiledGraph: ReturnType<typeof buildGraph> | null = null;

function buildGraph() {
  const checkpointer = new MemorySaver();

  const graph = new StateGraph(PipelineStateAnnotation)
    .addNode('generate_scenes', generateScenesNode)
    .addNode('human_approve_plan', humanApprovePlanNode)
    .addNode('process_scene', processSceneNode)
    .addNode('human_approve_scene', humanApproveSceneNode)
    .addNode('optimize_camera', optimizeCameraNode)
    .addNode('next_scene_or_finish', nextSceneOrFinishNode)

    .addEdge(START, 'generate_scenes')
    .addEdge('generate_scenes', 'human_approve_plan')
    .addConditionalEdges('human_approve_plan', routeAfterPlanApproval, {
      generate_scenes: 'generate_scenes',
      process_scene: 'process_scene',
      [END]: END,
    })
    .addEdge('process_scene', 'human_approve_scene')
    .addConditionalEdges('human_approve_scene', routeAfterSceneApproval, {
      process_scene: 'process_scene',
      optimize_camera: 'optimize_camera',
      next_scene_or_finish: 'next_scene_or_finish',
    })
    .addEdge('optimize_camera', 'next_scene_or_finish')
    .addConditionalEdges('next_scene_or_finish', routeAfterNext, {
      process_scene: 'process_scene',
      [END]: END,
    });

  return graph.compile({
    checkpointer,
    interruptBefore: ['human_approve_plan', 'human_approve_scene'],
  });
}

export function getPipelineGraph() {
  if (!compiledGraph) {
    compiledGraph = buildGraph();
  }
  return compiledGraph;
}
