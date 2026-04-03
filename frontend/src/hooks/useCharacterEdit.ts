import { usePipelineStore } from '../stores/pipelineStore';
import { useState } from 'react';

export function useCharacterEdit() {
  const { sessionId } = usePipelineStore();
  const [isUpdating, setIsUpdating] = useState(false);

  const updateCharacterDescription = async (characterName: string, description: string) => {
    if (!sessionId) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/pipeline/${sessionId}/update-character-description`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          characterName,
          description
        }),
      });

      if (response.ok) {
        // Update local state
        const currentState = usePipelineStore.getState();
        const updatedCharacterDefinitions = {
          ...currentState.characterDefinitions,
          [characterName]: description
        };
        usePipelineStore.setState({ characterDefinitions: updatedCharacterDefinitions });
      } else {
        console.error('Failed to update character description');
      }
    } catch (error) {
      console.error('Error updating character description:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const updateSceneText = async (sceneIndex: number, sceneText: string) => {
    if (!sessionId) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/pipeline/${sessionId}/update-scene-text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sceneIndex,
          sceneText
        }),
      });

      if (response.ok) {
        // Update local state
        const currentState = usePipelineStore.getState();
        const updatedScenes = [...currentState.scenes];
        if (updatedScenes[sceneIndex]) {
          updatedScenes[sceneIndex] = {
            ...updatedScenes[sceneIndex],
            sceneText
          };
        }
        usePipelineStore.setState({ scenes: updatedScenes });
      } else {
        console.error('Failed to update scene text');
      }
    } catch (error) {
      console.error('Error updating scene text:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const updateSceneGoal = async (sceneIndex: number, goal: string) => {
    if (!sessionId) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/pipeline/${sessionId}/update-scene-goal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sceneIndex,
          goal
        }),
      });

      if (response.ok) {
        // Update local state
        const currentState = usePipelineStore.getState();
        const updatedScenes = [...currentState.scenes];
        if (updatedScenes[sceneIndex]) {
          updatedScenes[sceneIndex] = {
            ...updatedScenes[sceneIndex],
            goal
          };
        }
        usePipelineStore.setState({ scenes: updatedScenes });
      } else {
        console.error('Failed to update scene goal');
      }
    } catch (error) {
      console.error('Error updating scene goal:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const updateSceneLocation = async (sceneIndex: number, location: string) => {
    if (!sessionId) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/pipeline/${sessionId}/update-scene-location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sceneIndex,
          location
        }),
      });

      if (response.ok) {
        // Update local state
        const currentState = usePipelineStore.getState();
        const updatedScenes = [...currentState.scenes];
        if (updatedScenes[sceneIndex]) {
          updatedScenes[sceneIndex] = {
            ...updatedScenes[sceneIndex],
            location
          };
        }
        usePipelineStore.setState({ scenes: updatedScenes });
      } else {
        console.error('Failed to update scene location');
      }
    } catch (error) {
      console.error('Error updating scene location:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return {
    updateCharacterDescription,
    updateSceneText,
    updateSceneGoal,
    updateSceneLocation,
    isUpdating
  };
}