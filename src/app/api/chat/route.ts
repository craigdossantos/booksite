/**
 * Chat API Route - Streaming with Tool Use
 *
 * Provides an AI learning assistant that can:
 * - Answer questions about book content
 * - Navigate users through concepts at different depth levels
 * - Generate quizzes on demand
 * - Trigger UI navigation actions
 */

import { streamText, tool, stepCountIs, convertToModelMessages } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import {
  getBookContext,
  getConceptDetails,
  searchBookContent,
  generateTopicQuiz,
  getChapterSummary,
} from '@/lib/bookContext';
import type { UIAction, DepthLevel } from '@/types/book';

export const maxDuration = 60;

// Define tools for the AI assistant
const tools = {
  getConceptDetails: tool({
    description: 'Get detailed information about a specific concept from the book, including definition, mechanism, related quizzes, and projects. Use this when the user asks about a specific concept or topic.',
    inputSchema: z.object({
      conceptName: z.string().describe('The name of the concept to look up'),
      depthLevel: z.enum(['1', '2', '3', '4']).optional().describe('Depth level: 1=summary, 2=key points, 3=deep dive, 4=application'),
    }),
    execute: async ({ conceptName, depthLevel }) => {
      const depth = depthLevel ? (parseInt(depthLevel) as DepthLevel) : undefined;
      const result = await getConceptDetails(
        (globalThis as unknown as { __bookId: string }).__bookId,
        conceptName,
        depth
      );

      if (!result.found) {
        return {
          found: false,
          message: `I couldn't find a concept matching "${conceptName}". Try a different term or ask me to search for it.`,
        };
      }

      return {
        found: true,
        name: result.concept?.name,
        definition: result.concept?.definition,
        mechanism: result.concept?.mechanism,
        depth: result.depth,
        relatedQuizzes: result.relatedQuizzes,
        relatedProjects: result.relatedProjects?.map(p => ({
          title: p.title,
          goal: p.goal,
        })),
        // UI action to highlight this concept
        uiAction: {
          type: 'highlightConcept',
          conceptId: result.concept?.name.toLowerCase().replace(/\s+/g, '-'),
        } as UIAction,
      };
    },
  }),

  searchBookContent: tool({
    description: 'Search for content in the book by keyword or phrase. Returns matching chapters, concepts, stories, and quiz questions.',
    inputSchema: z.object({
      query: z.string().describe('The search term or phrase'),
      chapterFilter: z.string().optional().describe('Optional chapter name to limit search'),
    }),
    execute: async ({ query, chapterFilter }) => {
      const result = await searchBookContent(
        (globalThis as unknown as { __bookId: string }).__bookId,
        query,
        chapterFilter
      );

      return {
        results: result.results,
        totalMatches: result.totalMatches,
        message: result.results.length > 0
          ? `Found ${result.totalMatches} matches for "${query}"`
          : `No results found for "${query}". Try different keywords.`,
      };
    },
  }),

  navigateToSection: tool({
    description: 'Navigate the user interface to a specific section, chapter, or concept. Use this when you want to show the user specific content.',
    inputSchema: z.object({
      sectionId: z.string().describe('The ID or name of the section to navigate to'),
      highlightText: z.string().optional().describe('Optional text to highlight in the section'),
    }),
    execute: async ({ sectionId, highlightText }) => {
      return {
        action: 'navigate',
        sectionId,
        highlightText,
        uiAction: {
          type: 'navigate',
          sectionId,
          highlightText,
        } as UIAction,
      };
    },
  }),

  generateQuiz: tool({
    description: 'Generate a practice quiz on a specific topic. Use this when the user wants to test their knowledge.',
    inputSchema: z.object({
      topic: z.string().describe('The topic to generate questions about'),
      difficulty: z.enum(['easy', 'medium', 'hard']).describe('Difficulty level'),
      questionCount: z.number().min(1).max(5).describe('Number of questions (1-5)'),
    }),
    execute: async ({ topic, difficulty, questionCount }) => {
      const result = await generateTopicQuiz(
        (globalThis as unknown as { __bookId: string }).__bookId,
        topic,
        difficulty,
        questionCount
      );

      return {
        topic: result.topic,
        questionCount: result.questions.length,
        questions: result.questions,
        message: result.questions.length > 0
          ? `Here's a ${difficulty} quiz on "${topic}" with ${result.questions.length} questions`
          : `I couldn't find quiz questions about "${topic}". Try a broader topic.`,
        uiAction: {
          type: 'showQuiz',
          conceptId: topic.toLowerCase().replace(/\s+/g, '-'),
        } as UIAction,
      };
    },
  }),

  getChapterSummary: tool({
    description: 'Get a summary of a specific chapter including its Feynman explanation, concepts, and related content.',
    inputSchema: z.object({
      chapterName: z.string().describe('The chapter title or ID'),
    }),
    execute: async ({ chapterName }) => {
      const result = await getChapterSummary(
        (globalThis as unknown as { __bookId: string }).__bookId,
        chapterName
      );

      if (!result.found) {
        return {
          found: false,
          message: `I couldn't find a chapter matching "${chapterName}".`,
        };
      }

      return {
        found: true,
        title: result.chapter?.title,
        summary: result.chapter?.summary,
        feynman: result.feynman ? {
          thesis: result.feynman.thesis,
          analogy: result.feynman.analogy,
          eli12: result.feynman.eli12,
        } : null,
        conceptCount: result.concepts.length,
        concepts: result.concepts.slice(0, 5).map(c => c.name),
        quizCount: result.quizCount,
        projectCount: result.projectCount,
        uiAction: {
          type: 'navigate',
          sectionId: result.chapter?.id || chapterName,
        } as UIAction,
      };
    },
  }),

  explainSimpler: tool({
    description: 'Provide a simpler explanation of a concept using the Feynman technique. Use when user says they don\'t understand or asks for simpler explanation.',
    inputSchema: z.object({
      conceptName: z.string().describe('The concept to explain more simply'),
    }),
    execute: async ({ conceptName }) => {
      const result = await getConceptDetails(
        (globalThis as unknown as { __bookId: string }).__bookId,
        conceptName
      );

      if (!result.found) {
        return {
          found: false,
          message: `Let me try to explain "${conceptName}" in simpler terms based on general knowledge.`,
        };
      }

      return {
        found: true,
        concept: result.concept?.name,
        simpleExplanation: result.feynman?.eli12 || result.depth.summary,
        analogy: result.feynman?.analogy || null,
        whyItMatters: result.feynman?.why_it_matters || null,
        uiAction: {
          type: 'openDepthLevel',
          nodeId: result.concept?.name.toLowerCase().replace(/\s+/g, '-'),
          depth: 1,
        } as UIAction,
      };
    },
  }),

  goDeeper: tool({
    description: 'Provide more detailed information about a concept. Use when user wants to learn more or go deeper.',
    inputSchema: z.object({
      conceptName: z.string().describe('The concept to explore more deeply'),
    }),
    execute: async ({ conceptName }) => {
      const result = await getConceptDetails(
        (globalThis as unknown as { __bookId: string }).__bookId,
        conceptName,
        3 // Deep dive level
      );

      if (!result.found) {
        return {
          found: false,
          message: `I'll provide a deeper exploration of "${conceptName}" based on the book's themes.`,
        };
      }

      return {
        found: true,
        concept: result.concept?.name,
        mechanism: result.concept?.mechanism,
        context: result.concept?.context,
        depth: result.depth,
        relatedConcepts: result.relatedProjects?.map(p => p.related_concept),
        uiAction: {
          type: 'openDepthLevel',
          nodeId: result.concept?.name.toLowerCase().replace(/\s+/g, '-'),
          depth: 3,
        } as UIAction,
      };
    },
  }),

  showApplications: tool({
    description: 'Show real-world applications and projects related to a concept. Use when user asks how to apply something.',
    inputSchema: z.object({
      conceptName: z.string().describe('The concept to find applications for'),
    }),
    execute: async ({ conceptName }) => {
      const result = await getConceptDetails(
        (globalThis as unknown as { __bookId: string }).__bookId,
        conceptName,
        4 // Application level
      );

      return {
        found: result.found,
        concept: result.concept?.name,
        applications: result.depth.application,
        projects: result.relatedProjects?.map(p => ({
          title: p.title,
          goal: p.goal,
          steps: p.steps,
          duration: p.duration,
        })),
        uiAction: {
          type: 'openDepthLevel',
          nodeId: result.concept?.name.toLowerCase().replace(/\s+/g, '-') || conceptName,
          depth: 4,
        } as UIAction,
      };
    },
  }),
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { messages, bookId, bookTitle, currentSection } = body;

    // Store bookId in global for tool access (workaround for Vercel AI SDK)
    (globalThis as unknown as { __bookId: string }).__bookId = bookId;

    // Get enriched book context
    const bookContext = await getBookContext(bookId, currentSection);

    const systemPrompt = `You are an expert learning assistant for the book "${bookContext.title}" by ${bookContext.author}.

BOOK CONTEXT:
${bookContext.thesis ? `Core Thesis: ${bookContext.thesis}` : ''}
${bookContext.currentContext ? `\nCurrent Section: ${bookContext.currentContext}` : ''}

KEY CONCEPTS:
${bookContext.concepts}

YOUR CAPABILITIES:
1. Answer questions about the book using Socratic questioning when helpful
2. Explain concepts at different depth levels (summary → key points → deep dive → application)
3. Navigate users through the book content
4. Generate practice quizzes
5. Find related concepts and connections
6. Use the Feynman technique to explain complex ideas simply

INTERACTION GUIDELINES:
- Be concise but thorough in your responses
- Use markdown for clarity (headers, bullets, bold for emphasis)
- When explaining concepts, start with the simple version and offer to go deeper
- If a user seems confused, proactively offer a simpler explanation
- Connect ideas back to the book's core themes
- Suggest related concepts they might want to explore
- Use tools to access specific book content rather than guessing
- When you use a tool that returns a uiAction, mention that you're navigating or highlighting something

TEACHING APPROACH:
- Ask clarifying questions when the user's intent is unclear
- Break down complex topics into digestible parts
- Use analogies and real-world examples
- Encourage active learning by suggesting quizzes and applications
- Celebrate progress and maintain an encouraging tone`;

    const result = streamText({
      model: anthropic('claude-sonnet-4-20250514'),
      system: systemPrompt,
      messages: convertToModelMessages(messages),
      tools,
      stopWhen: stepCountIs(5), // Allow multi-turn tool use
      onStepFinish: ({ toolCalls, toolResults }) => {
        // Log tool usage for debugging
        if (toolCalls && toolCalls.length > 0) {
          console.log('Tool calls:', toolCalls.map((tc: { toolName: string }) => tc.toolName));
        }
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error: unknown) {
    console.error('Chat API error:', error);

    // Check if it's an API key error
    if (error instanceof Error && (error.message.includes('API key') || error.message.includes('authentication'))) {
      return new Response(
        JSON.stringify({
          error: 'AI chat is not configured. Please add your ANTHROPIC_API_KEY to the .env file.',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        error: 'An error occurred while processing your request. Please try again.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
