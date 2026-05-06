import Message from "./Message";

function ChatBox({ chat, bottomRef }) {
  return (
    <div className="chatBox">

      {chat.map((c, i) => (

        <Message
          key={i}
          text={c}
          mine={c.startsWith("Me:")}
        />

      ))}

      <div ref={bottomRef} />

    </div>
  );
}

export default ChatBox;