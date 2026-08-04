import type { IndustryExampleData } from "@/lib/industry-examples/types";
import { industryExampleVideoUrl } from "@/lib/industry-examples/video-url";

/**
 * HVAC sales examples — scrubbed for public outbound use.
 *
 * Source run: 7787ad63-2a83-417f-bd9c-9e0fcad3b598 (packages de055aab / 74dfc2b5 / 418b6bed).
 * Copy is manually cleaned: no real company identifiers, no duplicate hashtags,
 * no “watch the video” language on text-only platforms.
 *
 * Videos: final scene-editor re-renders only (not the original rejected jobs).
 * Served via `/api/public/example-video` from the `video-renders` bucket.
 */
const HVAC_PROJECT_ID = "b183f7ce-1548-4dc8-b2be-9089d51c30ca";

/** Final scene-editor jobs — do not substitute the original production renders. */
const HVAC_FINAL_VIDEO_JOBS = {
  coldFront: "32e024e6-b082-435d-a897-ef0cb25f8d5e",
  warningSignals: "59368f8b-c6d2-45ee-94d4-fc02e163f8be",
  almostSaidYes: "b2e2493a-cdef-448a-bec7-449dec2fad16",
} as const;

export const hvacExample: IndustryExampleData = {
  slug: "hvac",
  industryName: "HVAC",
  eyebrow: "HVAC Content Examples",
  headline: "See what we can create for an HVAC business.",
  description:
    "Explore complete, ready-to-publish Content Packages created to show what Fenrik Studio can deliver for HVAC companies.",
  disclaimer:
    "Example content created to demonstrate Fenrik Studio’s HVAC content production.",
  heroSupportLines: [
    "3 example Content Packages",
    "Video + ready-to-publish social content",
  ],
  metadata: {
    title: "HVAC Content Examples",
    description:
      "See ready-to-publish HVAC content examples from Fenrik Studio, including short-form video and social content for major platforms.",
  },
  packages: [
    {
      id: "cold-front",
      title: "Two Homeowners, One Cold Front",
      selectorLabel: "Cold Front",
      topic:
        "What happens when furnace maintenance is ignored before the first North Texas cold front.",
      projectId: HVAC_PROJECT_ID,
      videoJobId: HVAC_FINAL_VIDEO_JOBS.coldFront,
      videoUrl: industryExampleVideoUrl(HVAC_FINAL_VIDEO_JOBS.coldFront),
      videoPosterUrl: null,
      platforms: {
        instagram: [
          "The furnace was quiet all summer.",
          "",
          "So was the one that didn't turn on last October.",
          "",
          "Silence isn't a health report — it's just an absence of complaints. Two homeowners, one cold front, very different mornings.",
          "",
          "Save this one for September. 🍂",
          "",
          "#FortWorthHome #HVACMaintenance #TexasWinter #HomeComfort #FurnaceTips #DFWHomeowners",
        ].join("\n"),
        tiktok: [
          "Your furnace was silent all summer. That's not a good sign — that's just silence. 🥶 Save this before October.",
          "",
          "#HVACTips #FurnaceFail #NorthTexasWinter #HomeOwnerLife",
        ].join("\n"),
        youtube: {
          title: "Two Homeowners, One Cold Front",
          description: [
            "Two DFW homes. Same cold front. One furnace fired up — one didn't. The difference was made in September, not October.",
            "",
            "Subscribe for more honest HVAC advice built for North Texas.",
            "",
            "#HVACTips #DFWHomes #FurnaceMaintenance",
          ].join("\n"),
        },
        facebook: [
          "With North Texas cold fronts arriving faster than you'd expect, here's something worth thinking about: a furnace that was silent all summer didn't necessarily pass a health check — it just had nothing to say yet. 🍂",
          "",
          "Two homeowners faced the same first cold night with very different results. The only difference was a September service visit.",
          "",
          "Save this as a reminder — and if you haven't had your furnace looked at since last winter, now is the time.",
          "",
          "#FortWorth #DFWHomeowners",
        ].join("\n"),
        linkedin: [
          "Two homeowners. Same North Texas cold front. Same age furnace.",
          "",
          "One had a pre-season check-up in September — a technician found a clogged filter and a failing gasket, both fixed in a single visit. The other skipped it because the system had been quiet all summer.",
          "",
          "Silence is not a diagnostic. The first cold night made that distinction visible.",
          "",
          "For homeowners and property managers heading into fall, the trade-off is not cheap versus expensive — it is predictable versus surprise.",
          "",
          "#HVAC #FacilitiesManagement #PreventiveMaintenance",
        ].join("\n"),
        x: [
          "Your furnace was quiet all summer. So was the one that wouldn't start on the first cold night. Silence isn't a health report. #HVAC #DFW",
          "Two DFW homeowners. Same cold front. One woke up warm. One woke up at 58 degrees. The difference was made in September. #FurnaceMaintenance",
          "Skipping the fall furnace check feels free until it isn't. The first cold night has a way of making that math very clear. #NorthTexasWinter #HVAC",
        ],
      },
    },
    {
      id: "hvac-language",
      title: "Your HVAC Is Talking. Most People Just Don't Know the Language.",
      selectorLabel: "Warning Signals",
      topic: "Common HVAC warning signals homeowners often ignore — noises and smells.",
      projectId: HVAC_PROJECT_ID,
      videoJobId: HVAC_FINAL_VIDEO_JOBS.warningSignals,
      videoUrl: industryExampleVideoUrl(HVAC_FINAL_VIDEO_JOBS.warningSignals),
      videoPosterUrl: null,
      platforms: {
        instagram: [
          "That strange noise. That musty smell. That faint burning odor.",
          "",
          "None of it is random — your system is communicating, and most homeowners were never taught to read it.",
          "",
          "Save this one. You'll want it the next time something sounds off.",
          "",
          "#HVACTips #HomeComfort #FortWorthHomes #ACRepair #IndoorAir #HVACLife #TexasHomes #HomeMaintenanceTips",
        ].join("\n"),
        tiktok: [
          "That bang when your AC kicks on isn't a quirk. Your system is trying to tell you something. 👇",
          "",
          "#HVACTips #HomeOwnerLife #ACRepair #FortWorthHome #HVACCheck",
        ].join("\n"),
        youtube: {
          title: "Your HVAC Is Talking. Most People Just Don't Know the Language.",
          description: [
            "That bang, that musty smell, that burning odor — your HVAC has been trying to tell you something. Here's what each signal actually means.",
            "",
            "Subscribe for more honest HVAC tips.",
            "",
            "#HVACTips #HomeComfort #FortWorth",
          ].join("\n"),
        },
        facebook: [
          "If your HVAC has been making a strange noise or producing an odd smell, it's worth paying attention — those signals usually mean something specific. 🏠",
          "",
          "A bang on startup, a musty odor from the vents, or a burning smell in heat mode each point to different things going on inside the system. The good news: catching them early is almost always simpler and less costly than waiting.",
          "",
          "Here's a quick breakdown of what each one means — useful to have in the back of your mind before a small issue becomes a big one.",
          "",
          "#FortWorthHVAC #HomeComfort",
        ].join("\n"),
        linkedin: [
          "Most homeowners hear a strange noise from their HVAC system and do one of two things: search frantically online or talk themselves into waiting. Neither approach gives them a reliable framework.",
          "",
          "Three specific warning signals — a bang on startup, a musty odor from the vents, and a burning smell in heat mode — each typically point to something different beneath the surface. Understanding them in plain language, without technical jargon, changes how you respond.",
          "",
          "These signals are not random. They are the system communicating early, before the problem escalates. The homeowner who understands that framework is in a fundamentally better position than one who doesn't.",
          "",
          "#HVAC #HomeComfort #FortWorth",
        ].join("\n"),
        x: [
          "That bang when your HVAC kicks on isn't a quirk. It's the system pointing at something specific — and it's easier to address now than later. #HVACTips",
          "Musty smell from the vents every time the AC runs? That's not just dust. Your system has been trying to tell you something. #HomeComfort",
          "Burning smell in heat mode that doesn't go away after a few minutes? Not dust burning off. Here's what it usually means. #HVAC",
        ],
      },
    },
    {
      id: "almost-said-yes",
      title: "The Moment She Almost Said Yes",
      selectorLabel: "Repair vs Replace",
      topic:
        "Why homeowners should understand what specifically failed before approving a full HVAC replacement.",
      projectId: HVAC_PROJECT_ID,
      videoJobId: HVAC_FINAL_VIDEO_JOBS.almostSaidYes,
      videoUrl: industryExampleVideoUrl(HVAC_FINAL_VIDEO_JOBS.almostSaidYes),
      videoPosterUrl: null,
      platforms: {
        instagram: [
          "She was holding her checkbook, ready to sign for a full HVAC replacement.",
          "",
          "One question — 'what specifically failed?' — and the contractor had nothing.",
          "",
          "She called someone else. It was a capacitor. Two hundred dollars. She didn't need a new system.",
          "",
          "Before you say yes to a big number, ask that question first. 🏠",
          "",
          "#HVACRepair #HomeOwner #FortWorth #DFWHomes #SmartHomeOwner #HVACLife #TexasHeat #DontOverpay #HomeMaintenanceTips #TarrantCounty",
        ].join("\n"),
        tiktok: [
          "She was literally holding her checkbook. One question saved her thousands. 👀",
          "",
          "#HVACTips #HomeOwnerLife #FortWorth #DontGetScammed #TikTokHome",
        ].join("\n"),
        youtube: {
          title: "The Moment She Almost Said Yes",
          description: [
            "She almost bought a whole new HVAC system — then asked one question. The answer changed everything.",
            "",
            "So she called someone else. Turned out it was a capacitor. Two hundred dollars. She didn't need a new system.",
            "",
            "Subscribe for more honest HVAC advice from Fort Worth.",
            "",
            "#HVACRepair #FortWorth #HomeOwner",
          ].join("\n"),
        },
        facebook: [
          "A Fort Worth homeowner was minutes away from signing a quote for a full HVAC replacement she didn't need. 😬",
          "",
          "Her friend had told her one thing to ask first — 'what specifically failed?' — and the contractor couldn't answer it. She called someone else. A $200 capacitor later, her system was running fine.",
          "",
          "If you're ever in that situation, you deserve real answers before anyone hands you a big number.",
          "",
          "#FortWorth #HVACRepair #HomeOwners",
        ].join("\n"),
        linkedin: [
          "A homeowner was seconds from approving a full HVAC replacement — until she asked one question the contractor couldn't answer: 'What specifically failed?'",
          "",
          "The second technician ran a real diagnostic. The compressor was fine. A failed capacitor was the culprit. The repair cost a fraction of the replacement quote.",
          "",
          "The differentiator in HVAC service is not the equipment brand or the price — it is whether the technician can explain the finding before they explain the invoice.",
          "",
          "#HVAC #FortWorth #HomeServices",
        ].join("\n"),
        x: [
          "She was holding her checkbook, ready to sign. One question the contractor couldn't answer saved her thousands. Ask what specifically failed — every time. #HVAC #FortWorth",
          "The contractor said her 12-year-old system was 'basically dead.' She asked one question. He had no answer. It was a $200 capacitor. #HVACRepair #DFW",
          "Before you approve any HVAC replacement quote — ask what specifically failed. If they can't answer clearly, call someone else. #FortWorth #HVAC",
        ],
      },
    },
  ],
};
