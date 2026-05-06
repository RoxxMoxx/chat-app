function Message({ text, mine }) {

  // SAFETY
  if (!text) return null;

  // DEFAULT VALUES
  let sender = "";
  let content = text;

  // FIND FIRST ": "
  const firstColon = text.indexOf(": ");

  // SPLIT ONLY IF VALID
  if (firstColon !== -1) {

    sender = text.substring(0, firstColon);

    content = text.substring(firstColon + 2);

  }

  // SAFE IMAGE CHECK
  const isImage =

    typeof content === "string" &&

    content.includes("http") &&

    (
      content.includes(".png") ||
      content.includes(".jpg") ||
      content.includes(".jpeg") ||
      content.includes("cloudinary")
    );

  return (

    <div
      className={`message ${
        mine ? "me" : "them"
      }`}
    >

      {/* SENDER */}
      {sender && (
        <>
          <strong>{sender}: </strong>
          <br />
        </>
      )}

      {/* IMAGE */}
      {isImage ? (

        <img
          src={content}
          alt=""
          style={{
            maxWidth: "250px",
            borderRadius: "10px",
            marginTop: "5px"
          }}
        />

      ) : (

        <span>{content}</span>

      )}

    </div>

  );
}

export default Message;