/**
 * Semantic fingerprints for near-duplicate removal.
 * Same idea with different props must share a cluster.
 */

import {
  jaccardSimilarity,
  tokenSet,
} from "@/lib/creative-candidates/divergence/scoreRawSituation";

const SUBJECT_CLASSES: Array<{ key: string; re: RegExp }> = [
  { key: "mascot", re: /\bmascot\b/i },
  { key: "queue", re: /\bqueue|line of people|boarding|ticket dispenser\b/i },
  { key: "pile", re: /\bpile|tower|stack of|mountain of\b/i },
  { key: "competitor", re: /\bcompetitor|rival\b/i },
  { key: "empty_desk", re: /\bempty (front )?desk|half-abandoned|nobody home\b/i },
  { key: "suitcase", re: /\bsuitcase|luggage|passport|vacation bag\b/i },
  { key: "inbox", re: /\binbox|unanswered chat|reply thread|contact form\b/i },
  { key: "van", re: /\bvan\b|\btruck\b/i },
  { key: "technician", re: /\btechnician\b/i },
  { key: "fish", re: /\bfish tank|aquarium\b/i },
  { key: "clocks", re: /\bclocks?\b|timer\b/i },
  { key: "hands", re: /\bhands\b|typing\b/i },
  { key: "neighbor", re: /\bneighbor|street|porch\b/i },
  { key: "ac_waste", re: /\bwindows? (wide )?open|ac blasting\b/i },
  { key: "argument", re: /\bmid-argument|argue|fight\b/i },
  { key: "calendar", re: /\bcalendar|pto|out of office\b/i },
];

const SETTING_CLASSES: Array<{ key: string; re: RegExp }> = [
  { key: "parking", re: /\bparking lot|parking\b/i },
  { key: "lobby", re: /\blobby|storefront|counter\b/i },
  { key: "cowork", re: /\bco-?working|open office|modern office\b/i },
  { key: "home_office", re: /\bhome office|practice desk|suitcase.*desk|desk.*suitcase\b/i },
  { key: "driveway", re: /\bdriveway\b/i },
  { key: "street", re: /\bstreet|porch|sidewalk\b/i },
  { key: "yard", re: /\byard|van\b|truck\b/i },
  { key: "night", re: /\bnight|moonlight|after hours\b/i },
  { key: "waiting", re: /\bwaiting room\b/i },
];

const ACTION_CLASSES: Array<{ key: string; re: RegExp }> = [
  { key: "unanswered", re: /\bunanswered|no reply|zero replies|silent|idle chat\b/i },
  { key: "leaving", re: /\bturns? away|walks? away|left|leaving\b/i },
  { key: "competing", re: /\bbooks? (instantly|elsewhere)|rival|competitor\b/i },
  { key: "returning", re: /\breturn|came back|opens suitcase|unpack\b/i },
  { key: "melting", re: /\bmelt|sweat|heat\b/i },
  { key: "refreshing", re: /\brefresh|dead chat\b/i },
  { key: "fake_typing", re: /\btyping indicator|fake typing\b/i },
];

export interface SituationFingerprint {
  subject: string;
  setting: string;
  action: string;
  cueStem: string;
  key: string;
}

function firstMatch(
  classes: Array<{ key: string; re: RegExp }>,
  text: string,
  fallback: string,
): string {
  for (const c of classes) {
    if (c.re.test(text)) return c.key;
  }
  return fallback;
}

export function situationFingerprint(
  scene: string,
  scrollStopCue: string,
): SituationFingerprint {
  const blob = `${scene} ${scrollStopCue}`;
  const subject = firstMatch(SUBJECT_CLASSES, blob, "other");
  const setting = firstMatch(SETTING_CLASSES, blob, "generic");
  const action = firstMatch(ACTION_CLASSES, blob, "other");
  const cueStem = scrollStopCue
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 4)
    .join("_");
  const key = `${subject}|${setting}|${action}|${cueStem}`;
  return { subject, setting, action, cueStem, key };
}

/** True when two situations are the same idea with different props / camera tweaks. */
export function areNearDuplicateSituations(
  a: { scene: string; scrollStopCue: string; tags?: string[] },
  b: { scene: string; scrollStopCue: string; tags?: string[] },
): boolean {
  if (a.scrollStopCue.trim().toLowerCase() === b.scrollStopCue.trim().toLowerCase()) {
    return true;
  }
  const fa = situationFingerprint(a.scene, a.scrollStopCue);
  const fb = situationFingerprint(b.scene, b.scrollStopCue);
  if (fa.key === fb.key) return true;
  if (fa.subject === fb.subject && fa.action === fb.action && fa.subject !== "other") {
    return true;
  }
  if (fa.cueStem && fa.cueStem === fb.cueStem) return true;

  const ta = tokenSet(
    `${fa.subject} ${fa.setting} ${fa.action} ${a.scrollStopCue} ${(a.tags ?? []).join(" ")}`,
  );
  const tb = tokenSet(
    `${fb.subject} ${fb.setting} ${fb.action} ${b.scrollStopCue} ${(b.tags ?? []).join(" ")}`,
  );
  if (jaccardSimilarity(ta, tb) >= 0.45) return true;

  // Camera-tweak variants share most of the scene body
  const bodyA = tokenSet(a.scene);
  const bodyB = tokenSet(b.scene);
  if (jaccardSimilarity(bodyA, bodyB) >= 0.62) return true;

  return false;
}
