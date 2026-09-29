export const corridors = [
  {
    id: "winter-spiti",
    title: "Winter Spiti expedition",
    kicker: "Frozen rivers",
    body: "Frozen rivers and high winter roads in Spiti. Whether a group drives or rides depends on snow, ice, and whether the line is open. A date appears here only after ops publishes a departure.",
    image: "/imagery/suv-high-road.svg",
    alt: "A 4x4 on a high Himalayan road in winter light",
    keywords: ["spiti"],
  },
  {
    id: "zanskar-chadar",
    title: "Zanskar Valley frozen trails",
    kicker: "Chadar season",
    body: "Zanskar’s rugged valley, including the season when the Chadar ice is the route. Ice changes by the day. This card is not a confirmation that a crossing is on.",
    image: "/imagery/alpine-convoy.svg",
    alt: "High ridges and a convoy road in the Himalaya",
    keywords: ["zanskar", "chadar"],
  },
  {
    id: "manali-leh",
    title: "Manali–Leh high passes",
    kicker: "Ladakh loop",
    body: "The high-pass road between Manali and Leh, run as a 4x4 convoy or a motorbike group with support. Passes close for snow and slides. Both vehicle classes stay separate departures.",
    image: "/imagery/motorbike-high-road.svg",
    alt: "A motorbike on a high Himalayan pass road",
    keywords: ["leh", "manali", "ladakh"],
  },
] as const

export const faqItems = [
  {
    question: "How do I request a departure?",
    answer:
      "Open a published expedition, choose an open date, and send a booking request. The price and deposit are calculated on our side in INR. A request is not a captured payment and not a confirmed seat until ops accepts it.",
  },
  {
    question: "What does the deposit cover?",
    answer:
      "The deposit is the amount shown on that departure, charged per SUV seat or motorbike rider slot. The balance is the rest of the unit price. Pillions do not take a second bike slot unless that departure says they do.",
  },
  {
    question: "Can I book when a batch is full?",
    answer:
      "No. A full departure stays visible and cannot be requested. Use the waitlist on that expedition. If the road closes or someone releases a seat, ops decides whether to offer it.",
  },
  {
    question: "What if the pass is closed?",
    answer:
      "High roads close for snow, slides, and local orders. We do not promise an open pass. Ops can close or cancel a departure and will record the reason. Existing requests stay on the manifest for a reschedule or refund conversation.",
  },
  {
    question: "Do you run private groups?",
    answer:
      "Yes. Send a custom private-group enquiry with the vehicle class, rough month, and party size. A private departure is priced and dated only after ops confirms vehicles, guides, and permits.",
  },
  {
    question: "What should I tell you about fitness?",
    answer:
      "Every traveler submits a short fitness self-declaration and an emergency contact. Motorbike riders also record riding experience. This is not a medical clearance from a doctor. Altitude illness can still happen to fit people.",
  },
] as const

export const riderGear = {
  ride: [
    "ECE or ISI helmet that you have already worn on a full day",
    "Riding jacket and pants with armor, plus wet-weather shell",
    "Gloves you can still feel the levers in, and a spare pair",
    "Boots that cover the ankle",
    "Daypack that fits a water bladder and a warm layer",
  ],
  camp: [
    "Warm sleeping layer for nights below freezing",
    "Sunglasses and SPF for snow glare",
    "Personal medicines and a copy of any prescription",
    "Headlamp, water bottles, and a small repair kit you know how to use",
  ],
} as const

export const suvGear = {
  drive: [
    "Soft bag rather than a hard suitcase, so it packs into a roof or rear load",
    "Layers for a hot cabin and a cold viewpoint",
    "Sun hat, sunglasses, and SPF",
    "Motion comfort if you get sick on switchbacks",
    "Comfortable shoes for short walks off the vehicle",
  ],
  camp: [
    "Warm night layer even in summer at altitude",
    "Personal medicines and a written emergency contact",
    "Refillable bottle and any dietary needs written down before departure",
    "Passport or government ID as required for the permit window",
  ],
} as const

export const safetySections = [
  {
    id: "ams",
    title: "Altitude and AMS",
    body: [
      "Acute mountain sickness can start well below the highest pass. Headache, nausea, poor sleep, and unusual fatigue are signals to stop climbing, not to push for the photo.",
      "Itineraries include acclimatization nights on purpose. Skipping them to 'save a day' is not offered. Descend is the treatment we plan for, and a support vehicle is there so a sick traveler is not left to ride or drive down alone.",
      "A fitness note on the booking form is a self-declaration. It does not replace advice from your own doctor, especially if you have heart, lung, or blood-pressure conditions.",
    ],
  },
  {
    id: "permits",
    title: "Inner Line and Protected Area permits",
    body: [
      "Several Himalayan corridors need an Inner Line Permit, a Protected Area Permit, or both, and the rules depend on nationality, route, and the current local order.",
      "Ice Age Expeditions collects the documents ops asks for and applies through the channel that route uses. We do not publish a permanent permit checklist here, because a stale rule is worse than a short one.",
      "If a permit window closes, the departure does not silently proceed. Ops will close it and contact the party.",
    ],
  },
  {
    id: "weather",
    title: "Weather and road closure",
    body: [
      "Snow, washouts, and administrative closures can shut a pass after you have paid a deposit. The published itinerary is the plan, not a guarantee that every col will be open.",
      "We would rather reroute or cancel than drive or ride a group into a closed valley. Cancellation terms on the departure are the ones that apply, and they are shown before you send a request.",
    ],
  },
  {
    id: "support",
    title: "Support vehicles and guides",
    body: [
      "Motorbike expeditions travel with a support vehicle unless a specific departure says otherwise. SUV journeys are guided convoys, not a lone self-drive rental.",
      "Lead guides set the day's pace for altitude and daylight. Mechanical support is for keeping the group moving, not for rebuilding a neglected bike at 5,000 m.",
    ],
  },
] as const
