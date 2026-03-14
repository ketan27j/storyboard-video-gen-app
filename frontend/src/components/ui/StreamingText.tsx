import { useEffect, useState } from 'react';

interface StreamingTextProps {
  text: string;
  className?: string;
  speed?: number;
  onDone?: () => void;
}

export function StreamingText({ text, className = '', speed = 18, onDone }: StreamingTextProps) {
  const [displayed, setDisplayed] = useState('');
  const [cursor, setCursor] = useState(true);

  useEffect(() => {
    if (!text) { setDisplayed(''); return; }
    let i = 0;
    setDisplayed('');
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(interval);
        setTimeout(() => { setCursor(false); onDone?.(); }, 400);
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text]);

  useEffect(() => {
    const blink = setInterval(() => setCursor((c) => !c), 530);
    return () => clearInterval(blink);
  }, []);

  return (
    <span className={className}>
      {displayed}
      {cursor && displayed.length < (text?.length ?? 0) && (
        <span className="inline-block w-0.5 h-4 bg-amber-400 ml-0.5 align-middle" />
      )}
    </span>
  );
}
