# Design Tokens Guide — gastroo.space

## System overview

**gastroo.space** uses two complementary token systems for responsive, scalable UI:

| System | File | Usage | Approach | Basis |
|--------|------|-------|----------|-------|
| **UI** | `src/styles/theme.ts` | General layout, typography, spacing | `vmin()`, `vw()`, `vh()` | MUI-compatible, responsive scales with viewport |
| **T** | `src/styles/pos.tokens.ts` | POS, dashboard, table, PIN numpad | `clamp()` with vw/vh | Constrained min–preferred–max for touch targets |

---

## 1. UI System (`src/styles/theme.ts`)

The **UI** system provides general-purpose tokens for the main application layout, used across login, landing, navbar, footer, and dashboard shells.

### Structure

```typescript
export const UI = {
  // Footer layout: responsive padding, spacing, font sizes
  footer: { py, containerPx, stackSpacing, logoFontSize, ... }
  
  // Border radius: sm/md/lg/xl
  radius: { sm, md, lg, xl }
  
  // Border widths: hair/thin/thick
  borderWidth: { hair, thin, thick }
  
  // Dropdown indicator height
  indicatorHeight: vmin(3)
  
  // Blur effects: sm/md/hero
  blur: { sm, md, hero }
  
  // Spacing scale: xxs–xl
  space: { xxs, xs, sm, md, lg, xl }
  
  // Maximum widths for sections
  size: { footerColMaxW, heroSubtitleMaxW, demoSubtitleMaxW, offerMaxCardW, langMenuMaxH }
  
  // Shadow helpers: popover, soft
  shadow: { popover(opacity), soft(opacity) }
}
```

### Reference units
- **vmin(n)**: Scales with minimum of (width, height) at 768×1024px reference viewport
- **vw(n)**: Scales with viewport width (100vw = all width)
- **vh(n)**: Scales with viewport height (100vh = all height)

### When to use UI

Use `UI.*` for:
- ✅ Footer, navbar, landing page sections
- ✅ General-purpose spacing, typography, shadows
- ✅ Blog, about, settings pages (non-POS)
- ✅ Modal/dialog borders and spacing
- ✅ Responsive typography for announcements

Do **NOT** use UI for:
- ❌ PIN numpad, POS buttons, dashboard table
- ❌ Touch-critical elements requiring >44px min size
- ❌ POS-specific layout (use **T** instead)

### Examples

```typescript
import { UI } from '@/styles/theme';

function Footer() {
  return (
    <Box sx={{ py: UI.footer.py, px: UI.footer.containerPx }}>
      <Typography sx={{ fontSize: UI.footer.logoFontSize }}>
        Logo
      </Typography>
      <Stack spacing={UI.space.lg}>
        {/* Spacing using UI.space.lg */}
      </Stack>
    </Box>
  );
}
```

---

## 2. T System (`src/styles/pos.tokens.ts`)

The **T** system provides specialized tokens for Point-of-Sale, dashboard, and touch-first interfaces. All values use `clamp(min, preferred, max)` to guarantee minimum touch size (44+px) on small devices and natural scaling on large screens.

### Structure

```typescript
const T = {
  // Logo badge sizing (portrait, landscape)
  logoBadge: clamp(72vw, 12.5vw, 128vw)
  logoBadgeLandscape: clamp(52vh, 8vh, 80vh)
  logoIcon: clamp(36vw, 6.25vw, 64vw)
  logoIconLandscape: clamp(22vh, 4vh, 36vh)
  
  // PIN numpad buttons (portrait, landscape)
  pinButton: clamp(54vw, 9.6vw, 84vw)
  pinButtonLandscape: clamp(46vh, 7.5vh, 62vh)
  pinIndicatorH: clamp(32vh, 5.7vh, 52vh)
  pinDot: clamp(12vw, 2.3vw, 20vw)
  backspaceIcon: clamp(20vw, 3.4vw, 28vw)
  pinOkFont: clamp(12vw, 1.8vw, 16vw)
  pinDigitFont: clamp(22vw, 3.9vw, 34vw)
  
  // Login (footer clock)
  loginClockFont: clamp(16vw, 3.1vw, 28vw)
  
  // Dashboard typography
  dashClockFont: clamp(24vw, 4.2vw, 44vw)
  statValueFont: clamp(22vw, 3.5vw, 38vw)
  bookingTimeFont: clamp(12vw, 2vw, 17vw)
  emptyIcon: clamp(28vw, 5.2vw, 48vw)
  statusDot: clamp(6vw, 1vw, 10vw)
  
  // Layout
  bottomNavH: clamp(48vh, 8vh, 68vh)
  
  // Typography helpers
  captionFont: clamp(9vw, 1.2vw, 11vw)
  navLabelFont: 'clamp(0.6rem, 1.1vw, 0.72rem)'
}
```

### Reference viewport
- **Base**: 768px (width) × 1024px (height)
- **clamp()**: Guarantees touch targets stay ≥44px on small devices, scale smoothly on desktop

### When to use T

Use `T.*` for:
- ✅ PIN numpad buttons
- ✅ Dashboard table bubbles, cards, typography
- ✅ POS login footer
- ✅ Touch-critical buttons, badges, icons
- ✅ Any font size that needs to remain readable on both 375px phones and 1920px monitors

Do **NOT** use T for:
- ❌ General layout (use **UI** instead)
- ❌ Landing page, blog, marketing content
- ❌ Non-interactive typography (use `UI.footer.fontSize` or MUI default sizes)

### Examples

```typescript
import T from '@/styles/pos.tokens';
import { vmin } from '@/styles/units';

function PINpad() {
  return (
    <Button
      sx={{
        width: T.pinButton,
        height: T.pinButton,
        fontSize: T.pinDigitFont,
        '@media (max-height: 37.5rem)': {
          width: T.pinButtonLandscape,
          height: T.pinButtonLandscape,
        },
      }}
    >
      5
    </Button>
  );
}

function TableBubble({ table }) {
  const size = table.capacity <= 2 ? vmin(52) : vmin(72);
  return (
    <Box
      sx={{
        width: size,
        height: table.shape === 'rectangle' ? `calc(${size} * 0.7)` : size,
        fontSize: T.bookingTimeFont,
      }}
    >
      {table.number}
    </Box>
  );
}
```

---

## 3. Unit Helpers (`src/styles/units.ts`)

Base functions for responsive values. **Always use these** instead of hardcoding px, rem, or vw/vh.

```typescript
import { vh, vw, vmin } from '@/styles/units';

// At 768×1024px reference viewport:
vmin(16)   // 16px equivalent (scales with min of width/height)
vw(300)    // 300px width equivalent (scales with viewport width)
vh(240)    // 240px height equivalent (scales with viewport height)
```

### Reference viewport
- **Width**: 768px (tablet portrait)
- **Height**: 1024px (tablet portrait)
- **Formula**: `value / reference * 100`
  - `vmin(16)` = `16/768 * 100vmin ≈ 2.08vmin` (actual output)
  - At 768×1024, evaluates to exactly 16px
  - At 1536×2048 (2x), evaluates to exactly 32px

---

## 4. Theme Registry (`src/app/[lang]/components/ThemeRegistry.tsx`)

Applies both token systems and enforces dark/light mode preference.

```typescript
import { UI } from '@/styles/theme';
import T from '@/styles/pos.tokens';

function ThemeRegistry({ children }) {
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const theme = createTheme({
    palette: prefersDark ? darkPalette : lightPalette,
    // Theme uses UI and T internally via sx props in components
  });
  // ...
}
```

---

## 5. Decision Tree — Which Token System to Use?

```
Is this for POS, dashboard, or touch-first interface?
├─ YES: Use T (clamp-based, guaranteed 44+px touch targets)
│  Examples: pinButton, dashClockFont, bookingTimeFont, bottomNavH, captionFont
│
└─ NO: Is this for general layout (footer, navbar, landing)?
   ├─ YES: Use UI (vmin-based, general responsive scaling)
   │  Examples: UI.space, UI.footer, UI.radius, UI.size
   │
   └─ NO: Use MUI built-in defaults
      Examples: variant="body2", size="small", spacing={2}, etc.
```

---

## 6. Validation Checklist

Before committing component changes:

- [ ] All hardcoded sizes (except `width: 100%`, structural properties) use `vmin()`, `vw()`, `vh()`, or token references
- [ ] No `px` in `src/app/[lang]/**/*.tsx` (except images, borders which are MUI-managed)
- [ ] PIN numpad, dashboard, POS elements use **T** tokens
- [ ] Landing page, footer, navbar use **UI** tokens or MUI defaults
- [ ] Touch targets are ≥44px (verified via responsive testing on 375px device)
- [ ] Typography scales smoothly from 375px to 1920px (no jumps or truncation)
- [ ] Dark mode colors are readable (verify in ThemeRegistry dark palette)

---

## 7. Maintenance & Extension

### Adding new T tokens

If a new POS component needs a specific size (e.g., for a new button style):

```typescript
// In src/styles/pos.tokens.ts, add to the T object:
myNewButton: `clamp(${vw(48)}, 8vw, ${vw(72)})`,

// Then export as const and use in component:
import T from '@/styles/pos.tokens';

<Button sx={{ width: T.myNewButton, height: T.myNewButton }}>
  Click me
</Button>
```

**Rule**: Always wrap custom spacing in `clamp()` or unit helpers — never hardcode px.

### Adding new UI tokens

For general-purpose scaling (e.g., new footer height variant):

```typescript
// In src/styles/theme.ts, add to the UI object:
footer: {
  py: { xs: vmin(12), sm: vmin(16), md: vmin(24) },
  // ... new property:
  compactHeight: vmin(40),
}

// Use as:
import { UI } from '@/styles/theme';
<Box sx={{ height: UI.footer.compactHeight }}>...</Box>
```

---

## 8. Troubleshooting

### "My component looks different on mobile vs desktop"
→ Check if all sizes use `vmin()`, `vw()`, or `T.*` tokens. Hardcoded `rem` and `em` scale with font size, not viewport.

### "Button is too small to tap on small device"
→ Ensure pin/POS button uses **T** token with `clamp()`. Minimum should be ≥44px (44 / 768 * 100 ≈ 5.7vw).

### "Font text overflows on desktop"
→ Use component-level token (e.g., `T.bookingTimeFont`), not global fontSize. Or wrap in `Box` with `maxWidth: UI.size.heroSubtitleMaxW`.

### "Dark mode looks broken"
→ Check `ThemeRegistry` is applied to app shell. All MUI components automatically inherit dark colors via `sx` and theme palette.

---

## References

- **Units**: `src/styles/units.ts`
- **Theme**: `src/styles/theme.ts`
- **POS Tokens**: `src/styles/pos.tokens.ts`
- **Theme Registry**: `src/app/[lang]/components/ThemeRegistry.tsx`
- **Dashboard**: `src/app/[lang]/dashboard/components/`
- **MUI Docs**: https://mui.com/material-ui/api/
