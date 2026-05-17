export interface GitaWisdomVerse {
  readonly id: string;
  readonly chapter: number;
  readonly verse: string;
  readonly theme: string;
  readonly preview: string;
  readonly sanskrit: string;
  readonly meaning: string;
  readonly lifeLessons: readonly string[];
}

export const GITA_WISDOM_VERSES: readonly GitaWisdomVerse[] = [
  {
    id: "gita-2-47",
    chapter: 2,
    verse: "47",
    theme: "Action without anxiety",
    preview: "कर्मण्येवाधिकारस्ते…",
    sanskrit:
      "कर्मण्येवाधिकारस्ते मा फलेषु कदाचन।\nमा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि॥",
    meaning:
      "Focus on the quality of your action, not on controlling every outcome. Results matter, but your steadiness should not depend on them.",
    lifeLessons: [
      "Do the work fully before worrying about recognition.",
      "Measure yourself by sincerity and discipline, not only by results.",
      "Detachment is not passivity; it is calm commitment.",
    ],
  },
  {
    id: "gita-2-48",
    chapter: 2,
    verse: "48",
    theme: "Balance in success and failure",
    preview: "योगस्थः कुरु कर्माणि…",
    sanskrit:
      "योगस्थः कुरु कर्माणि सङ्गं त्यक्त्वा धनञ्जय।\nसिद्ध्यसिद्ध्योः समो भूत्वा समत्वं योग उच्यते॥",
    meaning:
      "Act from inner balance. Success and failure may differ outside, but your judgment should remain steady within.",
    lifeLessons: [
      "Stay composed when outcomes shift.",
      "Build decisions from clarity, not emotional swings.",
      "Equanimity makes effort more intelligent.",
    ],
  },
  {
    id: "gita-2-50",
    chapter: 2,
    verse: "50",
    theme: "Skill in action",
    preview: "योगः कर्मसु कौशलम्…",
    sanskrit:
      "बुद्धियुक्तो जहातीह उभे सुकृतदुष्कृते।\nतस्माद्योगाय युज्यस्व योगः कर्मसु कौशलम्॥",
    meaning:
      "Wise action rises above careless extremes. True yoga is expressed as excellence, discernment, and skill in what you do.",
    lifeLessons: [
      "Quality matters as much as speed.",
      "A calm mind produces better work.",
      "Skill improves when intention and attention align.",
    ],
  },
  {
    id: "gita-3-19",
    chapter: 3,
    verse: "19",
    theme: "Duty with steadiness",
    preview: "तस्मादसक्तः सततं…",
    sanskrit:
      "तस्मादसक्तः सततं कार्यं कर्म समाचर।\nअसक्तो ह्याचरन्कर्म परमाप्नोति पूरुषः॥",
    meaning:
      "Keep doing the right work without becoming mentally trapped by possession or ego. Such action gradually elevates the person.",
    lifeLessons: [
      "Consistency outperforms occasional intensity.",
      "Do necessary work even when applause is absent.",
      "Responsibility becomes lighter when ego becomes smaller.",
    ],
  },
  {
    id: "gita-4-7",
    chapter: 4,
    verse: "7",
    theme: "Restoring what is right",
    preview: "यदा यदा हि धर्मस्य…",
    sanskrit:
      "यदा यदा हि धर्मस्य ग्लानिर्भवति भारत।\nअभ्युत्थानमधर्मस्य तदात्मानं सृजाम्यहम्॥",
    meaning:
      "When righteousness declines and disorder rises, the divine principle of restoration manifests to re-establish balance.",
    lifeLessons: [
      "Every decline invites the need for renewal.",
      "Stand for what protects dignity and justice.",
      "Correction is part of sustaining order.",
    ],
  },
  {
    id: "gita-4-8",
    chapter: 4,
    verse: "8",
    theme: "Protection and renewal",
    preview: "परित्राणाय साधूनां…",
    sanskrit:
      "परित्राणाय साधूनां विनाशाय च दुष्कृताम्।\nधर्मसंस्थापनार्थाय सम्भवामि युगे युगे॥",
    meaning:
      "The purpose of divine intervention is protection of the good, restraint of destructive forces, and re-establishment of dharma.",
    lifeLessons: [
      "Protection and accountability belong together.",
      "Healthy systems defend what is worthy.",
      "Renewal requires both compassion and courage.",
    ],
  },
  {
    id: "gita-6-5",
    chapter: 6,
    verse: "5",
    theme: "Lift yourself",
    preview: "उद्धरेदात्मनात्मानं…",
    sanskrit:
      "उद्धरेदात्मनात्मानं नात्मानमवसादयेत्।\nआत्मैव ह्यात्मनो बन्धुरात्मैव रिपुरात्मनः॥",
    meaning:
      "Raise yourself through your own higher understanding. The mind can become your ally or your obstacle depending on how you guide it.",
    lifeLessons: [
      "Self-discipline is an act of self-respect.",
      "Your inner habits shape your outer direction.",
      "Learn to become your own support system.",
    ],
  },
  {
    id: "gita-6-6",
    chapter: 6,
    verse: "6",
    theme: "The trained mind",
    preview: "बन्धुरात्मात्मनस्तस्य…",
    sanskrit:
      "बन्धुरात्मात्मनस्तस्य येनात्मैवात्मना जितः।\nअनात्मनस्तु शत्रुत्वे वर्तेतात्मैव शत्रुवत्॥",
    meaning:
      "A mind brought under discipline becomes a friend. A mind left uncontrolled can behave like an enemy.",
    lifeLessons: [
      "Mental training reduces unnecessary suffering.",
      "Attention is a resource worth guarding.",
      "Master small impulses before they master larger choices.",
    ],
  },
  {
    id: "gita-12-13",
    chapter: 12,
    verse: "13",
    theme: "Compassion without hatred",
    preview: "अद्वेष्टा सर्वभूतानां…",
    sanskrit:
      "अद्वेष्टा सर्वभूतानां मैत्रः करुण एव च।\nनिर्ममो निरहङ्कारः समदुःखसुखः क्षमी॥",
    meaning:
      "A noble person carries friendliness, compassion, humility, patience, and emotional steadiness toward all beings.",
    lifeLessons: [
      "Compassion is strength with softness.",
      "Humility improves relationships and judgment.",
      "Emotional stability makes kindness sustainable.",
    ],
  },
  {
    id: "gita-12-15",
    chapter: 12,
    verse: "15",
    theme: "Calm presence",
    preview: "यस्मान्नोद्विजते लोको…",
    sanskrit:
      "यस्मान्नोद्विजते लोको लोकान्नोद्विजते च यः।\nहर्षामर्षभयोद्वेगैर्मुक्तो यः स च मे प्रियः॥",
    meaning:
      "One who does not disturb the world and is not easily disturbed by it carries a deeply mature steadiness.",
    lifeLessons: [
      "Do not add chaos to already difficult spaces.",
      "A calm presence can be leadership.",
      "Freedom from emotional overreaction is a real strength.",
    ],
  },
  {
    id: "gita-18-66",
    chapter: 18,
    verse: "66",
    theme: "Trust and surrender",
    preview: "सर्वधर्मान्परित्यज्य…",
    sanskrit:
      "सर्वधर्मान्परित्यज्य मामेकं शरणं व्रज।\nअहं त्वां सर्वपापेभ्यो मोक्षयिष्यामि मा शुचः॥",
    meaning:
      "Release the burden of confused self-reliance and take refuge in the highest truth. Do not remain trapped in fear.",
    lifeLessons: [
      "Trust becomes powerful when ego loosens its grip.",
      "Fear reduces when direction becomes clear.",
      "Surrender is not weakness; it is alignment.",
    ],
  },
  {
    id: "gita-18-78",
    chapter: 18,
    verse: "78",
    theme: "Wisdom and action together",
    preview: "यत्र योगेश्वरः कृष्णो…",
    sanskrit:
      "यत्र योगेश्वरः कृष्णो यत्र पार्थो धनुर्धरः।\nतत्र श्रीर्विजयो भूतिर्ध्रुवा नीतिर्मतिर्मम॥",
    meaning:
      "Where wisdom and capable action stand together, there is strength, prosperity, and victory with principle.",
    lifeLessons: [
      "Insight and execution must work together.",
      "Right strategy needs right character.",
      "Success lasts longer when grounded in dharma.",
    ],
  },
] as const;
