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

  // ✅ EMOJI STATE
  const [showEmoji, setShowEmoji] = useState(false);

  const bottomRef = useRef();

  // SOCKET
  useEffect(() => {

    console.log("🚀 Connecting...");

    const s = io(API, {
      transports: ["polling"],
      timeout: 20000
    });

    s.on("connect", () => {

      console.log("✅ Connected:", s.id);

      setConnected(true);

    });

    s.on("disconnect", () => {

      console.log("❌ Disconnected");

      setConnected(false);

    });

    s.on("receive_message", (data) => {

      setChat(prev => [

        ...prev,

        `${data.from}: ${data.text}`

      ]);

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

    alert("Logged in as " + username);

  };

  // SEND MESSAGE
  const sendMessage = () => {

    if (!msg || !target)
      return;

    socket.emit(
      "send_message",
      {
        to: target,
        from: username,
        text: msg,
      }
    );

    setChat(prev => [

      ...prev,

      `Me: ${msg}`

    ]);

    setMsg("");

  };

  // ENTER KEY SEND
  const handleKeyDown = (e) => {

    if (e.key === "Enter") {

      sendMessage();

    }

  };

  // ✅ EMOJI CLICK
  const onEmojiClick = (emojiData) => {

    setMsg(prev =>

      prev + emojiData.emoji

    );

  };

  // FILE UPLOAD
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
        }
      );

      setChat(prev => [

        ...prev,

        `Me: ${data.url}`

      ]);

    } catch {

      alert("Upload failed");

    }

  };

  // LOAD OLD MESSAGES
  const loadMore = async () => {

    try {

      const res = await fetch(
        `${API}/messages/${username}/${target}?page=${page}`
      );

      const data = await res.json();

      setChat(prev => [

        ...data.map(
          d => `${d.from}: ${d.text}`
        ),

        ...prev

      ]);

      setPage(p => p + 1);

    } catch {

      alert("Failed to load");

    }

  };

  return (

    <div className="app">

      {/* SIDEBAR */}
      <Sidebar
        username={username}
        target={target}
      />

      {/* MAIN CHAT */}
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

          {/* STATUS */}
          <div
            style={{
              marginLeft: "auto",
              color: connected
                ? "#00d4aa"
                : "red",
              fontWeight: "bold"
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
          bottomRef={bottomRef}
        />

        {/* INPUT AREA */}
        <div className="inputArea">

          {/* EMOJI BUTTON */}
          <button
            onClick={() =>
              setShowEmoji(
                !showEmoji
              )
            }
          >
            😊
          </button>

          {/* EMOJI PICKER */}
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

          {/* MESSAGE INPUT */}
          <input
            value={msg}
            placeholder="Type a message"
            onChange={e =>
              setMsg(
                e.target.value
              )
            }
            onKeyDown={handleKeyDown}
          />

          {/* SEND */}
          <button onClick={sendMessage}>
            Send
          </button>

          {/* FILE */}
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