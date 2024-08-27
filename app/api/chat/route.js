import { NextResponse } from 'next/server'
import { Pinecone } from '@pinecone-database/pinecone'
import OpenAI from 'openai'
import fetch from 'node-fetch'


const sysPrompt = `
You are a rate my professor agent to help students find classes, that takes in user questions and answers them.
For every user question, the top 3 professors that match the user question are returned.
Use them to answer the question if needed.
`

async function query(data) {
    const response = await fetch(
        "https://api-inference.huggingface.co/models/mixedbread-ai/mxbai-embed-large-v1",
        {
            headers: {
                Authorization: `Bearer ${process.env.NEXT_PUBLIC_HF_ACCESS_TOKEN}`,
                "Content-Type": "application/json",
            },
            method: "POST",
            body: JSON.stringify(data),
        }
    );
    const result = await response.json();
    console.log("API Response:", result); // Debug log
    return result;
}

export async function POST(req)
{
    const data = await req.json()

    const pc = new Pinecone({
        apiKey: process.env.NEXT_PUBLIC_PINECONE_API_KEY,
      })
    
    const index = pc.index('rag').namespace('ns1')

    const openai = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: process.env.NEXT_PUBLIC_OPENROUTER_API_KEY,
      })


    const text = data[data.length - 1].content
    const embedding = await query({ "inputs": text });

    const results = await index.query({
        topK: 5,
        includeMetadata: true,
        vector: embedding.data[0].embedding,
      })

    let resultString = ''
    results.matches.forEach((match) => {
    resultString += `
    Returned Results:
    Professor: ${match.id}
    Department: ${match.department}
    Review: ${match.metadata.stars}
    Courses: ${match.metadata.courses}
    Stars: ${match.metadata.stars}
    \n\n`
    })

    const lastMessage = data[data.length - 1]
    const lastMessageContent = lastMessage.content + resultString
    const lastDataWithoutLastMessage = data.slice(0, data.length - 1)

    const completion = await openai.chat.completions.create({
        model: "nousresearch/hermes-3-llama-3.1-405b:extended",
        messages: [
            { role: "system", content: sysPrompt }, 
            ...lastDataWithoutLastMessage,
            {role: 'user', content: lastMessageContent}, ],
        stream: true, 
        })

    const encoder = new TextEncoder(); 

    const stream = new ReadableStream({
        async start(controller){
            try {
                for await (const chunk of completion)
                {
                    const content = chunk.choices[0]?.delta?.content
                    
                    if (content)
                    {
                        controller.enqueue(encoder.encode(content))   
                    }
                }
            }
            catch (err)
            {
                controller.error(err)
            }
            finally
            {
                controller.close()
            }
        }
    })

    return new NextResponse(stream)
} 
