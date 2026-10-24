# Design refresh

The reading interface retains the original theme families and wallpaper images:
Classic gold, Cosmos blue, Nature green, Beach teal, Light warm cream, and Dark
gold. Accents use softer degrees of those original colors, including satin gold
and champagne highlights. The light theme has darker icon tones.
Category names remain visible beside semantic line icons. Menus, the reader,
account controls, admin tools, and static marketing/legal pages use SVG icons
in place of emoji decoration.

`DepthSurface` keeps cards fixed with no pointer tilt, spring, hover lift, or tap
scaling. Book covers retain their spine and page-edge treatment. KPI tiles use
fixed, stacked CSS 3D icon sculptures. A brief fade occurs once on viewport entry;
`prefers-reduced-motion` disables decorative movement through both MotionConfig
and CSS. Book opening and shelf saving are separate native buttons.
The viewport allows browser zoom.

Development review: run `npm run dev`, then open `/?design=1`. This uses only
the five local marine biology fixtures, with no authentication or database writes.
The preview branch is gated by `import.meta.env.DEV` and removed from production.

Validated with the production build, application type checking (with existing
unused declarations excluded), the six content import tests, a literal scan for
remaining UI emojis, and browser checks for card opening, shelf/KPI updates,
dark/light themes, and a 390px layout without horizontal overflow.
