import { useState, useEffect, useRef } from "react";

import io from "socket.io-client";

import EmojiPicker from "emoji-picker-react";

import "./App.css";

import Sidebar from "./components/Sidebar";
import ChatBox from "./components/ChatBox";

const API = "https://chat-app-r1ts.onrender.com";

function App() {

  const [socket, setSocket] = useState(null);

  const [username, setUsername] = useState("");

  const [target, setTarget] = useState("");

  const [msg, setMsg] = useState("");

  const [chat, setChat] = useState([]);

  const [page, setPage] = useState(0);

  const [connected, setConnected] = useState(false);

  const [showEmoji, setShowEmoji] = useState(false);

  const [typing, setTyping] = useState("");

  const bottomRef = useRef();

  // SOCKET
  useEffect(() => {

    const s = io(API, {
      transports: ["polling"],
      timeout: 20000
    });

    s.on("connect", () => {

      setConnected(true);

    });

    s.on("disconnect", () => {

      setConnected(false);

    });

    // RECEIVE
    s.on("receive_message", (data) => {

      setChat(prev => [

        ...prev,

        data

      ]);

      // SEEN
      s.emit(

        "message_seen",

        {
          messageId: data._id,
          sender: data.from
        }

      );

    });

    // SENT
    s.on("message_sent", (data) => {

      setChat(prev => [

        ...prev,

        data

      ]);

    });

    // SEEN UPDATE
    s.on(

      "message_seen_update",

      (messageId) => {

        setChat(prev =>

          prev.map(msg =>

            msg._id === messageId

              ? {
                  ...msg,
                  seen: true
                }

              : msg

          )

        );

      }

    );

    // TYPING
    s.on("typing", (from) => {

      setTyping(`${from} is typing`);

      setTimeout(() => {

        setTyping("");

      }, 1500);

    });

    setSocket(s);

    return () => s.disconnect();

  }, []);

  // AUTO SCROLL
  useEffect(() => {

    bottomRef.current?.scrollIntoView({
      behavior: "smooth"
    });

  }, [chat]);

  // LOGIN
  const login = () => {

    if (!socket)
      return alert("Socket not ready");

    if (!username)
      return alert("Enter username");

    socket.emit(
      "register_user",
      username
    );

    alert("Logged in");

  };

  // SEND
  const sendMessage = () => {

    if (!msg || !target)
      return;

    socket.emit(

      "send_message",

      {
        to: target,
        from: username,
        text: msg,
        type: "text"
      }

    );

    setMsg("");

  };

  // KEYDOWN
  const handleKeyDown = (e) => {

    socket.emit(

      "typing",

      {
        to: target,
        from: username
      }

    );

    if (e.key === "Enter") {

      sendMessage();

    }

  };

  // EMOJI
  const onEmojiClick = (emojiData) => {

    setMsg(prev =>

      prev + emojiData.emoji

    );

  };

  // FILE
  const uploadFile = async (e) => {

    const file = e.target.files[0];

    if (!file) return;

    const form = new FormData();

    form.append("file", file);

    try {

      const res = await fetch(

        API + "/upload",

        {
          method: "POST",
          body: form,
        }

      );

      const data = await res.json();

      socket.emit(

        "send_message",

        {
          to: target,
          from: username,
          text: data.url,
          type: "image"
        }

      );

    } catch {

      alert("Upload failed");

    }

  };

  // LOAD OLD
  const loadMore = async () => {

    try {

      const res = await fetch(

        `${API}/messages/${username}/${target}?page=${page}`

      );

      const data = await res.json();

      setChat(prev => [

        ...data,

        ...prev

      ]);

      setPage(p => p + 1);

    } catch {

      alert("Failed");

    }

  };

  return (

    <div className="app">

      <Sidebar
        username={username}
        target={target}
      />

      <div className="chatSection">

        {/* TOPBAR */}
        <div className="topbar">

          <input
            placeholder="Your name"
            value={username}
            onChange={e =>
              setUsername(
                e.target.value
              )
            }
          />

          <button onClick={login}>
            Login
          </button>

          <input
            placeholder="Target user"
            value={target}
            onChange={e =>
              setTarget(
                e.target.value
              )
            }
          />

          <button onClick={loadMore}>
            Load Older
          </button>

          <div
            style={{
              marginLeft: "auto",
              color: connected
                ? "#00d4aa"
                : "red"
            }}
          >

            {
              connected
                ? "● Online"
                : "● Offline"
            }

          </div>

        </div>

        {/* CHAT */}
        <ChatBox
          chat={chat}
          username={username}
          bottomRef={bottomRef}
        />

        {/* TYPING */}
        <div className="typingArea">

          {typing && (

            <div className="typingBubble">

              {typing}

              <span>.</span>
              <span>.</span>
              <span>.</span>

            </div>

          )}

        </div>

        {/* INPUT */}
        <div className="inputArea">

          <button
            onClick={() =>
              setShowEmoji(
                !showEmoji
              )
            }
          >
            😊
          </button>

          {showEmoji && (

            <div
              style={{
                position: "absolute",
                bottom: "80px",
                right: "20px",
                zIndex: 1000
              }}
            >

              <EmojiPicker
                onEmojiClick={onEmojiClick}
                theme="dark"
              />

            </div>

          )}

          <input
            value={msg}
            placeholder="Type message"
            onChange={e =>
              setMsg(
                e.target.value
              )
            }
            onKeyDown={handleKeyDown}
          />

          <button onClick={sendMessage}>
            Send
          </button>

          <input
            type="file"
            onChange={uploadFile}
          />

        </div>

      </div>

    </div>

  );

}

export default App;