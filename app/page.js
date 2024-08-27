'use client'

import { useState, useEffect, useRef } from "react";
import { Button } from "@nextui-org/react";
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css'; 

const TypewriterEffect = ({ content }) => {

  const [displayedContent, setDisplayedContent] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => 
    
  {
  
    if (currentIndex < content.length) 
    
    {
      const timer = setTimeout(() => 
        
      {
        setDisplayedContent(prevContent => prevContent + content[currentIndex]);
        setCurrentIndex(prevIndex => prevIndex + 1);
      }, 10);

      return () => clearTimeout(timer);
    }
  }, [content, currentIndex]);

  return <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{displayedContent}</ReactMarkdown>;
};

export default function Home() 

{

  const [messages, setMessages] = useState([{ role: 'assistant', content: 'Hi there! I\'\m AJM, your coding expert. I\'\m here to help you with any programming questions or challenges you have. Just let me know what you need assistance with, and we\'\ll solve it together! What can I help you with today?' }]);
  const [userPrompt, setUserPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); };

  useEffect(scrollToBottom, [messages]);

  const sendPrompt = async () => 
  {
    if (userPrompt === '' || isLoading) return;
  
    setIsLoading(true);
    setUserPrompt('');
    setMessages((messages) => [...messages, { role: 'user', content: userPrompt }, { role: 'assistant', content: '' }]);

    const response = await fetch('/api/chat', 
    
    {
      method: 'POST',
      body: JSON.stringify([...messages, { role: 'user', content: userPrompt }]),
      headers: { 'Content-Type': 'application/json' }
    
    }).then(async (res) => 
      
    {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let result = '';

      return reader.read().then(function processText({ done, value }) 
      
      {
        if (done) 
       
        {
          setIsLoading(false);
          return result;
        }
       
        const txt = decoder.decode(value || new Uint8Array(), { stream: true });
       
        setMessages((messages) => 
          
        {
        
          let lastMsg = messages[messages.length - 1];
          let otherMsgs = messages.slice(0, messages.length - 1);
        
          return [...otherMsgs, { ...lastMsg, content: lastMsg.content + txt }];
        
        });
        
        return reader.read().then(processText);
      
      });
    });
  };

  const handleKeyPress = (e) => 
    
  {
    if (e.key === 'Enter' && !e.shiftKey) 
    
    {
      e.preventDefault();
      sendPrompt();
    }
  };

  return (

    <div>

      <div className="heading">
        <h1><span class="circle"></span> Code Assistant</h1>
      </div>

      <div className="chat-container">
      
        <div className="messages-container">
      
          {messages.map((message, index) => (
      
            <div key={index} className={`message ${message.role}`}>
      
              <div className="message-content">
                {message.role === 'assistant' ? (
                  <TypewriterEffect content={message.content} />
                ) : (
                  <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{message.content}</ReactMarkdown>
                )}
              </div>
      
            </div>
          ))}
      
          <div ref={messagesEndRef} />
      
        </div>
      
        <div className="input-container">
      
          <input className="message-input" placeholder="Ask me anything" value={userPrompt} onChange={(e) => setUserPrompt(e.target.value)} onKeyPress={handleKeyPress} disabled={isLoading} aria-label="Chat input" />
          <Button auto color="primary" onClick={sendPrompt} disabled={userPrompt === '' || isLoading} aria-label="Send">↩</Button>
      
        </div>
      
      </div>

    </div>
  );
}