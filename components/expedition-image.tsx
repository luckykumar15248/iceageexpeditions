import Image, { type ImageProps } from "next/image"

export function ExpeditionImage({ src, preload, loading, unoptimized, fetchPriority, alt, fill, className, ...props }: ImageProps) {
  const path = typeof src === "string" ? src : ""
  if (path.startsWith("https://")) {
    return (
      <img
        src={path}
        alt={alt}
        className={fill ? `absolute inset-0 h-full w-full ${className ?? ""}` : className}
      />
    )
  }
  const svg = path.endsWith(".svg")
  const eager = preload === true
  return (
    <Image
      {...props}
      src={src}
      alt={alt}
      fill={fill}
      className={className}
      unoptimized={svg || unoptimized}
      preload={eager}
      fetchPriority={eager ? (fetchPriority ?? "high") : fetchPriority}
      loading={eager ? "eager" : (loading ?? "lazy")}
    />
  )
}
