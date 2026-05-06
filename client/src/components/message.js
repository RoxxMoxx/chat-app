function Message({

  msg,

  mine

}) {

  // SAFETY
  if (!msg) return null;

  const {

    from,

    text,

    type,

    createdAt,

    seen

  } = msg;

  // IMAGE CHECK
  const isImage =

    type === "image";

  // TIME
  const time = createdAt

    ? new Date(createdAt)
        .toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit"
        })

    : "";

  return (

    <div
      className={`message ${
        mine
          ? "me"
          : "them"
      }`}
    >

      {/* SENDER */}
      <strong>

        {mine ? "Me" : from}

      </strong>

      <br />

      {/* IMAGE */}
      {isImage ? (

        <img
          src={text}
          alt=""
        />

      ) : (

        <span>{text}</span>

      )}

      {/* FOOTER */}
      <div
        style={{
          marginTop: "6px",
          fontSize: "12px",
          opacity: 0.7,
          textAlign: "right"
        }}
      >

        {time}

        {/* SEEN */}
        {mine && (
          <>
            {" "}
            {
              seen
                ? "✓✓"
                : "✓"
            }
          </>
        )}

      </div>

    </div>

  );

}

export default Message;