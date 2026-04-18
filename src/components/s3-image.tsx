import { useEffect, useState } from "react";
import { getS3ImageUrl } from "@/lib/s3";

interface S3ImageProps {
  entity: "customer" | "guarantor" | "personal";
  filename: string | undefined;
  className?: string;
  alt?: string;
}

export function S3Image({ entity, filename, className, alt }: S3ImageProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
    if (!filename || filename === "empty") {
      setUrl(null);
      return;
    }
    getS3ImageUrl(entity, filename).then(setUrl);
  }, [entity, filename]);

  if (!url || hasError) {
    return (
      <div
        className={`flex items-center justify-center rounded-md border bg-muted text-muted-foreground ${className ?? "h-24 w-24"}`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
          <circle cx="9" cy="9" r="2" />
          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={alt ?? ""}
      className={`rounded-md object-cover ${className ?? "h-24 w-24"}`}
      onError={() => setHasError(true)}
    />
  );
}
