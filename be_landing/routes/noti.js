// import db from "../libs/admin_db.js";

// const sub = db.subscribeQuery(
//   { messages: { $: { limit: 1, order: { serverCreatedAt: "desc" } } } },
//   (payload) => {
//     if (payload.type === "error") {
//       console.log("error", payload);
//       sub.close();
//     } else {
//       console.log("got data!", payload.data);
//     }
//   },
// );
