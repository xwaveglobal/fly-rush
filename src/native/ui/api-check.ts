/**
 * v5: compile-time check that the native canvas UI offers every member Game.ts uses on the DOM UI,
 * with compatible types (the native build swaps src/ui/UI.ts for NativeUI.ts — scripts/build-tiktok.mjs).
 * Type-only: never bundled. Regenerate the list with:
 *   grep -ohE "this\.ui\.[a-zA-Z_]+" src/Game.ts | sort -u
 */
import type { UI as DomUI } from '../../ui/UI.ts';
import type { UI as NativeUI } from './NativeUI.ts';

type Used = 'toast'|'show'|'refreshProfile'|'isShown'|'pop'|'tutPrompt'|'hideOverlay'|'tutorial'|'banner'|'closePopup'|'adButton'|'setLoading'|'garageSync'|'bagSync'|'settingsSync'|'popup'|'updateHud'|'tracksSync'|'toastNow'|'specialPick'|'shopSync'|'rewardToast'|'gateHud'|'flyTo'|'danger'|'boostSync'|'trackHud'|'showOverlay'|'freeCoins'|'flash'|'finish'|'continueTick'|'continueOffer'|'applyLang'|'tutWrong'|'tutDone'|'trainHud'|'showPlayer'|'shopToExchange'|'sharePreview'|'setComfort'|'runRank'|'root'|'rocketWait'|'resetHud'|'ranksSync'|'profileSync'|'perkBadges'|'myClass'|'missionsSync'|'hudTop'|'hudMe'|'hudLevel'|'hudBest'|'homeSync'|'hideEl'|'gameOver'|'eventsSync'|'debug'|'dangerOk'|'dailySync'|'countdown'|'cloudChoice'|'classUp'|'buySync'|'bonusSync'|'bonusHud'|'bigPickup'|'acctLine'|'accountSync';
export const nativeUiMatchesDom = (n: NativeUI): Pick<DomUI, Used> => n;
