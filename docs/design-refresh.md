# Design refresh

The reading interface uses muted sage, slate, sand, and ivory tones. All six
themes share the same surface hierarchy; the light theme has darker icon tones.
Category names remain visible beside semantic line icons. Menus, the reader,
account controls, admin tools, and static marketing/legal pages use SVG icons
in place of emoji decoration.

`DepthSurface` supplies pointer-responsive perspective with spring motion values,
so moving across a card does not re-render the whole catalog. Book covers have
a spine and page-edge treatment. KPI tiles use stacked CSS 3D icon sculptures.
Entrances occur once on viewport entry. Touch uses a small press response;
`prefers-reduced-motion` disables tilt and decorative movement through both
MotionConfig and CSS. Book opening and shelf saving are separate native buttons.
The viewport allows browser zoom.

Development review: run `npm run dev`, then open `/?design=1`. This uses only
the five local marine biology fixtures, with no authentication or database writes.
The preview branch is gated by `import.meta.env.DEV` and removed from production.

Validated with the production build, application type checking (with existing
unused declarations excluded), the six content import tests, a literal scan for
remaining UI emojis, and browser checks for card opening, shelf/KPI updates,
dark/light themes, and a 390px layout without horizontal overflow.
