import Message from "./Message";

function ChatBox({

  chat,

  username,

  bottomRef

}) {

  return (

    <div className="chatBox">

      {

        chat.map((msg, i) => (

          <Message

            key={msg._id || i}

            msg={msg}

            mine={

              msg.from === username

            }

          />

        ))

      }

      <div ref={bottomRef} />

    </div>

  );

}

export default ChatBox;