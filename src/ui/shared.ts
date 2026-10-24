/**
 * Constants shared by the DOM UI (src/ui/UI.ts) and the native canvas UI (src/native/ui/*) — kept apart
 * so the native build does not pull in the DOM UI and its art (smaller TikTok package).
 */
import logoUrl from '../assets/images/sky-roadster-logo.webp';
import carZenith from '../assets/images/cars/zenith.webp';
import carVolt from '../assets/images/cars/volt.webp';
import carPhantom from '../assets/images/cars/phantom.webp';
import carInferno from '../assets/images/cars/inferno.webp';
import carNexus from '../assets/images/cars/nexus.webp';
import carVega from '../assets/images/cars/vega.webp';
import carShadowImg from '../assets/images/cars/shadow.webp';
import rearZenith from '../assets/images/cars/rear-zenith.webp';
import rearVega from '../assets/images/cars/rear-vega.webp';
import rearVolt from '../assets/images/cars/rear-volt.webp';
import rearPhantom from '../assets/images/cars/rear-phantom.webp';
import rearInferno from '../assets/images/cars/rear-inferno.webp';
import rearNexus from '../assets/images/cars/rear-nexus.webp';

// v4.5.1 (owner): every car picture in the panels is a render of the in-game 3D X1 in that car's colourway
// (scripts/car/thumbs-x1.mjs + thumbs-pack.py)
export const CAR_IMG: Record<string, string> = { zenith: carZenith, vega: carVega, volt: carVolt, phantom: carPhantom, inferno: carInferno, nexus: carNexus };
const CAR_REAR: Record<string, string> = { zenith: rearZenith, vega: rearVega, volt: rearVolt, phantom: rearPhantom, inferno: rearInferno, nexus: rearNexus };
export const carImage = (id: string) => CAR_IMG[id] ?? carZenith;
/** transparent in-race rear render (share card / result screen) */
export const carRear = (id: string) => CAR_REAR[id] ?? rearZenith;
export const logoImg = logoUrl;
/** v5: a car not owned yet — the 3D render as a black silhouette (the DOM UI blacks out the render with CSS) */
export const carShadow = carShadowImg;

export type UpgradeKey = 'engine' | 'shield' | 'magnet';
export const UPGRADE_MAX = 5;
export const upgradeCost = (lvl: number) => Math.round(150 * Math.pow(lvl + 1, 1.6) / 10) * 10;

/** Show a small "demo rivals" note under sample leaderboards (set false once boards are online). */
export const SAMPLE_BOARD_NOTE = true;

export const MEGA_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="2.5" width="11" height="19" rx="2.6" fill="none" stroke="#fff" stroke-width="1.8"/><path d="M12 6.2c1.7 1.2 2.4 3 2.2 5.4l-.9.9h-2.6l-.9-.9c-.2-2.4.5-4.2 2.2-5.4z" fill="#fff"/><circle cx="12" cy="9.3" r=".9" fill="#2a7bff"/><path d="M10.6 13.2 12 16.4l1.4-3.2z" fill="#ffc21a"/><path d="M10.4 18.6h3.2" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></svg>`;
