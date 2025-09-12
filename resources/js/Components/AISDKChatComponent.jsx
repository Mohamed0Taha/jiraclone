import React, { useRef, useEffect, useState } from 'react';import React, { useRef, useEffect, useState } from 'react';import React, { useRef, useEffect, useState } from 'react';import React, { useRef, useEffect, us        try {



export default function AISDKChatComponent({ 

    customViewId = null,

    projectId = null,export default function AISDKChat({             console.log('Sending chat request:', {

    taskIds = null,

    userId = null,    customViewId = null,

    methodology = null

}) {    projectId = null,export default function AISDKChat({                 messages: [...messages, userMessage],

    const messagesEndRef = useRef(null);

    const [messages, setMessages] = useState([]);    taskIds = null,

    const [input, setInput] = useState('');

    const [isLoading, setIsLoading] = useState(false);    userId = null,    customViewId = null,                projectId,

    const [error, setError] = useState(null);

    methodology = null

    const handleInputChange = (e) => {

        setInput(e.target.value);}) {    projectId = null,                customViewId,

    };

    const messagesEndRef = useRef(null);

    return (

        <div className="flex flex-col h-full max-w-2xl mx-auto bg-white border border-gray-200 rounded-lg shadow-sm">        taskIds = null,                methodology

            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">

                <h3 className="text-lg font-semibold text-gray-900">AI Assistant</h3>    const [messages, setMessages] = useState([]);

            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">    const [input, setInput] = useState('');    userId = null,            });

                <div className="text-center text-gray-500 py-8">

                    <p className="text-lg mb-2">👋 Hi there!</p>    const [isLoading, setIsLoading] = useState(false);

                    <p>Ask me anything about your project, tasks, or workflow.</p>

                </div>    const [error, setError] = useState(null);    methodology = null            

            </div>

            <div className="border-t border-gray-200 p-4">

                <form className="flex space-x-2">

                    <input    const handleInputChange = (e) => {}) {            const response = await fetch('/api/chat', {

                        type="text"

                        value={input}        setInput(e.target.value);

                        onChange={handleInputChange}

                        placeholder="Type your message..."    };    const messagesEndRef = useRef(null);                method: 'POST',

                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"

                    />

                    <button

                        type="submit"    const handleSubmit = async (e) => {                    headers: {

                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"

                    >        e.preventDefault();

                        Send

                    </button>        if (!input?.trim() || isLoading) return;    // Manual state management instead of useChat hook                    'Content-Type': 'application/json',

                </form>

            </div>

        </div>

    );        const userMessage = {    const [messages, setMessages] = useState([]);                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',

}
            id: Date.now().toString(),

            role: 'user',    const [input, setInput] = useState('');                },

            content: input.trim(),

            createdAt: new Date().toISOString()    const [isLoading, setIsLoading] = useState(false);                body: JSON.stringify({

        };

    const [error, setError] = useState(null);                    messages: [...messages, userMessage],

        setMessages(prev => [...prev, userMessage]);

        setInput('');                    customViewId,

        setIsLoading(true);

        setError(null);    const handleInputChange = (e) => {                    projectId,



        try {        setInput(e.target.value);                    taskIds,

            const response = await fetch('/api/chat', {

                method: 'POST',    };                    userId,

                headers: {

                    'Content-Type': 'application/json',                    methodology

                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',

                },    const handleSubmit = async (e) => {                }),

                body: JSON.stringify({

                    messages: [...messages, userMessage],        e.preventDefault();            });eact';

                    customViewId,

                    projectId,        if (!input?.trim() || isLoading) return;

                    taskIds,

                    userId,export default function AISDKChat({ 

                    methodology

                }),        const userMessage = {    customViewId = null,

            });

            id: Date.now().toString(),    projectId = null,

            if (!response.ok) {

                throw new Error('HTTP error! status: ' + response.status);            role: 'user',    taskIds = null,

            }

            content: input.trim(),    userId = null,

            const assistantMessage = {

                id: (Date.now() + 1).toString(),            createdAt: new Date().toISOString()    methodology = null

                role: 'assistant',

                content: '',        };}) {

                createdAt: new Date().toISOString()

            };    const messagesEndRef = useRef(null);



            setMessages(prev => [...prev, assistantMessage]);        setMessages(prev => [...prev, userMessage]);    



            const reader = response.body?.getReader();        setInput('');    // Manual state management instead of useChat hook

            const decoder = new TextDecoder();

        setIsLoading(true);    const [messages, setMessages] = useState([]);

            if (reader) {

                try {        setError(null);    const [input, setInput] = useState('');

                    while (true) {

                        const { value, done } = await reader.read();    const [isLoading, setIsLoading] = useState(false);

                        if (done) break;

        try {    const [error, setError] = useState(null);

                        const chunk = decoder.decode(value);

                        const lines = chunk.split('\\n');            console.log('Sending chat request:', {



                        for (const line of lines) {                messages: [...messages, userMessage],    const handleInputChange = (e) => {

                            if (line.trim()) {

                                console.log('Received chunk:', line);                projectId,        setInput(e.target.value);

                                

                                if (line.startsWith('data: ')) {                customViewId,    };

                                    const dataStr = line.slice(6);

                                                    methodology

                                    if (dataStr === '[DONE]') {

                                        console.log('Stream completed');            });    const handleSubmit = async (e) => {

                                        break;

                                    }                    e.preventDefault();

                                    

                                    try {            const response = await fetch('/api/chat', {        if (!input?.trim() || isLoading) return;

                                        const data = JSON.parse(dataStr);

                                        console.log('Parsed message:', data);                method: 'POST',

                                        

                                        if (data.role === 'assistant' && data.content) {                headers: {        const userMessage = {

                                            setMessages(prev => {

                                                const newMessages = [...prev];                    'Content-Type': 'application/json',            id: Date.now().toString(),

                                                const lastMessage = newMessages[newMessages.length - 1];

                                                if (lastMessage && lastMessage.role === 'assistant') {                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',            role: 'user',

                                                    lastMessage.content = data.content;

                                                    lastMessage.id = data.id;                },            content: input.trim(),

                                                    lastMessage.createdAt = data.createdAt;

                                                                    body: JSON.stringify({            createdAt: new Date().toISOString()

                                                    if (data.experimental_data) {

                                                        lastMessage.experimental_data = data.experimental_data;                    messages: [...messages, userMessage],        };

                                                    }

                                                }                    customViewId,

                                                return newMessages;

                                            });                    projectId,        setMessages(prev => [...prev, userMessage]);

                                        }

                                    } catch (parseError) {                    taskIds,        setInput('');

                                        console.warn('Failed to parse SSE data:', parseError, dataStr);

                                    }                    userId,        setIsLoading(true);

                                }

                            }                    methodology        setError(null);

                        }

                    }                }),

                } catch (streamError) {

                    console.error('Streaming error:', streamError);            });        try {

                    setError(streamError);

                }            const response = await fetch('/api/chat', {

            }

        } catch (fetchError) {            if (!response.ok) {                method: 'POST',

            console.error('Chat API error:', fetchError);

            setError(fetchError);                throw new Error(`HTTP error! status: ${response.status}`);                headers: {

        } finally {

            setIsLoading(false);            }                    'Content-Type': 'application/json',

        }

    };                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',



    const handleTestMessage = () => {            const assistantMessage = {                },

        setInput('Hello! Can you help me understand this project?');

    };                id: (Date.now() + 1).toString(),                body: JSON.stringify({



    const clearMessages = () => {                role: 'assistant',                    messages: [...messages, userMessage],

        setMessages([]);

        setError(null);                content: '',                    customViewId,

    };

                createdAt: new Date().toISOString()                    projectId,

    const scrollToBottom = () => {

        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });            };                    taskIds,

    };

                    userId,

    useEffect(() => {

        scrollToBottom();            setMessages(prev => [...prev, assistantMessage]);                    methodology

    }, [messages]);

                })

    const handleFormSubmit = (e) => {

        e.preventDefault();            const reader = response.body?.getReader();            });

        if (!input?.trim() || isLoading) return;

        handleSubmit(e);            const decoder = new TextDecoder();

    };

            if (!response.ok) {

    return (

        React.createElement('div', { className: "flex flex-col h-full max-w-2xl mx-auto bg-white border border-gray-200 rounded-lg shadow-sm" },            if (reader) {                throw new Error(`HTTP error! status: ${response.status}`);

            React.createElement('div', { className: "flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg" },

                React.createElement('h3', { className: "text-lg font-semibold text-gray-900" }, "AI Assistant"),                try {            }

                React.createElement('div', { className: "flex items-center space-x-2" },

                    isLoading && React.createElement('div', { className: "animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" }),                    while (true) {

                    React.createElement('button', {

                        onClick: handleTestMessage,                        const { value, done } = await reader.read();            const assistantMessage = {

                        disabled: isLoading,

                        className: "text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"                        if (done) break;                id: (Date.now() + 1).toString(),

                    }, "Test Chat"),

                    messages.length > 0 && React.createElement('button', {                role: 'assistant',

                        onClick: clearMessages,

                        disabled: isLoading,                        const chunk = decoder.decode(value);                content: '',

                        className: "text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"

                    }, "Clear")                        const lines = chunk.split('\n');                createdAt: new Date().toISOString()

                )

            ),            };

            React.createElement('div', { className: "flex-1 overflow-y-auto p-4 space-y-4 min-h-0" },

                messages.length === 0 && React.createElement('div', { className: "text-center text-gray-500 py-8" },                        for (const line of lines) {

                    React.createElement('p', { className: "text-lg mb-2" }, "👋 Hi there!"),

                    React.createElement('p', null, "Ask me anything about your project, tasks, or workflow.")                            if (line.trim()) {            setMessages(prev => [...prev, assistantMessage]);

                ),

                messages.map((message, index) =>                                 console.log('Received chunk:', line); // Debug logging

                    React.createElement('div', {

                        key: message.id || index,                                            const reader = response.body?.getReader();

                        className: 'flex ' + (message.role === 'user' ? 'justify-end' : 'justify-start')

                    },                                if (line.startsWith('data: ')) {            const decoder = new TextDecoder();

                        React.createElement('div', {

                            className: 'max-w-xs lg:max-w-md px-4 py-2 rounded-lg ' + (                                    const dataStr = line.slice(6);

                                message.role === 'user'

                                    ? 'bg-blue-600 text-white'                                                if (reader) {

                                    : 'bg-gray-100 text-gray-900'

                            )                                    // Check for completion signal                try {

                        },

                            React.createElement('div', { className: "text-sm whitespace-pre-wrap" }, message.content),                                    if (dataStr === '[DONE]') {                    while (true) {

                            message.createdAt && React.createElement('div', {

                                className: 'text-xs mt-1 ' + (message.role === 'user' ? 'text-blue-200' : 'text-gray-500')                                        console.log('Stream completed');                        const { value, done } = await reader.read();

                            }, new Date(message.createdAt).toLocaleTimeString())

                        )                                        break;                        if (done) break;

                    )

                ),                                    }

                error && React.createElement('div', { className: "bg-red-50 border border-red-200 rounded-lg p-4" },

                    React.createElement('div', { className: "flex" },                                                            const chunk = decoder.decode(value);

                        React.createElement('div', { className: "text-red-800" },

                            React.createElement('p', { className: "font-medium" }, "Chat Error"),                                    try {                        const lines = chunk.split('\n');

                            React.createElement('p', { className: "text-sm mt-1" }, error.message)

                        )                                        const data = JSON.parse(dataStr);

                    )

                ),                                        console.log('Parsed message:', data);                        for (const line of lines) {

                React.createElement('div', { ref: messagesEndRef })

            ),                                                                    if (line.trim()) {

            React.createElement('div', { className: "border-t border-gray-200 p-4" },

                React.createElement('form', { onSubmit: handleFormSubmit, className: "flex space-x-2" },                                        // Replace the placeholder assistant message with the complete response                                console.log('Received chunk:', line); // Debug logging

                    React.createElement('input', {

                        type: "text",                                        if (data.role === 'assistant' && data.content) {                                

                        value: input || '',

                        onChange: handleInputChange,                                            setMessages(prev => {                                if (line.startsWith('data: ')) {

                        placeholder: "Type your message...",

                        disabled: isLoading,                                                const newMessages = [...prev];                                    const dataStr = line.slice(6);

                        className: "flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"

                    }),                                                const lastMessage = newMessages[newMessages.length - 1];                                    

                    React.createElement('button', {

                        type: "submit",                                                if (lastMessage && lastMessage.role === 'assistant') {                                    // Check for completion signal

                        disabled: isLoading || !input?.trim(),

                        className: "bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"                                                    lastMessage.content = data.content;                                    if (dataStr === '[DONE]') {

                    },

                        isLoading ? React.createElement('div', { className: "animate-spin rounded-full h-4 w-4 border-b-2 border-white" }) : 'Send'                                                    lastMessage.id = data.id;                                        console.log('Stream completed');

                    )

                )                                                    lastMessage.createdAt = data.createdAt;                                        break;

            ),

            process.env.NODE_ENV === 'development' && React.createElement('div', { className: "bg-gray-50 border-t border-gray-200 p-2 text-xs text-gray-600" },                                                                                        }

                React.createElement('div', { className: "flex flex-wrap gap-2" },

                    React.createElement('span', null, 'Messages: ' + messages.length),                                                    // Store component data if available                                    

                    React.createElement('span', null, 'Loading: ' + (isLoading ? 'Yes' : 'No')),

                    customViewId && React.createElement('span', null, 'View: ' + customViewId),                                                    if (data.experimental_data) {                                    try {

                    projectId && React.createElement('span', null, 'Project: ' + projectId),

                    error && React.createElement('span', { className: "text-red-600" }, 'Error: ' + error.message)                                                        lastMessage.experimental_data = data.experimental_data;                                        const data = JSON.parse(dataStr);

                )

            )                                                    }                                        console.log('Parsed message:', data);

        )

    );                                                }                                        

}
                                                return newMessages;                                        // Replace the placeholder assistant message with the complete response

                                            });                                        if (data.role === 'assistant' && data.content) {

                                        }                                            setMessages(prev => {

                                    } catch (parseError) {                                                const newMessages = [...prev];

                                        console.warn('Failed to parse SSE data:', parseError, dataStr);                                                const lastMessage = newMessages[newMessages.length - 1];

                                    }                                                if (lastMessage && lastMessage.role === 'assistant') {

                                }                                                    lastMessage.content = data.content;

                            }                                                    lastMessage.id = data.id;

                        }                                                    lastMessage.createdAt = data.createdAt;

                    }                                                    

                } catch (streamError) {                                                    // Store component data if available

                    console.error('Streaming error:', streamError);                                                    if (data.experimental_data) {

                    setError(streamError);                                                        lastMessage.experimental_data = data.experimental_data;

                }                                                    }

            }                                                }

        } catch (fetchError) {                                                return newMessages;

            console.error('Chat API error:', fetchError);                                            });

            setError(fetchError);                                        }

        } finally {                                    } catch (parseError) {

            setIsLoading(false);                                        console.warn('Failed to parse SSE data:', parseError, dataStr);

        }                                    }

    };                                }

                            }

    const handleTestMessage = () => {                        }

        setInput('Hello! Can you help me understand this project?');                    }

    };                } catch (streamError) {

                    console.error('Streaming error:', streamError);

    const clearMessages = () => {                    setError(streamError);

        setMessages([]);                }

        setError(null);            }

    };        } catch (fetchError) {

            console.error('Chat API error:', fetchError);

    const scrollToBottom = () => {            setError(fetchError);

        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });        } finally {

    };            setIsLoading(false);

        }

    useEffect(() => {    };

        scrollToBottom();

    }, [messages]);    const handleTestMessage = () => {

        setInput('Hello! Can you help me understand this project?');

    const handleFormSubmit = (e) => {    };

        e.preventDefault();

        if (!input?.trim() || isLoading) return;    const clearMessages = () => {

        handleSubmit(e);        setMessages([]);

    };        setError(null);

    };

    return (

        <div className="flex flex-col h-full max-w-2xl mx-auto bg-white border border-gray-200 rounded-lg shadow-sm">    const scrollToBottom = () => {

            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

                <h3 className="text-lg font-semibold text-gray-900">    };

                    AI Assistant

                </h3>    useEffect(() => {

                <div className="flex items-center space-x-2">        scrollToBottom();

                    {isLoading && (    }, [messages]);

                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>

                    )}    const handleFormSubmit = (e) => {

                    <button        e.preventDefault();

                        onClick={handleTestMessage}        if (!input?.trim() || isLoading) return;

                        disabled={isLoading}        handleSubmit(e);

                        className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"    };

                    >

                        Test Chat    return (

                    </button>        <div className="flex flex-col h-full max-w-2xl mx-auto bg-white border border-gray-200 rounded-lg shadow-sm">

                    {messages.length > 0 && (            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">

                        <button                <h3 className="text-lg font-semibold text-gray-900">

                            onClick={clearMessages}                    AI Assistant

                            disabled={isLoading}                </h3>

                            className="text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"                <div className="flex items-center space-x-2">

                        >                    {isLoading && (

                            Clear                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>

                        </button>                    )}

                    )}                    <button

                </div>                        onClick={handleTestMessage}

            </div>                        disabled={isLoading}

                        className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"

            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">                    >

                {messages.length === 0 && (                        Test Chat

                    <div className="text-center text-gray-500 py-8">                    </button>

                        <p className="text-lg mb-2">👋 Hi there!</p>                    {messages.length > 0 && (

                        <p>Ask me anything about your project, tasks, or workflow.</p>                        <button

                    </div>                            onClick={clearMessages}

                )}                            disabled={isLoading}

                            className="text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"

                {messages.map((message, index) => (                        >

                    <div                            Clear

                        key={message.id || index}                        </button>

                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}                    )}

                    >                </div>

                        <div            </div>

                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${

                                message.role === 'user'            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">

                                    ? 'bg-blue-600 text-white'                {messages.length === 0 && (

                                    : 'bg-gray-100 text-gray-900'                    <div className="text-center text-gray-500 py-8">

                            }`}                        <p className="text-lg mb-2">👋 Hi there!</p>

                        >                        <p>Ask me anything about your project, tasks, or workflow.</p>

                            <div className="text-sm whitespace-pre-wrap">                    </div>

                                {message.content}                )}

                            </div>

                            {message.createdAt && (                {messages.map((message, index) => (

                                <div className={`text-xs mt-1 ${                    <div

                                    message.role === 'user' ? 'text-blue-200' : 'text-gray-500'                        key={message.id || index}

                                }`}>                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}

                                    {new Date(message.createdAt).toLocaleTimeString()}                    >

                                </div>                        <div

                            )}                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${

                        </div>                                message.role === 'user'

                    </div>                                    ? 'bg-blue-600 text-white'

                ))}                                    : 'bg-gray-100 text-gray-900'

                            }`}

                {error && (                        >

                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">                            <div className="text-sm whitespace-pre-wrap">

                        <div className="flex">                                {message.content}

                            <div className="text-red-800">                            </div>

                                <p className="font-medium">Chat Error</p>                            {message.createdAt && (

                                <p className="text-sm mt-1">{error.message}</p>                                <div className={`text-xs mt-1 ${

                            </div>                                    message.role === 'user' ? 'text-blue-200' : 'text-gray-500'

                        </div>                                }`}>

                    </div>                                    {new Date(message.createdAt).toLocaleTimeString()}

                )}                                </div>

                            )}

                <div ref={messagesEndRef} />                        </div>

            </div>                    </div>

                ))}

            <div className="border-t border-gray-200 p-4">

                <form onSubmit={handleFormSubmit} className="flex space-x-2">                {error && (

                    <input                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">

                        type="text"                        <div className="flex">

                        value={input || ''}                            <div className="text-red-800">

                        onChange={handleInputChange}                                <p className="font-medium">Chat Error</p>

                        placeholder="Type your message..."                                <p className="text-sm mt-1">{error.message}</p>

                        disabled={isLoading}                            </div>

                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"                        </div>

                    />                    </div>

                    <button                )}

                        type="submit"

                        disabled={isLoading || !input?.trim()}                <div ref={messagesEndRef} />

                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"            </div>

                    >

                        {isLoading ? (            <div className="border-t border-gray-200 p-4">

                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>                <form onSubmit={handleFormSubmit} className="flex space-x-2">

                        ) : (                    <input

                            'Send'                        type="text"

                        )}                        value={input || ''}

                    </button>                        onChange={handleInputChange}

                </form>                        placeholder="Type your message..."

            </div>                        disabled={isLoading}

                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"

            {process.env.NODE_ENV === 'development' && (                    />

                <div className="bg-gray-50 border-t border-gray-200 p-2 text-xs text-gray-600">                    <button

                    <div className="flex flex-wrap gap-2">                        type="submit"

                        <span>Messages: {messages.length}</span>                        disabled={isLoading || !input?.trim()}

                        <span>Loading: {isLoading ? 'Yes' : 'No'}</span>                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"

                        {customViewId && <span>View: {customViewId}</span>}                    >

                        {projectId && <span>Project: {projectId}</span>}                        {isLoading ? (

                        {error && <span className="text-red-600">Error: {error.message}</span>}                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>

                    </div>                        ) : (

                </div>                            'Send'

            )}                        )}

        </div>                    </button>

    );                </form>

}            </div>

            {process.env.NODE_ENV === 'development' && (
                <div className="bg-gray-50 border-t border-gray-200 p-2 text-xs text-gray-600">
                    <div className="flex flex-wrap gap-2">
                        <span>Messages: {messages.length}</span>
                        <span>Loading: {isLoading ? 'Yes' : 'No'}</span>
                        {customViewId && <span>View: {customViewId}</span>}
                        {projectId && <span>Project: {projectId}</span>}
                        {error && <span className="text-red-600">Error: {error.message}</span>}
                    </div>
                </div>
            )}
        </div>
    );
}