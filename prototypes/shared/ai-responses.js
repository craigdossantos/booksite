// Pre-written AI responses for prototypes
// These simulate what an AI assistant would say

export const mockAIResponses = {
  "how do I build a capture habit": {
    response: `Building a capture habit requires making it frictionless. Here's a 3-step approach:

**1. Choose one ubiquitous tool** - Use something always with you (phone app, small notebook). Don't use multiple systems initially.

**2. Create a trigger** - Capture every time you feel mental friction or think "I should remember this." That feeling is your trigger.

**3. Process daily for 21 days** - Research shows habits form through consistent repetition. Set a daily alarm to review and empty your capture system.

**Pro tip**: Start with a single inbox. Many people fail GTD by creating too many buckets upfront.`,
    relatedConcepts: ["Habit Formation", "Cognitive Load"],
    deeperQuestions: [
      "Show me real-world examples of capture systems",
      "What if I forget to capture things?",
      "How do I choose the right tool?",
    ],
  },

  "show me real-world examples of capture systems": {
    response: `Here are 3 battle-tested capture systems:

**The Digital Minimalist** (Sara, Product Manager)
- Primary: Apple Notes app on iPhone
- Trigger: Voice memos during commute, quick notes during meetings
- Process: 10 minutes every evening

**The Analog Purist** (James, Writer)
- Primary: Pocket Moleskine notebook
- Trigger: Writes everything by hand during the day
- Process: Types into Todoist every Sunday afternoon

**The Hybrid Pro** (Maria, Consultant)
- Inbox: Gmail with labels
- Quick capture: iPhone voice recorder → transcribed to Notes
- Process: Weekly review moves items to Notion database

All three share: **one primary tool, daily/weekly processing, never more than 24 hours between capture and processing**.`,
    relatedConcepts: ["Tools", "Processing"],
    deeperQuestions: [
      "How do I migrate my current mess into a system?",
      "What about paper vs digital?",
    ],
  },

  "what if I forget to capture things": {
    response: `Forgetting to capture is **normal** during the first 2-3 weeks. Here's how to fix it:

**Immediate fixes:**
- Set recurring alarms (10am, 2pm, 6pm) asking "Did I capture everything?"
- Put sticky notes on your monitor/fridge/bathroom mirror: "CAPTURE IT"
- Make capture absurdly easy: one-tap shortcuts, voice commands, pre-opened notebook

**Long-term solution:**
The goal isn't perfection—it's noticing the feeling of "I need to remember this" and immediately capturing. That feeling becomes your trigger.

**Recovery protocol:**
When you realize you forgot something, don't beat yourself up. Just capture it now and review your triggers. Where were you? What were you doing? Add a reminder for that context.`,
    relatedConcepts: ["Habit Formation", "Triggers"],
    deeperQuestions: [
      "How do I capture things during meetings without being rude?",
      "What about capturing thoughts while driving?",
    ],
  },

  "why do weekly reviews matter": {
    response: `Weekly reviews are the **trust engine** of GTD. Here's why they're non-negotiable:

**Without weekly reviews:**
- Your system becomes a graveyard of stale tasks
- You stop trusting the system
- Your brain goes back to tracking everything
- The system fails within 3-4 weeks

**With weekly reviews:**
- You trust that nothing is forgotten
- Your mind relaxes and becomes creative
- Projects move forward systematically
- Stress decreases by ~40% (research-backed)

**The compounding effect:**
Week 1: Feels like admin work
Week 4: You start seeing gaps before they're problems
Week 12: You're operating with a clarity most people never experience

Missing one review breaks the trust. It's like not balancing your checkbook—things spiral quickly.`,
    relatedConcepts: ["Trust", "System Maintenance", "Compounding"],
    deeperQuestions: [
      "What exactly do I do in a weekly review?",
      "How long should it take?",
      "Can I do it in smaller chunks?",
    ],
  },

  "how do I handle projects vs tasks": {
    response: `The GTD distinction is simple but powerful:

**Task** = Can be done in one sitting (usually < 1 hour)
Example: "Email John about budget proposal"

**Project** = Requires multiple actions (outcome that needs >1 step)
Example: "Launch new website" (requires planning, design, development, testing, etc.)

**The key rule:**
Every project must have a **next action** defined. This is where most people fail.

**Example transformation:**
❌ Project: "Remodel kitchen"
✅ Project: "Remodel kitchen"
    Next action: "Call 3 contractors for estimates"
    After that: "Review estimates and choose contractor"

Your project list is a review tool. Your next actions list is your work tool. Never work from the project list directly.`,
    relatedConcepts: ["Next Actions", "Projects", "Lists"],
    deeperQuestions: [
      "How do I break down big projects?",
      "What if I don't know all the steps?",
    ],
  },
};

// Helper function to get AI response
export function getAIResponse(query) {
  const normalizedQuery = query.toLowerCase().trim();

  // Find matching response
  for (const [key, value] of Object.entries(mockAIResponses)) {
    if (normalizedQuery.includes(key) || key.includes(normalizedQuery)) {
      return value;
    }
  }

  // Default response if no match
  return {
    response: `I understand you're asking about "${query}". Let me help you with that.

Based on GTD principles, the key is to **start simple and build gradually**. Focus on one habit at a time rather than trying to implement everything at once.

Would you like me to dive deeper into a specific aspect of this topic?`,
    relatedConcepts: ["GTD Fundamentals"],
    deeperQuestions: [
      "Tell me more about the basics",
      "Show me a practical example",
      "How do I get started?",
    ],
  };
}
