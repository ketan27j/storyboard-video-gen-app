# Custom Scene Image Upload Feature

## Overview
Added functionality to upload custom images for each scene in the SCENE WORKSHOP. These custom images are passed to the image generation API as reference images. This image will be shown in 'REFERENCE IMAGES' section and should have select/unselect option.

## Implementation Details

### 1. Data Structure Updates

**Frontend (`frontend/src/types/pipeline.types.ts`)**
- Added `customUploadUrl?: string` to `ImageData` interface
- Stores the URL/path of user-uploaded custom images

**Backend (`backend/src/pipeline/graph/state.ts`)**
- Added `customUploadUrl?: string` to `ImageData` interface
- Maintains consistency between frontend and backend state

### 2. Backend API Endpoints

**New Endpoint: `POST /api/pipeline/:id/upload-scene-image`**
- Accepts: `sceneIndex`, `imageIndex`, `imageData` (base64)
- Saves image to: `output/images/{sessionId}/scenes/scene_{X}_image_{Y}_custom.png`
- Updates pipeline state via `PipelineService.uploadSceneImage()`
- Returns: `{ ok: true, url, sceneIndex, imageIndex }`

**Pipeline Service Method: `uploadSceneImage()`**
- Updates the specific scene's imageSequence
- Sets `customUploadUrl` and status to 'done'
- Persists state changes to the graph

### 3. Frontend Components

**ImagePromptCard Component Updates**
- Added `useUploadSceneImage()` hook integration
- Hidden file input with ref for programmatic access
- Compact upload button with space-efficient design
- Custom image badge overlay ("CUSTOM" label in cyan)
- Priority display logic: custom image > generated image
- Upload status indicators (uploading spinner)

**Key Features:**
- **Space Efficient**: Single button that changes text based on state
  - "📤 UPLOAD CUSTOM IMAGE" (initial state)
  - "🖼️ REPLACE CUSTOM IMAGE" (when custom image exists)
- **Visual Feedback**: 
  - Cyan badge on custom images
  - Status message: "✓ Custom image active (overrides generated)"
  - Loading spinner during upload
- **Priority System**: Custom images always display over generated images
- **Modal Support**: Expanded view shows custom image with "CUSTOM IMAGE" label

### 4. Image Generation Integration

**GenerationService Updates**
- Added `getCustomSceneImage()` method
- Checks for custom uploaded images before generation
- Includes custom image as primary reference for AI generation
- Works with both 'imagen' and 'imagen3' providers

**Generation Flow:**
1. User uploads custom image → stored in `scenes/` directory
2. When generating image, custom image is loaded as base64
3. Custom image added as first reference in `refInputs` array
4. AI uses custom image + character references + prompt
5. Generated image saved normally (custom image remains as override)

### 5. File Storage Structure

```
output/
  images/
    {sessionId}/
      scenes/
        scene_1_image_1_custom.png    # Custom upload for scene 1, image 1
        scene_1_image_2_custom.png    # Custom upload for scene 1, image 2
        ...
      characters/
        character_name_reference.png  # Character reference images
      {generated images from AI}
```

## UI/UX Design Decisions

### Space Efficiency
- **Compact Button**: Single full-width button instead of separate upload area
- **Contextual Text**: Button text changes based on state (upload vs replace)
- **Minimal Indicators**: Small badge and status text, not intrusive
- **Collapsible References**: Reference image selector remains collapsible

### User Experience
- **Clear Priority**: Custom images always visible, clearly marked
- **Non-Destructive**: Custom images don't delete generated images
- **Easy Replacement**: Upload again to replace custom image
- **Visual Hierarchy**: Cyan color for custom indicators (different from amber generated status)

### Status Indicators
- **Upload State**: "UPLOADING…" with cyan spinner
- **Active Custom**: "✓ Custom image active (overrides generated)"
- **Badge**: Cyan "CUSTOM" badge on image thumbnail
- **Modal Label**: "CUSTOM IMAGE" badge in expanded view

## API Integration

### Image Generation Providers
The custom image is automatically used as a reference when:
- `IMAGE_GEN_PROVIDER=imagen` or `IMAGE_GEN_PROVIDER=imagen3`
- Custom image exists for the specific scene/image
- Generation is triggered (via generate button)

### Reference Image Priority
1. Custom scene image (highest priority - added first)
2. User-selected reference images (from character/scene selector)
3. Character reference images (auto-included from characters in scene)

## Testing Checklist

- [ ] Upload custom image for a scene
- [ ] Verify custom image displays with cyan badge
- [ ] Verify "REPLACE CUSTOM IMAGE" button appears
- [ ] Upload different image to replace
- [ ] Generate image with custom reference (if using imagen)
- [ ] Verify custom image persists across page refreshes
- [ ] Test expanded modal shows custom image correctly
- [ ] Verify multiple scenes can have custom images
- [ ] Test file validation (only images allowed)

## Future Enhancements

Potential improvements:
1. Drag-and-drop support for easier upload
2. Image cropping/resizing before upload
3. Multiple custom reference images per scene
4. Custom image gallery/selector
5. Bulk upload for multiple scenes
6. Image format conversion (auto-convert to PNG)
7. Size/quality optimization
8. Undo/remove custom image option

## Files Modified

### Frontend
- `frontend/src/types/pipeline.types.ts` - Added customUploadUrl field
- `frontend/src/hooks/usePipeline.ts` - Added useUploadSceneImage hook
- `frontend/src/components/ui/ImagePromptCard.tsx` - Added upload UI and logic

### Backend
- `backend/src/pipeline/graph/state.ts` - Added customUploadUrl field
- `backend/src/pipeline/pipeline.controller.ts` - Added upload-scene-image endpoint
- `backend/src/pipeline/pipeline.service.ts` - Added uploadSceneImage method
- `backend/src/generation/generation.service.ts` - Added getCustomSceneImage method and integration

## Compatibility

- Works with existing image generation workflow
- Backward compatible (customUploadUrl is optional)
- No breaking changes to existing functionality
- Custom images work alongside generated images