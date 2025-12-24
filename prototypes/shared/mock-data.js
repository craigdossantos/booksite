// Mock data for prototypes
// This represents a chapter from "Getting Things Done" by David Allen

export const mockChapter = {
  id: "chapter-1-getting-things-done",
  title: "Getting Things Done",
  summary:
    "The Getting Things Done (GTD) methodology provides a systematic approach to managing tasks, projects, and commitments. By capturing everything externally and processing it methodically, you free your mind for creative thinking instead of remembering tasks.",

  keyPoints: [
    {
      id: "kp-1",
      title: "Capture Everything",
      summary:
        "Your mind is for having ideas, not holding them. Capture all tasks, ideas, and commitments in a trusted external system.",
      details:
        "The human brain can hold about 7 items in working memory. Every uncaptured commitment creates cognitive load. By capturing everything externally, you free mental bandwidth for thinking and creativity rather than remembering.",
      deepDive: {
        title: "The Psychology of External Storage",
        content:
          "Neuroscience shows that unfinished tasks create 'open loops' in the brain (Zeigarnik Effect). These loops persist in working memory, consuming cognitive resources even when you're not actively thinking about them. Research by Baumeister (2011) demonstrated that simply writing down tasks significantly reduces anxiety and improves focus. The act of externalization creates psychological closure, even before task completion.",
      },
      examples: [
        "Use inbox zero approach: process every email to done/defer/delegate",
        "Keep a ubiquitous capture tool (notebook, phone app, voice recorder)",
        "Weekly brain dump: 15 minutes to capture everything on your mind",
      ],
    },
    {
      id: "kp-2",
      title: "Process Weekly",
      summary:
        "Set aside dedicated time each week to review and update your system.",
      details:
        "Weekly reviews prevent system decay. During this time, empty all inboxes, review upcoming calendar, update project lists, and ensure nothing falls through the cracks. This creates the trust that makes GTD work.",
      deepDive: {
        title: "The Compounding Effect of Weekly Reviews",
        content:
          "Studies of GTD practitioners show that weekly reviews compound over time. After 3 months, users report 40% reduction in stress and 35% increase in productive output. The review creates a feedback loop: better system → more trust → more usage → better system. Missing even one review can break this trust cycle.",
      },
      examples: [
        "Sunday afternoon review: 1 hour to process everything",
        "Empty all capture points (email, notebook, phone)",
        "Review calendar for next 2 weeks and prepare",
      ],
    },
    {
      id: "kp-3",
      title: "Define Next Actions",
      summary: "Every project needs a concrete next physical action defined.",
      details:
        "The 'stuff' you capture must be processed into actionable items. A project like 'Plan vacation' becomes 'Email Sarah for Hawaii recommendations.' This clarity eliminates friction and procrastination.",
      deepDive: {
        title: "The Power of Action Clarity",
        content:
          "Research shows that vague tasks ('work on report') cause decision fatigue. Your brain has to decide what 'work on' means each time you see it. Specific actions ('draft introduction paragraph for Q4 report') eliminate this friction. Studies show 3x completion rate for specific vs. vague actions.",
      },
      examples: [
        "Bad: 'Plan vacation' → Good: 'Search Airbnb for Maui 3BR houses'",
        "Bad: 'Work on presentation' → Good: 'Outline 5 key points for sales deck'",
        "Bad: 'Handle taxes' → Good: 'Download last year's return from TurboTax'",
      ],
    },
  ],

  concepts: [
    {
      name: "Zeigarnik Effect",
      definition: "Uncompleted tasks persist in working memory",
    },
    {
      name: "Cognitive Load",
      definition: "Mental effort required to process information",
    },
    { name: "Inbox Zero", definition: "Methodology for processing all inputs" },
  ],

  projects: [
    {
      title: "Build Your GTD System",
      duration: "2 weeks",
      goal: "Set up a complete GTD workflow that you'll actually use",
      steps: [
        "Choose your tools (recommendation: Todoist + Google Calendar)",
        "Create inbox, next actions, projects, waiting for, and someday/maybe lists",
        "Do initial brain dump (capture EVERYTHING for 15 minutes)",
        "Process all inboxes to zero",
        "Schedule your first weekly review",
        "Practice for 2 weeks, then evaluate and adjust",
      ],
      successCriteria:
        "You trust the system enough that your mind stops tracking tasks",
    },
  ],
};

// Color scheme matching the existing booksite
export const colors = {
  void: "#0a0a0f",
  voidLight: "#14141a",
  graphite: "#1e1e28",
  slate: "#2a2a38",
  steel: "#6b7280",
  silver: "#9ca3af",
  pearl: "#d1d5db",
  cloud: "#e5e7eb",
  snow: "#f9fafb",
  electricBlue: "#3b82f6",
  electricPurple: "#8b5cf6",
  electricCyan: "#06b6d4",
  electricEmerald: "#10b981",
  electricAmber: "#f59e0b",
  electricRose: "#f43f5e",
};
