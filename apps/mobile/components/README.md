# Mobile components

The mobile theme uses warm neutral surfaces, forest green actions, native system type, and consistent outline icons. Keep screens quiet and useful, with no ad slots, sponsored content, or invented activity. The current palette lives in `../global.css`; native navigation and SVG colors in `../lib/theme.ts` must match it. The app currently uses a light appearance.

Use `ui/Screen` for scrolling forms and `PageIntro` for screen headings. Keep controls at least 44 points tall, let labels wrap, and preserve system text scaling. `Button`, `Chip`, and `Input` share the same interaction styling. Use `EmptyState` and `ScreenState` for readable empty, loading, and retry states. Put new copy in both mobile dictionaries in `@opensociety/shared`.

Check native rendering on iPhone and Android. Browser rendering and TypeScript checks do not establish visual acceptance. In NativeWind v5, explicit `contentContainerStyle` is needed for FlatList spacing here, and physical padding properties keep Android TextInput text inset correctly. Large text, long labels, keyboard access, and bottom safe areas need a device check whenever layouts change.

Lucidity task #101 tracks full design acceptance. The first pass establishes the visual direction and shared layouts. App icon/splash branding, complete state coverage, screen-reader review, and physical-device acceptance remain open. Local visual fixtures and screenshots belong in `.context/`; they must not become production data or routes.
