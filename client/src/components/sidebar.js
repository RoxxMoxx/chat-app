function Sidebar({ username, target }) {
  return (
    <div className="sidebar">

      <h2>Chats</h2>

      <div className="userCard">
        <div className="avatar">
          {target?.charAt(0)?.toUpperCase()}
        </div>

        <div>
          <div>{target || "No user selected"}</div>
          <small>online</small>
        </div>
      </div>

    </div>
  );
}

export default Sidebar;