//Importing the required libraries
import { NextResponse } from "next/server";
import {Pinecone} from '@pinecone-database/pinecone'
const { GoogleGenerativeAI } = require("@google/generative-ai");

//Defining the system prompt
const systemPrompt = `
You are a rate my professor agent to help students find classes, that takes in user questions and answers them.
For every user question, the top 3 professors that match the user question are returned.
Use them to answer the question if needed.
`

//Main function that will handle incoming POST requests
export async function POST(req) {
    const data = req.json()

    //Initializing Pinecone and Gemini
    const pc = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY
    })
    const index = pc.index('rmp-ai-assistant').namespace("ns1")
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});

    //Extracting user's question and creating embedding
    const text = data[data.length - 1].content
    const result = await model.embedContent(text)
    const embedding = result.embedding

    //Querying Pinecone
    const results = await index.query({
        topK: 5,
        includeMetadata: true,
        vector: embedding.values,
    })

    //Formatting the results into a readable string
    let resultString = ''
    results.matches.forEach((match) => {
        resultString += `
            Returned Results:
            Professor: ${match.id}
            Review: ${match.metadata.review}
            Subject: ${match.metadata.subject}
            Stars: ${match.metadata.stars}
        \n\n`
    })

    const lastMessage = data[data.length - 1]
    const lastMessageContent = lastMessage.content + resultString
    const lastDataWithoutLastMessage = data.slice(0, data.length-1)

    //Creating a chat completion request to Gemini
    const completion = await model.startChat({
        history: [
            {role: 'system', content: systemPrompt},
            ...lastDataWithoutLastMessage,
            {role: 'user', content: lastMessageContent},
        ],
    })

    //Handling streaming response
    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder()
            try {
                for await (const chunk of completion) {
                    const content = chunk.content
                    if(content) {
                        const text = encoder.encode(content)
                        controller.enqueue(text)
                    }
                }
            } catch(err) {
                controller.error(err)
            } finally {
                controller.close()
            }
        },
    })
    return new NextResponse(streams)
}