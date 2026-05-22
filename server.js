const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(__dirname));

const systemPrompt = `你是一个本体论构建专家。请分析用户提供的文本，提取其中的核心概念和它们之间的关系。

请严格按照以下JSON格式返回结果，不要包含任何其他文字：
{
  "concepts": [
    {
      "id": "唯一标识符",
      "name": "概念名称",
      "definition": "概念的简要定义（从文本中提取或推断）",
      "importance": 1-5之间的数字（5表示最重要的核心概念）,
      "category": "概念所属类别"
    }
  ],
  "relationships": [
    {
      "source": "源概念的id",
      "target": "目标概念的id",
      "relationship": "关系类型（如：是一种、包含、应用于、基于、相关于等）",
      "description": "关系的简要说明"
    }
  ]
}

要求：
1. 提取5-15个最重要的概念
2. 概念之间的关系要准确、有意义
3. importance评分：核心主题5分，重要子概念3-4分，普通概念1-2分
4. 确保所有relationship的source和target都对应concepts中存在的id
5. id只能使用小写英文、数字和下划线`;

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

    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: '服务端未配置 API_KEY' });
    }

    const provider = process.env.API_PROVIDER || 'deepseek';
    const apiBaseUrl = process.env.API_BASE_URL || 'https://api.deepseek.com';
    const modelName = process.env.MODEL_NAME || 'deepseek-chat';

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

  return data;
}

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Ontology Note Helper running at http://localhost:${port}`);
  });
}

module.exports = app;
