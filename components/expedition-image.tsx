import Image, { type ImageProps } from "next/image"

export function ExpeditionImage({ src, preload, loading, unoptimized, fetchPriority, alt, fill, className, ...props }: ImageProps) {
  const path = typeof src === "string" ? src : "https://chalotravellers.com/wp-content/uploads/2025/07/Spiti-Valley.jpg"
  if (path.startsWith("https://")) {
    return (
      // Remote https hosts are not in images.remotePatterns, so they bypass the optimizer.
      // eslint-disable-next-line @next/next/no-img-element
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
