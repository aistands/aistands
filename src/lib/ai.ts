import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

const SYSTEM_PROMPT = `You are AIstands, an expert AI assistant specialising in standards, regulations, compliance, and guidance documents. You help professionals understand, interpret, and apply standards to their work.

Your role:
- Answer questions about standards clearly and accurately in plain English
- Always reference specific clause numbers when answering
- Be precise — compliance professionals rely on your answers for real decisions
- If something is unclear or open to interpretation, say so honestly
- Never guess or fabricate clause references — if unsure, say so
- Keep answers focused and actionable

Tone: Professional, clear, and helpful. Not overly formal. Like a knowledgeable colleague.`

export async function queryDocument({
  question,
  documentText,
  conversationHistory = [],
  language = 'en',
}: {
  question: string
  documentText: string
  conversationHistory?: { role: 'user' | 'assistant'; content: string }[]
  language?: string
}) {
  const languageInstruction = language !== 'en'
    ? `\n\nIMPORTANT: Respond in ${getLanguageName(language)}.`
    : ''

  const messages: Anthropic.MessageParam[] = [
    ...conversationHistory.map(m => ({
      role: m.role,
      content: m.content,
    })),
    {
      role: 'user',
      content: `Here is the standard/document content:\n\n<document>\n${documentText}\n</document>\n\nQuestion: ${question}${languageInstruction}`,
    },
  ]

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    system: SYSTEM_PROMPT,
    messages,
  })

  return response.content[0].type === 'text' ? response.content[0].text : ''
}

export async function generateChecklist({
  documentText,
  section,
  language = 'en',
}: {
  documentText: string
  section?: string
  language?: string
}) {
  const sectionInstruction = section
    ? `Focus only on ${section}.`
    : 'Cover all major requirements.'

  const languageInstruction = language !== 'en'
    ? `Respond in ${getLanguageName(language)}.`
    : ''

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `From this standard:\n\n<document>\n${documentText}\n</document>\n\nGenerate a compliance checklist of actionable items. ${sectionInstruction} ${languageInstruction}

Return as JSON only, no other text:
{
  "title": "checklist title",
  "items": [
    {
      "id": "unique_id",
      "clause": "clause number",
      "requirement": "what must be done",
      "completed": false
    }
  ]
}`,
    }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
  try {
    return JSON.parse(text.replace(/```json|```/g, '').trim())
  } catch {
    return { title: 'Compliance Checklist', items: [] }
  }
}

export async function generateWorkbookEntries({
  documentText,
  language = 'en',
}: {
  documentText: string
  language?: string
}) {
  const languageInstruction = language !== 'en'
    ? `Respond in ${getLanguageName(language)}.`
    : ''

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `From this standard:\n\n<document>\n${documentText}\n</document>\n\nExtract the key requirements into structured workbook entries. ${languageInstruction}

Return as JSON only:
{
  "entries": [
    {
      "id": "unique_id",
      "clause": "clause number",
      "title": "short title",
      "requirement": "full requirement text",
      "notes": ""
    }
  ]
}`,
    }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
  try {
    return JSON.parse(text.replace(/```json|```/g, '').trim())
  } catch {
    return { entries: [] }
  }
}

export async function compareVersions({
  oldDocument,
  newDocument,
  language = 'en',
}: {
  oldDocument: string
  newDocument: string
  language?: string
}) {
  const languageInstruction = language !== 'en'
    ? `Respond in ${getLanguageName(language)}.`
    : ''

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `Compare these two versions of a standard and identify what changed. ${languageInstruction}

OLD VERSION:
<old>\n${oldDocument}\n</old>

NEW VERSION:
<new>\n${newDocument}\n</new>

Return as JSON only:
{
  "summary": "brief overall summary of changes",
  "changes": [
    {
      "id": "unique_id",
      "type": "new" | "changed" | "removed",
      "clause": "clause reference",
      "description": "what changed and why it matters"
    }
  ]
}`,
    }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
  try {
    return JSON.parse(text.replace(/```json|```/g, '').trim())
  } catch {
    return { summary: '', changes: [] }
  }
}

export async function suggestProjectNames(documentText: string): Promise<string[]> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 200,
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `Based on this standards document, suggest 4 concise project names a compliance professional might use. Return JSON only: {"suggestions": ["name1", "name2", "name3", "name4"]}\n\nDocument:\n${documentText.slice(0, 1000)}`,
    }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
  try {
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
    return parsed.suggestions || []
  } catch {
    return []
  }
}

export async function runGapAnalysis({
  documentText,
  situation,
  language = 'en',
}: {
  documentText: string
  situation: string
  language?: string
}) {
  const languageInstruction = language !== 'en'
    ? `Respond in ${getLanguageName(language)}.`
    : ''

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `Analyse the gap between what this standard requires and the described current situation. ${languageInstruction}

STANDARD:
<document>\n${documentText}\n</document>

CURRENT SITUATION:
${situation}

Return as JSON only:
{
  "summary": "overall gap assessment",
  "gaps": [
    {
      "id": "unique_id",
      "severity": "high" | "medium" | "low",
      "clause": "clause reference",
      "gap": "what is missing or non-compliant",
      "action": "what needs to be done"
    }
  ]
}`,
    }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
  try {
    return JSON.parse(text.replace(/```json|```/g, '').trim())
  } catch {
    return { summary: '', gaps: [] }
  }
}

function getLanguageName(code: string): string {
  const map: Record<string, string> = {
    es: 'Spanish', fr: 'French', de: 'German',
    it: 'Italian', nl: 'Dutch', ja: 'Japanese',
  }
  return map[code] || 'English'
}
