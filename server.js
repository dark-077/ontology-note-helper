const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(__dirname));

app.get('/api/provider', (req, res) => {
  res.json({
    provider: process.env.API_PROVIDER || 'gmi',
    baseUrlConfigured: Boolean(process.env.GMI_API_BASE_URL || process.env.API_BASE_URL),
    model: process.env.GMI_MODEL_NAME || process.env.MODEL_NAME || 'deepseek-ai/DeepSeek-V4-Pro',
    tokenConfigured: Boolean(process.env.GMI_API_KEY || process.env.API_KEY)
  });
});

const systemPrompt = `You are ResearchGraph Agent, an AI assistant for overseas students and researchers. Analyze the user's notes, papers, slides, or project text, then convert the material into a research knowledge graph and an action-oriented study report.

Return strict JSON only, with no extra text:
{
  "concepts": [
    {
      "id": "unique lowercase id using letters, numbers, and underscores only",
      "name": "concept name",
      "definition": "brief definition grounded in the input text",
      "importance": 1-5,
      "category": "concept category"
    }
  ],
  "relationships": [
    {
      "source": "source concept id",
      "target": "target concept id",
      "relationship": "relationship type, such as includes, depends_on, applies_to, causes, supports, contrasts_with, related_to",
      "description": "brief explanation grounded in the input text"
    }
  ],
  "agentReport": {
    "summary": "3-5 sentence summary of what the material is about and why it matters",
    "insights": ["key insight 1", "key insight 2", "key insight 3"],
    "gaps": ["missing prerequisite, unclear assumption, or learning risk"],
    "actions": ["specific next study, research, or presentation action"]
  }
}

Requirements:
1. Extract 5-15 important concepts.
2. Relationships must be accurate, meaningful, and use concept ids that exist in concepts.
3. importance: central topic = 5, important subtopic = 3-4, supporting concept = 1-2.
4. The agentReport must make the result useful for global learners who need to understand academic material quickly.
5. If the source text is Chinese, answer in Chinese; otherwise answer in English.`;

app.post('/api/extract', async (req, res) => {
  try {
    const { text, accessCode = '' } = req.body;

    if (process.env.ACCESS_CODE && accessCode !== process.env.ACCESS_CODE) {
      return res.status(401).json({ error: '访问码不正确' });
    }

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: '请提供要分析的文本' });
    }

    if (text.length > 8000) {
      return res.status(400).json({ error: '文本过长，请控制在8000字以内' });
    }

    const apiKey = process.env.GMI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: '服务端未配置 GMI_API_KEY 或 API_KEY' });
    }

    const provider = process.env.API_PROVIDER || 'gmi';
    const apiBaseUrl = process.env.GMI_API_BASE_URL || process.env.API_BASE_URL || 'https://api.gmi-serving.com';
    const modelName = process.env.GMI_MODEL_NAME || process.env.MODEL_NAME || 'deepseek-ai/DeepSeek-V4-Pro';

    if (provider === 'anthropic') {
      const response = await fetch(`${apiBaseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: modelName,
          max_tokens: 2000,
          system: systemPrompt,
          messages: [{ role: 'user', content: text }]
        })
      });

      const data = await response.json();
      if (!response.ok) {
        return res.status(response.status).json({ error: data.error?.message || 'API调用失败' });
      }

      return res.json(parseAIContent(data.content[0].text));
    }

    const response = await fetch(`${apiBaseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'API调用失败' });
    }

    res.json(parseAIContent(data.choices[0].message.content));
  } catch (error) {
    res.status(500).json({ error: error.message || '服务器错误' });
  }
});

function parseAIContent(content) {
  const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const data = JSON.parse(cleaned);

  if (!Array.isArray(data.concepts) || !Array.isArray(data.relationships)) {
    throw new Error('AI返回格式不完整');
  }

  const conceptIds = new Set(data.concepts.map((concept) => concept.id));
  data.relationships = data.relationships.filter((relationship) => (
    conceptIds.has(relationship.source) && conceptIds.has(relationship.target)
  ));

  if (!data.agentReport) {
    data.agentReport = {
      summary: `ResearchGraph Agent extracted ${data.concepts.length} concepts and ${data.relationships.length} relationships from the material.`,
      insights: data.concepts.slice(0, 3).map((concept) => `${concept.name} is a key concept in this material.`),
      gaps: ['Review isolated concepts and add missing definitions or examples.'],
      actions: ['Use the graph to explain the material structure, then prepare follow-up questions.']
    };
  }

  return data;
}

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Ontology Note Helper running at http://localhost:${port}`);
  });
}

module.exports = app;
