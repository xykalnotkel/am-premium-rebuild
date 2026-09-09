// Icon library — ikon AI ungu (3D-clay rasa 2D), transparan, format WebP.
// Pakai: <AppIcon name="mail" size={24} />
// File: /public/icons/{name}.webp (256px) + {name}-512.webp (retina)

const NAMES = ["logo", "mail", "link", "shield", "chart", "terminal", "download", "sparkles"];

export const ICON_NAMES = NAMES;

export default function AppIcon({ name = "logo", size = 24, className = "", alt }) {
  const n = NAMES.includes(name) ? name : "logo";
  return (
    <img
      src={`/icons/${n}.webp`}
      srcSet={`/icons/${n}.webp 1x, /icons/${n}-512.webp 2x`}
      width={size}
      height={size}
      alt={alt || `${n} icon`}
      draggable={false}
      className={`ai ${className}`}
      style={{ width: size, height: size }}
      loading="lazy"
    />
  );
}
