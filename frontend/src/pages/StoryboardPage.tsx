import { useEffect } from 'react';
import { usePipelineStore } from '../stores/pipelineStore';
import { useSocket } from '../hooks/useSocket';
import { IdeaInput } from '../components/pipeline/IdeaInput';
import { StoryPlanReview } from '../components/pipeline/StoryPlanReview';
import { SceneWorkshop } from '../components/pipeline/SceneWorkshop';
import { ExportGallery } from '../components/pipeline/ExportGallery';

const SCREEN_LABELS: Record<string, string> = {
  idea: 'IDEA',
  plan: 'STORY PLAN',
  workshop: 'SCENE WORKSHOP',
  gallery: 'GALLERY',
};

const SCREENS = ['idea', 'plan', 'workshop', 'gallery'];

export function StoryboardPage() {
  const { screen, sessionId, setScreen } = usePipelineStore();
  useSocket(sessionId);

  const currentIndex = SCREENS.indexOf(screen);

  return (
    <div className="min-h-screen bg-stone-950 text-white">
      {/* Top nav bar */}
      {screen !== 'idea' && (
        <nav className="fixed top-0 left-0 right-0 z-40 border-b border-stone-800/60 bg-stone-950/90 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
            <button
              onClick={() => setScreen('idea')}
              className="flex items-center gap-2 hover:opacity-70 transition-opacity"
            >
              <div className="w-6 h-6 rounded bg-amber-500 flex items-center justify-center text-black text-xs font-black">▶</div>
              <span className="text-sm font-black tracking-tight hidden sm:block">STORYBOARD AI</span>
            </button>

            {/* Step indicators */}
            <div className="flex items-center gap-1 sm:gap-3">
              {SCREENS.slice(1).map((s, i) => {
                const stepIdx = i + 1;
                const isPast = currentIndex > stepIdx;
                const isCurrent = currentIndex === stepIdx;
                return (
                  <div key={s} className="flex items-center gap-1 sm:gap-2">
                    {i > 0 && <div className="w-4 sm:w-8 h-px bg-stone-800" />}
                    <button
                      onClick={() => setScreen(s)}
                      className={`flex items-center gap-1.5 px-2 sm:px-3 py-1 rounded-full text-xs font-mono transition-all cursor-pointer ${
                        isCurrent ? 'bg-amber-500 text-black font-black' :
                        isPast ? 'text-amber-400/60 hover:text-amber-400 hover:bg-amber-900/30' :
                        'text-stone-600 hover:text-stone-400 hover:bg-stone-800/50'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${
                        isCurrent ? 'bg-black/20' :
                        isPast ? 'bg-amber-900/50' :
                        'bg-stone-800'
                      }`}>
                        {isPast ? '✓' : stepIdx}
                      </span>
                      <span className="hidden sm:block">{SCREEN_LABELS[s]}</span>
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="w-20" /> {/* spacer */}
          </div>
        </nav>
      )}

      {/* Screen content */}
      <div className={screen !== 'idea' ? 'pt-14' : ''}>
        {screen === 'idea' && <IdeaInput />}
        {screen === 'plan' && <StoryPlanReview />}
        {screen === 'workshop' && <SceneWorkshop />}
        {screen === 'gallery' && <ExportGallery />}
      </div>
    </div>
  );
}
