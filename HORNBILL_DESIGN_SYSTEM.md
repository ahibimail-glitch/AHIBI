# Hornbill Festival 2025 - Premium Design System

## Overview
Updated the Hornbill Festival 2025 project with a premium design system featuring vibrant red and electric purple colors, inspired by BookMyShow and Zomato District styling.

## Color Palette

### Light Theme
- **Primary (Vibrant Red)**: `hsl(0 85% 58%)` - #F24E4E
- **Secondary (Electric Purple)**: `hsl(280 70% 55%)` - #B84EF2
- **Accent (Cyan)**: `hsl(175 70% 45%)` - #26B8B8
- **Background**: `hsl(0 0% 99%)` - Near white
- **Foreground**: `hsl(240 10% 10%)` - Dark text
- **Muted**: `hsl(0 0% 96%)` - Light gray
- **Border**: `hsl(0 0% 90%)` - Border gray

### Dark Theme
- **Primary**: Same vibrant red
- **Secondary**: Same electric purple
- **Background**: `hsl(240 10% 8%)` - Dark background
- **Card**: `hsl(240 8% 12%)` - Slightly lighter cards

## Gradients

### Hero Gradient
```css
background: linear-gradient(135deg, hsl(0 85% 58%) 0%, hsl(280 70% 55%) 100%);
```
**Usage**: Primary buttons, hero sections, highlights

### Card Gradient
```css
/* Light */
background: linear-gradient(145deg, hsl(0 0% 100%) 0%, hsl(0 0% 98%) 100%);

/* Dark */
background: linear-gradient(145deg, hsl(240 8% 14%) 0%, hsl(240 8% 10%) 100%);
```
**Usage**: Card backgrounds, containers

### Premium Gradient
```css
background: linear-gradient(135deg, hsl(0 85% 58% / 0.08) 0%, hsl(280 70% 55% / 0.08) 100%);
```
**Usage**: Subtle backgrounds, hover states

### Shimmer Gradient
```css
/* Light */
background: linear-gradient(90deg, transparent, rgba(0, 0, 0, 0.03), transparent);

/* Dark */
background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.05), transparent);
```
**Usage**: Premium shine animation

## Shadows

### Card Shadow
```css
box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04);
```
**Usage**: Default card elevation

### Hover Shadow
```css
box-shadow: 0 12px 40px hsl(0 85% 58% / 0.2), 0 6px 20px rgba(0, 0, 0, 0.1);
```
**Usage**: Card hover states with red glow

### Premium Shadow
```css
box-shadow: 0 20px 60px hsl(280 70% 55% / 0.25), 0 12px 30px rgba(0, 0, 0, 0.08);
```
**Usage**: Featured elements with purple glow

### Glow Shadow
```css
box-shadow: 0 0 30px hsl(0 85% 58% / 0.3);
```
**Usage**: Active/selected states, glowing effects

## Utility Classes

### Gradients
- `.gradient-hero` - Red to purple gradient
- `.gradient-card` - Subtle card gradient
- `.gradient-premium` - Ultra-subtle premium gradient

### Shadows
- `.shadow-card` - Default card shadow
- `.shadow-hover` - Hover state with glow
- `.shadow-premium` - Premium purple glow
- `.shadow-glow` - Red glow effect

### Effects
- `.glass-effect` - Glassmorphism with backdrop blur
- `.premium-shine` - Animated shimmer effect
- `.animate-float` - Floating animation

### Transitions
- `.transition-smooth` - Smooth cubic-bezier transition
- `.transition-bounce` - Bouncy cubic-bezier transition

## Usage Examples

### Primary Button
```tsx
<button className="gradient-hero text-white shadow-glow hover:shadow-premium transition-smooth rounded-xl px-8 py-4">
  Book Now
</button>
```

### Premium Card
```tsx
<div className="gradient-card shadow-card hover:shadow-hover transition-smooth rounded-2xl p-6 premium-shine">
  <h3>Festival Pass</h3>
  <p>10-day unlimited access</p>
</div>
```

### Glass Navbar
```tsx
<nav className="glass-effect fixed top-0 w-full z-50">
  <div className="container mx-auto">
    {/* Navigation content */}
  </div>
</nav>
```

### Floating Element
```tsx
<div className="animate-float gradient-hero rounded-2xl p-8 shadow-glow">
  <span className="text-4xl font-black text-white">10</span>
</div>
```

## Animations

### Float Animation
```css
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}
```
**Duration**: 3s infinite ease-in-out

### Shine Animation
```css
@keyframes shine {
  to { left: 100%; }
}
```
**Duration**: 3s infinite
**Usage**: Premium shimmer effect on cards

## Transitions

### Smooth Transition
```css
transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
```
**Usage**: Default smooth transitions

### Bounce Transition
```css
transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
```
**Usage**: Playful bounce effects on hover

## Component Styling Guide

### Hero Section
- Background: Hero image with gradient overlay
- Title: Large white text with gradient text effect
- Buttons: `.gradient-hero` with `.shadow-glow`

### Ticket Cards
- Background: `.gradient-card`
- Shadow: `.shadow-card` default, `.shadow-hover` on hover
- Icon container: `.gradient-hero` for highlighted cards
- Border: Subtle border with `.border-border/30`

### Navbar
- Background: `.glass-effect`
- Active links: `.gradient-hero` with white text
- Logo: `.gradient-hero` rounded container with icon

### Footer
- Background: `.gradient-card`
- Border top: `.border-border/30`
- Social icons: Hover state with `.gradient-hero`

### Booking Form
- Cards: `.gradient-card` with `.shadow-card`
- Inputs: Light background with `.border-border/50`
- Submit button: `.gradient-hero` with `.shadow-glow`
- Progress indicators: `.gradient-hero` for active steps

## CSS Variables Reference

All colors and effects are defined as CSS variables in `globals.css`:

```css
:root {
  --primary: 0 85% 58%;
  --secondary: 280 70% 55%;
  --accent: 175 70% 45%;
  --gradient-hero: linear-gradient(135deg, hsl(0 85% 58%) 0%, hsl(280 70% 55%) 100%);
  --shadow-glow: 0 0 30px hsl(0 85% 58% / 0.3);
  --transition-smooth: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  /* ... and more */
}
```

## Browser Support

- **Backdrop Filter**: Modern browsers (Safari, Chrome, Firefox, Edge)
- **CSS Variables**: All modern browsers
- **Gradients**: Universal support
- **Animations**: Universal support

## Accessibility

- **Color Contrast**: All text colors meet WCAG AA standards
- **Focus States**: Ring color uses primary red
- **Reduced Motion**: Animations respect `prefers-reduced-motion`
- **Dark Mode**: Full dark mode support with adjusted colors

## Notes

- All colors use HSL format for easy manipulation
- Shadows include colored glows for premium feel
- Gradients use transparency for layering
- CSS variables allow easy theme customization
- Design system matches BookMyShow/Zomato District aesthetic

## IDE Warnings (Safe to Ignore)

The following CSS warnings are expected and do not affect functionality:
- `@tailwind` directives - Tailwind CSS syntax
- `@apply` directives - Tailwind CSS syntax
- These are processed by Tailwind during build
