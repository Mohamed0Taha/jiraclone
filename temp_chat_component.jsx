export default function ChatApp() {
    // Use the safe data initialization pattern
    const [chatData, setChatData] = useEmbeddedData("chat-messages", { messages: [] });
    const messages = chatData?.messages || [];

    // Input state for new messages
    const [newMessage, setNewMessage] = useState("");

    const addMessage = () => {
        if (!newMessage.trim()) return;

        const message = {
            id: Date.now(),
            text: newMessage.trim(),
            author: "theaceitsme",
            timestamp: new Date().toLocaleString()
        };

        const updatedData = {
            ...chatData,
            messages: [...messages, message],
            lastUpdated: new Date().toISOString()
        };

        setChatData(updatedData);
        setNewMessage("");
    };

    const deleteMessage = (messageId) => {
        const updatedData = {
            ...chatData,
            messages: messages.filter(msg => msg.id !== messageId),
            lastUpdated: new Date().toISOString()
        };
        setChatData(updatedData);
    };

    return (
        <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
            <h2 style={{ marginBottom: "20px", color: "#333" }}>Team Chat</h2>

            <div style={{
                border: "1px solid #ddd",
                borderRadius: "8px",
                padding: "15px",
                minHeight: "300px",
                backgroundColor: "#f9f9f9",
                marginBottom: "15px"
            }}>
                {messages.length === 0 ? (
                    <p style={{ color: "#666", fontStyle: "italic" }}>No messages yet. Start the conversation!</p>
                ) : (
                    messages.map(msg => (
                        <div key={msg.id} style={{
                            marginBottom: "10px",
                            padding: "10px",
                            backgroundColor: "white",
                            borderRadius: "5px",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
                        }}>
                            <div style={{ fontWeight: "bold", color: "#2563eb", marginBottom: "5px" }}>
                                {msg.author}
                            </div>
                            <div style={{ marginBottom: "5px" }}>{msg.text}</div>
                            <div style={{
                                fontSize: "12px",
                                color: "#666",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center"
                            }}>
                                <span>{msg.timestamp}</span>
                                <button
                                    onClick={() => deleteMessage(msg.id)}
                                    style={{
                                        color: "#dc2626",
                                        background: "none",
                                        border: "none",
                                        cursor: "pointer",
                                        fontSize: "12px"
                                    }}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && addMessage()}
                    placeholder="Type your message..."
                    style={{
                        flex: 1,
                        padding: "10px",
                        border: "1px solid #ddd",
                        borderRadius: "5px",
                        fontSize: "14px"
                    }}
                />
                <button
                    onClick={addMessage}
                    style={{
                        padding: "10px 20px",
                        backgroundColor: "#2563eb",
                        color: "white",
                        border: "none",
                        borderRadius: "5px",
                        cursor: "pointer",
                        fontSize: "14px"
                    }}
                >
                    Send
                </button>
            </div>

            <div style={{ marginTop: "15px", fontSize: "12px", color: "#666" }}>
                Messages: {messages.length} | Last updated: {chatData?.lastUpdated || "Never"}
            </div>
        </div>
    );
}