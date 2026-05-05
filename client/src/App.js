import { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import "./App.css";

const API = "https://chat-app-r1ts.onrender.com";

function App() {
  const [socket, setSocket] = useState(null);
  const [username, setUsername] = useState("");
  const [target, setTarget] = useState("");
  const [msg, setMsg] = useState("");
  const [chat, setChat] = useState([]);
  const [page, setPage] = useState(0);

  const bottomRef = useRef();

  // 🔥 DEBUG SOCKET
  useEffect(() => {
    console.log("🚀 Trying to connect...");

    const s = io(API, {
      transports: ["polling"], // FORCE polling (important)
      timeout: 20000
    });

    s.on("connect", () => {
      console.log("✅ CONNECTED:", s.id);
    });

    s.on("connect_error", (err) => {
      console.log("❌ CONNECT ERROR:", err.message);
    });

    s.on("disconnect", () => {
      console.log("⚠️ DISCONNECTED");
    });

    s.on("receive_message", (data) => {
      console.log("📩 MESSAGE:", data);
      setChat(prev => [...prev, `${data.from}: ${data.text}`]);
    });

    setSocket(s);

    return () => s.disconnect();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  const login = () => {
    console.log("👉 Login clicked");

    if (!socket) return alert("Socket not ready");
    if (!username) return alert("Enter username");

    socket.emit("register_user", username);
  };

  const sendMessage = () => {
    console.log("👉 Send clicked");

    if (!msg || !target) return;

    socket.emit("send_message", {
      to: target,
      from: username,
      text: msg,
    });

    setChat(prev => [...prev, `Me: ${msg}`]);
    setMsg("");
  };

  const uploadFile = async (e) => {
    const file = e.target.files[0];

    const form = new FormData();
    form.append("file", file);

    const res = await fetch(API + "/upload", {
      method: "POST",
      body: form,
    });

    const data = await res.json();

    socket.emit("send_message", {
      to: target,
      from: username,
      text: data.url,
    });

    setChat(prev => [...prev, `Me (file): ${data.url}`]);
  };

  const loadMore = async () => {
    const res = await fetch(`${API}/messages/${username}/${target}?page=${page}`);
    const data = await res.json();

    setChat(prev => [...data.map(d => `${d.from}: ${d.text}`), ...prev]);
    setPage(p => p + 1);
  };

  return (
    <div className="center">
      <input placeholder="Your name" onChange={e => setUsername(e.target.value)} />
      <button onClick={login}>Login</button>

      <input placeholder="Target user" onChange={e => setTarget(e.target.value)} />

      <button onClick={loadMore}>Load Older</button>

      <div>
        {chat.map((c, i) => <p key={i}>{c}</p>)}
        <div ref={bottomRef} />
      </div>

      <input value={msg} onChange={e => setMsg(e.target.value)} />
      <button onClick={sendMessage}>Send</button>

      <input type="file" onChange={uploadFile} />
    </div>
  );
}

export default App;