interface StarRatingProps {
  rating: number;
  maxStars?: number;
  size?: "sm" | "md" | "lg";
}

const SIZE = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-xl",
};

export function StarRating({ rating, maxStars = 5, size = "md" }: StarRatingProps) {
  return (
    <span
      className={`inline-flex gap-0.5 ${SIZE[size]}`}
      aria-label={`${rating} out of ${maxStars} stars`}
    >
      {Array.from({ length: maxStars }).map((_, i) => (
        <span
          key={i}
          className={i < rating ? "star-filled" : "star-empty"}
          aria-hidden="true"
        >
          ★
        </span>
      ))}
    </span>
  );
}
