// Logo "casinha" LocExpress — porta de app.py:_logo_svg
export default function LogoSvg({ color = "#FFFFFF", size = 44 }: { color?: string; size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 200 210" fill={color}>
      <path
        fillRule="evenodd"
        d="M100,6 L192,72 L192,202 L8,202 L8,72 Z M100,34 L168,80 L168,174 L32,174 L32,80 Z"
      />
      <polygon points="168,107 168,125 68,125 68,138 32,116 68,94 68,107" />
      <polygon points="32,142 32,160 130,160 130,174 192,151 130,128 130,142" />
    </svg>
  );
}
