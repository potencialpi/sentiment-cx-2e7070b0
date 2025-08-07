import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  value?: number;
  onChange?: (rating: number) => void;
  disabled?: boolean;
  className?: string;
}

export const StarRating = ({ value = 0, onChange, disabled = false, className }: StarRatingProps) => {
  const [hoveredStar, setHoveredStar] = useState(0);

  const handleStarClick = (rating: number) => {
    if (!disabled && onChange) {
      onChange(rating);
    }
  };

  const handleStarHover = (rating: number) => {
    if (!disabled) {
      setHoveredStar(rating);
    }
  };

  const handleMouseLeave = () => {
    if (!disabled) {
      setHoveredStar(0);
    }
  };

  return (
    <div 
      className={cn("flex items-center gap-1", className)}
      onMouseLeave={handleMouseLeave}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            "h-6 w-6 cursor-pointer transition-colors",
            disabled && "cursor-not-allowed opacity-50",
            (hoveredStar >= star || value >= star)
              ? "fill-yellow-400 text-yellow-400"
              : "text-gray-300 hover:text-yellow-300"
          )}
          onClick={() => handleStarClick(star)}
          onMouseEnter={() => handleStarHover(star)}
        />
      ))}
      {value > 0 && (
        <span className="ml-2 text-sm text-gray-600 font-medium">
          {value}/5
        </span>
      )}
    </div>
  );
};