import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function testAPI() {
  try {
    console.log('Testing OpenAI API connection...');
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: "Say hello in exactly 5 words."
        }
      ],
      max_tokens: 50
    });
    
    console.log('SUCCESS:', response.choices[0].message.content);
  } catch (error) {
    console.log('ERROR:', error.message);
    console.log('Status:', error.status);
    console.log('Code:', error.code);
    console.log('Type:', error.type);
  }
}

testAPI();