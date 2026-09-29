import React from 'react';

interface FlipCounterDisplayProps {
  value: number;
}

export const FlipCounterDisplay: React.FC<FlipCounterDisplayProps> = ({ value }) => {
  const formattedStr = value.toLocaleString('en-US');

  return (
    <div className="spacex-counter-container" aria-label={`Current Souls Won: ${value}`}>
      <div className="spacex-hero-number">
        {formattedStr}
      </div>
    </div>
  );
};
