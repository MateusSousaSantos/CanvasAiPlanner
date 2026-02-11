/**
 * Abstract AI Provider Interface
 * Makes it easy to switch between OpenAI, Anthropic, or Ollama
 */
class AIProvider {
  constructor() {
    const provider = process.env.AI_PROVIDER || 'openai';
    
    switch (provider.toLowerCase()) {
      case 'openai':
        this.client = new OpenAIProvider();
        break;
      case 'anthropic':
        this.client = new AnthropicProvider();
        break;
      case 'ollama':
        this.client = new OllamaProvider();
        break;
      default:
        throw new Error(`Unknown AI provider: ${provider}`);
    }
  }

  async generateCompletion(systemPrompt, userPrompt) {
    return this.client.generateCompletion(systemPrompt, userPrompt);
  }
}

/**
 * OpenAI Provider Implementation
 */
class OpenAIProvider {
  constructor() {
    import('openai').then(module => {
      this.openai = new module.default({
        apiKey: process.env.OPENAI_API_KEY
      });
    });
  }

  async generateCompletion(systemPrompt, userPrompt) {
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
    });

    return response.choices[0].message.content;
  }
}

/**
 * Anthropic Provider Implementation
 */
class AnthropicProvider {
  async generateCompletion(systemPrompt, userPrompt) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt }
        ]
      })
    });

    const data = await response.json();
    return data.content[0].text;
  }
}

/**
 * Ollama Provider Implementation (Free local models)
 */
class OllamaProvider {
  async generateCompletion(systemPrompt, userPrompt) {
    const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OLLAMA_MODEL || 'llama2',
        prompt: `${systemPrompt}\n\n${userPrompt}`,
        stream: false
      })
    });

    const data = await response.json();
    return data.response;
  }
}

export default AIProvider;
