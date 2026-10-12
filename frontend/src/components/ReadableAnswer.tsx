import React from 'react';

function renderInline(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|__[^_]+__|\*[^*\n]+\*)/g).map((part, index) => {
    if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

export const ReadableAnswer: React.FC<{ text: string }> = ({ text }) => (
  <div className="space-y-2.5 text-[13px] leading-6 text-slate-700">
    {text.split(/\r?\n/).map((rawLine, index) => {
      const line = rawLine.trim();
      if (!line) return <div key={index} className="h-1" />;

      const heading = line.match(/^#{1,6}\s+(.+)$/);
      if (heading) {
        return (
          <h3 key={index} className="pt-2 text-sm font-semibold text-slate-900">
            {renderInline(heading[1])}
          </h3>
        );
      }

      const listItem = line.match(/^(?:[-*•]|\d+[.)])\s+(.+)$/);
      if (listItem) {
        return (
          <div key={index} className="flex gap-2 pl-1">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />
            <p>{renderInline(listItem[1])}</p>
          </div>
        );
      }

      return <p key={index}>{renderInline(line)}</p>;
    })}
  </div>
);
