# Prompt Flow & Workflow Documentation

## 📋 Complete Prompt Execution Pipeline

This document describes exactly how prompts are loaded, processed and used in this storyboard generation system.

---

## 📁 Prompt Files Location
All prompt templates are stored in:
```
./prompts/
├── char_scene_gen.txt   # Story & scene generation master prompt
├── video_gen.txt        # Image & video prompt generation
└── camera_moves.txt     # (Reference file for camera motion patterns)
```

---

## 🔄 Full Workflow Execution Order

### ✅ Phase 1: Story & Scene Generation

| Step | Action | Prompt File | Node Handler | Description |
|------|--------|-------------|--------------|-------------|
| 1 | **User submits movie idea** | - | `IdeaInput.tsx` | Raw user input string is sent to backend via `/api/pipeline/start` |
| 2 | **Pipeline initialized** | - | `pipeline.service.ts` | Session created, state initialized, pipeline graph starts execution |
| 3 | **Load scene prompt template** | `char_scene_gen.txt` | `sceneGenerator.ts` | Prompt file loaded from filesystem using `loadPrompt()` |
| 4 | **Inject movie idea** | `char_scene_gen.txt` | `sceneGenerator.ts` | `{movieIdea}` placeholder is replaced with actual user input |
| 5 | **Call LLM** | - | `llm.factory.ts` | Full prompt sent to configured LLM provider (OpenAI / Grok / Gemini) with streaming enabled |
| 6 | **Parse structured output** | - | `parseSceneOutput()` | LLM response is parsed into structured state: <br>• Story Snapshot <br>• Character Definitions <br>• 4-6 Scene Breakdowns <br>• Final Resolution |

---

### ✅ Phase 2: Scene Processing (Per Individual Scene)

Runs once for each scene sequentially after user approves story plan:

| Step | Action | Prompt File | Node Handler | Description |
|------|--------|-------------|--------------|-------------|
| 1 | **Load video prompt template** | `video_gen.txt` | `videoScripter.ts` | Video generation prompt template loaded |
| 2 | **Inject scene data** | `video_gen.txt` | `processSceneNode()` | Template injected with: <br>• Scene Number <br>• Scene Goal <br>• Location <br>• Scene Description <br>• Full character list with descriptions |
| 3 | **Call LLM** | - | `llm.factory.ts` | Full constructed prompt sent to LLM |
| 4 | **Parse output** | - | `parseVideoScriptOutput()` | LLM response parsed into: <br>• Character Image Prompts <br>• 3-4 Image Sequence prompts <br>• Matching Video Motion prompts for each image |
| 5 | **Save to state** | - | `pipeline.graph.ts` | All generated prompts stored in pipeline state, ready for generation |

---

## 📝 Prompt Template Details

### 📄 char_scene_gen.txt
**Responsibility:** Convert raw movie idea into structured story plan
- Specialized for short 30-45 second AI video format
- Enforces Indian character / attire styles
- Fixed output structure with exact section headers
- Input placeholder: `{movieIdea}`
- Output: 4-6 scenes each with Goal, Location, Characters, Description

### 📄 video_gen.txt
**Responsibility:** Convert scene description into AI generation ready prompts
- Outputs 3 separate sections:
  1.  **CHARACTER IMAGE PROMPTS** - standalone character reference prompts
  2.  **IMAGE SEQUENCE** - 3-4 sequential image generation prompts
  3.  **VIDEO MOTION PROMPTS** - motion descriptions for each corresponding image
- All prompts optimized for current AI image/video generation models
- Maintains character consistency across all outputs

---

## 🔧 Technical Implementation Details

### Prompt Loading Mechanism
```typescript
// In all graph nodes
function loadPrompt(filename: string): string {
  // Reads from PROMPTS_DIR environment variable
  // Falls back to inline default prompt if file not found
  // Returns raw string template
}
```

### LLM Integration
- Uses LangChain `HumanMessage` format
- Streaming enabled for all LLM calls
- All nodes use common `createLLM()` factory for consistent configuration
- Response parsing has multiple fallback patterns for robustness

### Parsing Strategy
1.  **Exact section header matching** for primary parsing
2.  **Multiple regex patterns** for each field
3.  **Graceful fallback parsing** when LLM deviates from format
4.  **Lenient input handling** - extracts as much data as possible

---

## 🔁 Post Prompt Generation Flow

After prompts are generated:
1.  User can view and **edit every prompt directly** in the UI
2.  Edited prompts are saved back to state
3.  When generation starts, **the final modified prompt** is sent to image/video services
4.  Original LLM generated prompt is never re-used once user makes edits

---

## ✅ Key Design Principles
1.  **Separation of concerns:** Story generation separate from visual prompt generation
2.  **Idempotent operations:** All nodes can be re-run safely
3.  **Graceful degradation:** Fallback prompts always exist even if file system fails
4.  **User override:** All auto-generated prompts are editable before generation
5.  **Strict formatting:** Prompt templates enforce output structure that works with parsers