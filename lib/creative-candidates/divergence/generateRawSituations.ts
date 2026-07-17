import { hashString, pickFrom } from "@/lib/creative-identity/hash";
import type { TopicConcreteSignals } from "@/lib/creative-candidates/generateCandidates";
import { rejectRawSituation } from "@/lib/creative-candidates/divergence/rawSituationFilter";
import {
  scoreStopScroll,
  scoreVisualDistinct,
} from "@/lib/creative-candidates/divergence/scoreRawSituation";
import type { RawVisualSituation } from "@/lib/creative-candidates/divergence/types";

type SceneTemplate = (ctx: {
  signals: TopicConcreteSignals;
  variant: number;
}) => { scene: string; scrollStopCue: string; tags: string[] };

const SCENE_TEMPLATES: SceneTemplate[] = [
  ({ signals, variant }) => ({
    scene: `Two ${signals.industryCue} workers mid-argument at a service counter during ${signals.stressCue}; phones stack; a customer silhouette turns away through the glass door.`,
    scrollStopCue: "Public fight while demand walks out",
    tags: ["conflict", "counter", "heat", signals.industryCue],
  }),
  ({ signals }) => ({
    scene: `A ridiculous boarding-ticket dispenser for phone callers in a ${signals.industryCue} lobby during ${signals.stressCue}; numbered paper slips; an open chat widget on a counter tablet glows with zero replies.`,
    scrollStopCue: "Airport logic applied to the wrong queue",
    tags: ["absurd", "queue", "lobby"],
  }),
  ({ signals }) => ({
    scene: `Outside a ${signals.industryCue} van in blazing heat, a growing stack of unmarked job folders towers beside the door while a technician sprints to another truck.`,
    scrollStopCue: "Lost work as a physical mountain",
    tags: ["exaggeration", "van", "heat", "pile"],
  }),
  ({ signals }) => ({
    scene: `Split-second: a rival service van already in the customer's driveway; clipboard signed; your ${signals.industryCue} phone lights unanswered on a bench; website chat idle.`,
    scrollStopCue: "Competitor wins before you pick up",
    tags: ["consequence", "competitor", "driveway"],
  }),
  ({ signals }) => ({
    scene: `Empty front desk at a ${signals.industryCue} during ${signals.stressCue}; phones blink alone; a wall-mounted tablet chat calmly auto-replies while the building is half-abandoned.`,
    scrollStopCue: "Nobody home except the chat",
    tags: ["role_reversal", "empty", "chat"],
  }),
  ({ signals }) => ({
    scene: `Residential street in heat: multiple ${signals.industryCue} vans parked; neighbors point at phones; one homeowner closes a laptop after no reply on the business site.`,
    scrollStopCue: "Famous for vans, infamous for silence online",
    tags: ["social", "street", "neighbor"],
  }),
  ({ signals }) => ({
    scene: `A home in heat: windows wide open, AC blasting uselessly — cut to a ${signals.industryCue} website chat open with nobody typing while demand spikes outside.`,
    scrollStopCue: "Wasted cool air = wasted web traffic",
    tags: ["comparison", "AC", "heat"],
  }),
  ({ signals }) => ({
    scene: `Close on a customer's sweaty hands sending an urgent ${signals.industryCue} question; the business reply thread shows "seen" with no answer; crew visible through window on trucks.`,
    scrollStopCue: "Urgent question dies in silence",
    tags: ["hands", "urgent", "customer"],
  }),
  ({ signals, variant }) => ({
    scene: `Mid-${signals.stressCue}: a line of people with clipboards wraps around a ${signals.industryCue} storefront; inside, a single employee waves off the website tablet.`,
    scrollStopCue: "Real queue outside, ghost queue online",
    tags: ["queue", "storefront", variant > 0 ? "wrap" : "line"],
  }),
  ({ signals }) => ({
    scene: `Ice cubes melting on a ${signals.industryCue} truck hood in sun; timer implied; inside the cab, missed-call counter ticks up on a dash mount.`,
    scrollStopCue: "Heat eating time and calls",
    tags: ["heat", "truck", "melt"],
  }),
  ({ signals }) => ({
    scene: `A customer tries three doors of a ${signals.industryCue} building — all locked for field crews — then sits on the curb typing into the business website.`,
    scrollStopCue: "Physical doors closed, digital door open",
    tags: ["doors", "curb", "customer"],
  }),
  ({ signals }) => ({
    scene: `Warehouse shelf of spare parts labeled "emergency"; empty slot flashing; parallel shot of website FAQ unanswered during ${signals.stressCue}.`,
    scrollStopCue: "Stockout metaphor for answers",
    tags: ["warehouse", "emergency", "parallel"],
  }),
  ({ signals }) => ({
    scene: `Kids selling lemonade next to a ${signals.industryCue} van; parent jokes "they answer faster than your website"; technician laughs then freezes.`,
    scrollStopCue: "Lemonade stand beats your chat",
    tags: ["humor", "street", "comparison"],
  }),
  ({ signals }) => ({
    scene: `Radio dispatch voiceover chaos; dispatcher puts caller on hold; website visitor bubble pops "still here?" with no agent.`,
    scrollStopCue: "Hold music for humans, nothing for web",
    tags: ["dispatch", "hold", "bubble"],
  }),
  ({ signals }) => ({
    scene: `Thermometer on a shop window cracks past red; inside, staff high-five for "busy day"; outside, visitor refreshes contact page endlessly.`,
    scrollStopCue: "Celebrating chaos while web waits",
    tags: ["thermometer", "irony", "refresh"],
  }),
  ({ signals }) => ({
    scene: `Dog barking at a ${signals.industryCue} truck leaving; owner on porch scrolls competitor site and books instantly.`,
    scrollStopCue: "Pet notices you left; customer books rival",
    tags: ["dog", "porch", "competitor"],
  }),
  ({ signals }) => ({
    scene: `Night shot: ${signals.industryCue} yard empty; security light on; laptop left on counter shows 14 unanswered chats glowing.`,
    scrollStopCue: "After hours, chats still screaming",
    tags: ["night", "security", "chats"],
  }),
  ({ signals }) => ({
    scene: `Inflatable tube-man waving outside ${signals.industryCue} shop; real customers walk past it into rival parking lot.`,
    scrollStopCue: "Marketing waves, demand walks away",
    tags: ["tube-man", "parking", "rival"],
  }),
  ({ signals }) => ({
    scene: `Technician on roof in heat; phone vibrates in tool belt unanswered; ground-level tablet shows visitor asking "anyone on site?"`,
    scrollStopCue: "Hero on roof, question on ground",
    tags: ["roof", "technician", "split"],
  }),
  ({ signals }) => ({
    scene: `Waiting room fish tank; one fish labeled "website leads"; bowl nearly empty while phone fish overcrowded.`,
    scrollStopCue: "Absurd aquarium staffing metaphor",
    tags: ["fish", "waiting", "absurd"],
  }),
  ({ signals }) => ({
    scene: `Graffiti-style chalk on sidewalk: "CALL US" with arrow to ${signals.industryCue}; chalk washed away by sprinkler; QR code to site smudged unreadable.`,
    scrollStopCue: "Analog urgency, digital smear",
    tags: ["chalk", "sidewalk", "QR"],
  }),
  ({ signals }) => ({
    scene: `Power flicker during ${signals.stressCue}; phones reboot; website chat keeps replying on UPS battery glow.`,
    scrollStopCue: "Lights out, chat still on",
    tags: ["power", "UPS", "chat"],
  }),
  ({ signals }) => ({
    scene: `Customer holds broken thermostat in one hand, phone in other; competitor van honks; website tab still on "message sent".`,
    scrollStopCue: "Two hands, zero answers",
    tags: ["thermostat", "honk", "tab"],
  }),
  ({ signals }) => ({
    scene: `Train-station style departure board listing "Phone caller #47" boarding; column "Website visitor" stuck on "Delayed indefinitely".`,
    scrollStopCue: "Departure board for the wrong channel",
    tags: ["departure", "board", "delay"],
  }),
  ({ signals }) => ({
    scene: `Flash flood of sticky notes on a ${signals.industryCue} door: "call back"; camera pulls back to reveal zero notes for web chats on a kiosk.`,
    scrollStopCue: "Paper memory for phones only",
    tags: ["sticky", "door", "kiosk"],
  }),
  ({ signals }) => ({
    scene: `Mascot costume melting in parking lot heat; employee waves at traffic; inside, chat widget shows typing indicator with no message sent.`,
    scrollStopCue: "Mascot suffers, fake typing online",
    tags: ["mascot", "parking", "fake"],
  }),
  ({ signals }) => ({
    scene: `Time-lapse: sun arc over ${signals.industryCue} yard; shadow of unanswered chat window grows across empty dispatch desk.`,
    scrollStopCue: "Shadow of silence all day",
    tags: ["timelapse", "shadow", "dispatch"],
  }),
  ({ signals }) => ({
    scene: `Customer knocks on rolling bay door; no answer; peers through crack at idle tablets; types on phone into competitor booking link.`,
    scrollStopCue: "Bay door shut, booking elsewhere",
    tags: ["bay", "crack", "booking"],
  }),
  ({ signals }) => ({
    scene: `Two clocks side by side: wall clock for shop hours; digital timer for "avg website reply" spinning into hours.`,
    scrollStopCue: "Dual clocks, one shameful",
    tags: ["clocks", "timer", "shame"],
  }),
  ({ signals }) => ({
    scene: `Volunteer fire siren in small town; everyone looks; cut to silent website notification badge maxed out with no staff.`,
    scrollStopCue: "Town hears siren, web hears nothing",
    tags: ["siren", "town", "badge"],
  }),
  ({ signals }) => ({
    scene: `Paper fan handed to queue outside ${signals.industryCue}; person fans themselves while refreshing dead chat on phone.`,
    scrollStopCue: "Heat relief outside, none online",
    tags: ["fan", "queue", "refresh"],
  }),
  ({ signals }) => ({
    scene: `Lost cat poster on pole next to ${signals.industryCue} flyer; someone calls number on cat poster immediately; website number on flyer faded.`,
    scrollStopCue: "Lost cat gets faster response",
    tags: ["poster", "pole", "irony"],
  }),
  ({ signals }) => ({
    scene: `Drone shot: ${signals.industryCue} trucks radiating from hub; single pixel ping on map for abandoned web session far from routes.`,
    scrollStopCue: "Fleet spreads, one dot ignored",
    tags: ["drone", "map", "session"],
  }),
  ({ signals }) => ({
    scene: `Break room pizza celebration for "record calls"; wall TV shows website bounce rate climbing in red.`,
    scrollStopCue: "Pizza for phones, red alert for web",
    tags: ["pizza", "bounce", "TV"],
  }),
  ({ signals }) => ({
    scene: `Customer tries voice-to-text question in car AC; sends; steering wheel grip tightens as "delivered" sits with no reply.`,
    scrollStopCue: "Cool car, hot silence",
    tags: ["car", "voice", "delivered"],
  }),
  ({ signals }) => ({
    scene: `Janitor mops around ringing desk phone; steps over tablet showing visitor "hello?" for minutes.`,
    scrollStopCue: "Mop rings, chat drowns",
    tags: ["janitor", "mop", "hello"],
  }),
  ({ signals }) => ({
    scene: `Solar panels on ${signals.industryCue} roof; inverter hum; inside, power strip of dead chargers and one live chat cable unplugged.`,
    scrollStopCue: "Green power, unplugged answers",
    tags: ["solar", "unplugged", "irony"],
  }),
  ({ signals }) => ({
    scene: `Parade float of giant phone passes shop; crowd cheers; shop window reflection shows empty chat overlay on glass.`,
    scrollStopCue: "Parade celebrates phone, glass shows ghost chat",
    tags: ["parade", "float", "reflection"],
  }),
  ({ signals }) => ({
    scene: `Hail bounces off ${signals.industryCue} sign; technician under awning answers hail damage call; website "emergency" form untouched in split screen.`,
    scrollStopCue: "Weather chaos, form untouched",
    tags: ["hail", "awning", "form"],
  }),
  ({ signals }) => ({
    scene: `Kid's science fair volcano erupts foam; parent texts ${signals.industryCue} for cleanup; message sits next to kid's blue ribbon.`,
    scrollStopCue: "Volcano wins ribbon before you reply",
    tags: ["science", "volcano", "ribbon"],
  }),
  ({ signals }) => ({
    scene: `Parking meter expires on customer car outside ${signals.industryCue}; they leave ticket on windshield and drive to rival lot.`,
    scrollStopCue: "Meter runs out, loyalty too",
    tags: ["meter", "windshield", "rival"],
  }),
  ({ signals }) => ({
    scene: `Beehive buzzing near ${signals.industryCue} sign; customers swerve away; online chat asks about "stinging smell from unit" — no answer.`,
    scrollStopCue: "Bees scare foot traffic, web scared too",
    tags: ["bee", "swerve", "smell"],
  }),
  ({ signals }) => ({
    scene: `Flashlight tour of dark ${signals.industryCue} showroom after hours; beam lands on glowing chat requests like eyes in dark.`,
    scrollStopCue: "Haunted by glowing requests",
    tags: ["flashlight", "showroom", "haunted"],
  }),
  ({ signals }) => ({
    scene: `Tire tracks in mud leading to ${signals.industryCue}; parallel browser history shows competitor thank-you page on same phone.`,
    scrollStopCue: "Mud proves visit; history proves loss",
    tags: ["mud", "tracks", "history"],
  }),
  ({ signals }) => ({
    scene: `Barber pole spins next door; barber chats with waiting client; ${signals.industryCue} queue stares at dead website kiosk.`,
    scrollStopCue: "Neighbor talks; your kiosk doesn't",
    tags: ["barber", "kiosk", "neighbor"],
  }),
  ({ signals }) => ({
    scene: `Construction jackhammer drowns shop phone; worker points at vibrating phone ignored; tablet chat vibration buried in noise.`,
    scrollStopCue: "Noise wins over every vibration",
    tags: ["jackhammer", "noise", "vibration"],
  }),
  ({ signals }) => ({
    scene: `Gift basket "thanks for choosing us" delivered to wrong address; right address customer still on hold on website chat.`,
    scrollStopCue: "Thanks to wrong house, real customer waiting",
    tags: ["gift", "wrong", "hold"],
  }),
  ({ signals }) => ({
    scene: `Moonlight on ${signals.industryCue} fleet; owl on roof; laptop in cab still showing daytime unanswered queue count.`,
    scrollStopCue: "Night owl sees stale queue",
    tags: ["moon", "owl", "fleet"],
  }),
  ({ signals }) => ({
    scene: `Sprinkler soaks promotional yard sign; QR smears; passerby types URL from memory wrong and lands on competitor.`,
    scrollStopCue: "Sprinkler kills QR, typo kills lead",
    tags: ["sprinkler", "QR", "typo"],
  }),
];

function normalizeSceneKey(scene: string): string {
  return scene
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .slice(0, 120);
}

function expandWithVariants(
  base: { scene: string; scrollStopCue: string; tags: string[] },
  signals: TopicConcreteSignals,
  seed: string,
  count: number,
): Array<{ scene: string; scrollStopCue: string; tags: string[] }> {
  const out: Array<{ scene: string; scrollStopCue: string; tags: string[] }> = [base];
  const tweaks = [
    (s: string) => s.replace(/Split-second/g, "Wide shot then snap zoom"),
    (s: string) => s.replace(/Close on/g, "Macro on"),
    (s: string) => `${s} Camera holds one beat too long for discomfort.`,
    (s: string) => s.replace(/cut to/gi, "smash cut to"),
    (s: string) => `Handheld urgency: ${s}`,
  ];
  for (let i = 0; i < count && out.length < 50; i++) {
    const tweak = pickFrom(tweaks, `${seed}-tweak-${i}`);
    const scene = tweak(base.scene);
    if (normalizeSceneKey(scene) !== normalizeSceneKey(base.scene)) {
      out.push({
        scene,
        scrollStopCue: base.scrollStopCue,
        tags: [...base.tags, `v${i}`],
      });
    }
  }
  return out;
}

export function generateRawVisualSituations(input: {
  topic: string;
  angle?: string | null;
  signals: TopicConcreteSignals;
  targetCount?: number;
}): RawVisualSituation[] {
  const seed = `${input.topic}|${input.angle ?? ""}`;
  const target = input.targetCount ?? 45;
  const seen = new Set<string>();
  const raw: RawVisualSituation[] = [];

  const templateOrder = [...SCENE_TEMPLATES];
  for (let pass = 0; raw.length < target && pass < 3; pass++) {
    for (let ti = 0; ti < templateOrder.length && raw.length < target; ti++) {
      const tpl = templateOrder[(ti + pass * 7) % templateOrder.length]!;
      const variant = hashString(`${seed}-${ti}-${pass}`) % 5;
      const built = tpl({ signals: input.signals, variant });
      const expanded = expandWithVariants(
        built,
        input.signals,
        `${seed}-${ti}`,
        pass === 0 ? 0 : 2,
      );
      for (const item of expanded) {
        const key = normalizeSceneKey(item.scene);
        if (seen.has(key)) continue;
        seen.add(key);

        const reject = rejectRawSituation(item.scene);
        const stopScrollScore = scoreStopScroll(item.scene, item.scrollStopCue);
        const visualDistinctScore = scoreVisualDistinct(item.scene, item.tags);

        raw.push({
          id: `raw-${raw.length + 1}-${hashString(key) % 10000}`,
          scene: item.scene,
          scrollStopCue: item.scrollStopCue,
          tags: item.tags.map((t) => String(t)),
          stopScrollScore,
          visualDistinctScore,
          rejected: reject !== null,
          rejectReason: reject,
          clusterId: null,
        });
      }
    }
  }

  return raw;
}
