# Design System Document: The Fluid Social Protocol

## 1. Overview & Creative North Star
### The Creative North Star: "Electric Intimacy"
This design system is built to bridge the gap between the utilitarian nature of a messenger and the ephemeral, high-energy vibe of social discovery. We move away from the rigid, "boxed-in" layout of traditional chat apps. Instead, we embrace **Electric Intimacy**—a philosophy that prioritizes content and connection through a liquid UI.

To break the "template" look, we utilize **Intentional Asymmetry**. Avatars may overlap container edges, and typography scales jump aggressively between massive, expressive headlines and microscopic, functional labels. The goal is an editorial feel that feels "designed" rather than "populated."

---

## 2. Colors & Surface Philosophy
The palette is rooted in a deep, nocturnal base (`surface: #0c0e17`) to make vibrant gradients pop with cinematic intensity.

### The "No-Line" Rule
**Strict Mandate:** Standard 1px solid borders are prohibited for sectioning. 
Structure is defined through **Tonal Shifting**. A list of chats does not use dividers; instead, the active chat might sit on `surface-container-high`, while the background list rests on `surface-container`. This creates a seamless, high-end "molded" look.

### Surface Hierarchy & Nesting
Use the Material-based container tiers to create a "nested" physical depth:
- **Level 0 (Base):** `surface` (#0c0e17) - The canvas.
- **Level 1 (Subtle Inset):** `surface-container-low` (#11131d) - Search bars or background groups.
- **Level 2 (Elevated):** `surface-container-highest` (#222532) - Active chat bubbles or modal backgrounds.

### The "Glass & Gradient" Rule
Floating elements (Navigation bars, Action sheets) must utilize **Glassmorphism**. Use `surface-variant` at 60% opacity with a `20px` backdrop blur. This allows the vibrant `primary` (#9ba8ff) and `tertiary` (#e966ff) gradients of the background content to "ghost" through the UI, maintaining a sense of spatial awareness.

---

## 3. Typography: The Editorial Voice
We use a dual-typeface system to balance technical precision with social energy.

*   **Display & Headlines:** `plusJakartaSans`. Used for high-impact moments (Onboarding, Profiles). It is wide, modern, and expensive-looking.
*   **Body & Labels:** `manrope`. Used for the "meat" of the app (Chat messages, settings). It is highly legible at small scales with a geometric soul.

**Hierarchy Strategy:**
- **Expressive Contrast:** Use `display-lg` (3.5rem) for welcome screens immediately followed by `body-sm` (0.75rem) for legal/subtext. This "size-pairing" creates an intentional, high-fashion aesthetic.
- **Clean Clutter:** Message timestamps and read receipts must use `label-sm` in `on-surface-variant` to recede visually, leaving only the core message in focus.

---

## 4. Elevation & Depth
In this system, light is an ingredient, not an afterthought.

### The Layering Principle
Depth is achieved by stacking. To highlight a "Snap" preview, place it in a `surface-container-highest` container. The contrast against the `surface` background creates a "lift" without a single drop shadow.

### Ambient Shadows
Where floating interaction is required (e.g., a Send button), use **Ambient Shadows**:
- **Color:** Use a tinted version of `surface-tint` (#9ba8ff) at 8% opacity.
- **Blur:** Minimum `32px`. 
- **Effect:** The button shouldn't look like it's hovering over the screen; it should look like it's glowing onto the surface below it.

### The "Ghost Border"
If a container needs a boundary for accessibility (e.g., an OTP input field), use the **Ghost Border**: `outline-variant` at **15% opacity**. It provides a "whisper" of a container without breaking the fluid layout.

---

## 5. Components & Primitive Styles

### Buttons (The Energy Source)
- **Primary:** Gradient transition from `primary_dim` (#4963ff) to `tertiary_dim` (#c500e6) at a 135° angle. Corner radius: `full`.
- **Secondary:** `surface-container-highest` with a `Ghost Border`.
- **Micro-interaction:** On press, scale the button down to `0.96` to simulate a physical "click" into the glass.

### Input Fields (OTP & Phone)
- **Style:** No bottom line. Use a large `md` (1.5rem) rounded container using `surface-container-low`.
- **Focus State:** The `Ghost Border` increases to 40% opacity, and a subtle `primary` glow appears.

### Cards & Lists (The Stream)
- **Rule:** **Strictly no dividers.**
- **Spacing:** Use `spacing-6` (1.5rem) between chat items. The "separation" is the negative space itself.
- **Visual Cue:** Use a `2px` vertical pill of `primary` on the far left to indicate an unread message, rather than a heavy "unread" badge.

### Signature Component: The "Snap-Overlay"
A full-screen glassmorphic overlay using `surface-variant` (40% opacity) with a `xl` (3rem) corner radius at the top. This is used for viewing temporary media, making the content feel like it's sliding *over* the app rather than opening a new screen.

---

## 6. Do’s and Don’ts

### Do
- **Do** use `xl` (3rem) corner radii for main content containers to maintain the "soft" brand personality.
- **Do** allow typography to bleed near the edges of the screen (using `spacing-4`) to emphasize the mobile-first, edge-to-edge feel.
- **Do** use haptic feedback rhythms that match the "smooth" micro-interactions.

### Don’t
- **Don’t** use pure black (#000000) for backgrounds unless it's a `surface-container-lowest` element. Pure black kills the depth of the "Glass" effects.
- **Don’t** use standard Material icons. Use custom, rounded-cap path icons with a `1.5px` stroke weight to match the `manrope` font weight.
- **Don’t** use "Alert Red" for everything. Use `secondary` (#ff6e85) for errors to keep the palette sophisticated and within the brand's energetic "pink/purple" spectrum.