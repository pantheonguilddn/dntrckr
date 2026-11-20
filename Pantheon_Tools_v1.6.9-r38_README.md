# Pantheon Tools v1.6.9-r38

## Guild Hub smoke treatment

Replaced the former yellowish accent haze with a slow, multi-layer smoke swirl. The smoke drifts and subtly rotates over the Pantheon emblem, then softens into the Guild Hub card. It uses restrained theme-specific colors:

- Dark: silver-blue and slate smoke
- Light: soft blue mist
- Eye Comfort: muted sage and stone
- Pastel: lavender and periwinkle

The animated layers are intentionally low contrast so the title, descriptions, and emblem remain legible. `prefers-reduced-motion` disables the animation.

## Admin-only shared background selection

The Guild Hub background selector is visible only when an authenticated Pantheon administrator has Admin View enabled and is not using View As. All other members see the committed background but cannot select or change it.

The chosen style is stored in the existing shared `settings` object and synchronized to members. The API accepts changes only from a session whose role is `admin` with the Admin View header, validates the style against the supported options, and preserves the prior server value during ordinary member syncs. The existing database schema is sufficient; no migration is needed.

## Preserved

- Existing Pantheon emblem PNG assets and Guild Hub composition
- Existing background options
- Overview metrics, Activity Insights carousel, and Character Completion
- D1 schema and player-scoped character storage
- Authentication, bindings, secrets, tracker synchronization, and historical records
