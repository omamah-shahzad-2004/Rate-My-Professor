'use client'

//Importing the required libraries
import { useState } from "react"

export default function Home() {
  //Adding state for managing messages and user input 
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hi! I'm the Rate my Professor support assistant. How can I help you today?`
    }
  ])
  const [message, setMessage] = useState('')

  //Function for handling send messages
  const sendMessage = async() => {
    setMessage('')
    setMessages((messages) => [
      ...messages,
      {role: 'user', content: 'message'},
      {role: 'assistant', content: ''},
    ])

    const response = fetch('/api/chat', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify([...messages, {role: 'user', content: message}]),
    }).then(async(res) => {
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let result = ''

      return reader.read().then(function processText({done, value}) {
        if(done) {
          return result
        }
        const text = decoder.decode(value || new Uint8Array(), {stream: true})
        setMessages((messages) => {
          let lastMessage = messages[messages.length - 1]
          let otherMessages = messages.slice(0, messages.length - 1)
          return[
            ...otherMessages,
            {...lastMessage, content: lastMessage.content + text},
          ]
        })
        return reader.read().then(processText)
      })
    })
  }
}