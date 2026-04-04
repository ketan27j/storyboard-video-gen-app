import { useState } from 'react';
import { usePipelineStore } from '../../stores/pipelineStore';
import { useStartPipeline } from '../../hooks/usePipeline';

const EXAMPLES = [
  'Mother (Sajiri)(around 30s) explaining importance of Gudhi Padava festival in india to her 4 yr daughter (Chinu) in brief. What indian people do during that festival. eg: They mount Gudhi in their home decorated with sari, flowers, garlands, which is symbol of prosperity and new beginning. They prepare special food like Shrikhand puri, puran poli. They have shobha yatra with traditional attire of navvari and feta, dhoti.',
  'Mother (Sajiri)(around 30s) explaining importance of Ram Navami festival in india to her 4 yr daughter (Chinu) in brief. What indian people do during that festival. eg: Visit temples dedicated to Lord Rama, Do fasting or eat simple satvik food like fruits, sabudana dishes, or kheer and Temples decorate idols and sometimes re-enact scenes from the Ramayana',
  'Koli lady (Sajiri) and other 4 fair ladies with different faces wearing traditional nauwari sadi having hair bun with veni in it & capturing fish (paplet) in konkan sea & then making paplet fry at home in indian village',
];

export function IdeaInput() {
  const { movieIdea, setMovieIdea, isLoading, error } = usePipelineStore();
  const [charCount, setCharCount] = useState(0);
  const startPipeline = useStartPipeline();

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMovieIdea(e.target.value);
    setCharCount(e.target.value.length);
  };

  const handleSubmit = () => {
    if (!movieIdea.trim() || isLoading) return;
    startPipeline.mutate(movieIdea.trim());
  };

  const handleExample = (ex: string) => {
    setMovieIdea(ex);
    setCharCount(ex.length);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16 relative overflow-hidden">
      {/* Background film grain effect */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'1\'/%3E%3C/svg%3E")',
          backgroundRepeat: 'repeat',
          backgroundSize: '128px',
        }}
      />

      {/* Film strip top decoration */}
      <div className="absolute top-0 left-0 right-0 h-12 flex items-center overflow-hidden opacity-20">
        {Array.from({ length: 30 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-8 h-8 border border-stone-500 mx-1 rounded-sm" />
        ))}
      </div>

      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center text-black font-black text-xl">
              ▶
            </div>
            <span className="text-2xl font-black tracking-tight text-white">STORYBOARD AI</span>
          </div>
          <p className="text-stone-400 text-sm font-mono tracking-widest">
            FROM IDEA TO STORYBOARD IN MINUTES
          </p>
        </div>

        {/* Main heading */}
        <h1 className="text-3xl sm:text-4xl font-black text-center text-white mb-2 leading-tight">
          What's your{' '}
          <span className="text-amber-400 italic">movie idea?</span>
        </h1>
        <p className="text-center text-stone-500 text-sm mb-8">
          Describe your concept — we'll generate a full scene breakdown, image sequences, and video prompts.
        </p>

        {/* Textarea */}
        <div className="relative mb-4">
          <textarea
            value={movieIdea}
            onChange={handleChange}
            placeholder="A heartbroken astronaut stranded on a distant moon discovers a signal from Earth — sent by herself, 50 years in the future…"
            rows={5}
            className="w-full bg-stone-900 border border-stone-700 rounded-2xl px-5 py-4 text-stone-200 text-sm leading-relaxed resize-none focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/20 placeholder-stone-600 font-light transition-all"
          />
          <span className="absolute bottom-3 right-4 text-xs text-stone-600 font-mono">{charCount}</span>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-rose-950/50 border border-rose-800/50 text-rose-400 text-sm">
            {error}
          </div>
        )}

        {/* CTA */}
        <button
          onClick={handleSubmit}
          disabled={!movieIdea.trim() || isLoading}
          className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:bg-stone-800 disabled:text-stone-600 text-black font-black text-sm tracking-widest uppercase transition-all duration-200 flex items-center justify-center gap-3 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              GENERATING STORYBOARD…
            </>
          ) : (
            'GENERATE STORYBOARD →'
          )}
        </button>

        {/* Examples */}
        <div className="mt-8">
          <p className="text-xs text-stone-600 font-mono tracking-widest text-center mb-3">OR TRY AN EXAMPLE</p>
          <div className="space-y-2">
            {EXAMPLES.map((ex, i) => (
              <button
                key={i}
                onClick={() => handleExample(ex)}
                className="w-full text-left px-4 py-3 rounded-xl border border-stone-800 hover:border-stone-600 text-stone-500 hover:text-stone-300 text-xs leading-relaxed transition-all duration-200 bg-stone-900/30 hover:bg-stone-900/60"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Film strip bottom decoration */}
      <div className="absolute bottom-0 left-0 right-0 h-12 flex items-center overflow-hidden opacity-20">
        {Array.from({ length: 30 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-8 h-8 border border-stone-500 mx-1 rounded-sm" />
        ))}
      </div>
    </div>
  );
}
