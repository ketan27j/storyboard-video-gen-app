import { usePipelineStore } from '../../stores/pipelineStore';
import { useHistoryList, useLoadHistorySession, useDeleteHistorySession } from '../../hooks/useHistory';

export function HistoryPage() {
  const { data: sessions, isLoading } = useHistoryList();
  const loadSession = useLoadHistorySession();
  const deleteSession = useDeleteHistorySession();
  const { setState, setScreen } = usePipelineStore();

  const handleLoadSession = async (sessionId: string) => {
    const state = await loadSession.mutateAsync(sessionId);
    // When loading from history, reset currentSceneIndex to 0 so the workshop
    // always starts from the first scene (DB may store index past last scene).
    const stateWithReset = state.scenes && state.scenes.length > 0
      ? { ...state, currentSceneIndex: 0 }
      : state;
    setState(stateWithReset);
    
    // Auto navigate to correct screen based on state
    if (state.scenes && state.scenes.length > 0) {
      setScreen('workshop');
    } else if (state.storySnapshot) {
      setScreen('plan');
    } else {
      setScreen('idea');
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen px-4 sm:px-6 py-12 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-white mb-2">📜 Generation History</h1>
        <p className="text-stone-400 text-sm">All your previously generated storyboards</p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && (!sessions || sessions.length === 0) && (
        <div className="text-center py-16 text-stone-500">
          <p className="mb-2">No history yet</p>
          <p className="text-xs">Generate your first storyboard to see it here</p>
        </div>
      )}

      <div className="space-y-3">
        {sessions?.map((session: any) => (
          <div
            key={session.id}
            className="border border-stone-700/50 rounded-xl bg-stone-900/30 p-4 hover:bg-stone-900/50 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium line-clamp-2 mb-1">
                  {session.movieIdea}
                </p>
                <p className="text-xs text-stone-500 font-mono mb-0.5">
                  {formatDate(session.updatedAt)}
                </p>
                <p className="text-[10px] text-stone-600 font-mono">
                  ID: {session.id}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleLoadSession(session.id)}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold tracking-wider uppercase transition-colors"
                >
                  Open
                </button>
                <button
                  onClick={() => deleteSession.mutate(session.id)}
                  className="px-3 py-1.5 rounded-lg border border-rose-700/50 text-rose-400 text-xs font-bold tracking-wider uppercase hover:bg-rose-950/30 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}