const router = require("express").Router();
const admin = require("firebase-admin");
let data = [];
router.get("/", (req, res) => {
  return res.send("Inside the user router");
});

router.get("/jwtVerification", async (req, res) => {
  if (!req.headers.authorization) {
    return res.status(500).send({ msg: "Token not found" });
  }
  const token = req.headers.authorization.split(" ")[1];
  try {
    const decodeValue = await admin.auth().verifyIdToken(token);
    if (!decodeValue) {
      return res
        .status(500)
        .json({ success: false, msg: "Unauthorized access" });
    }
    return res.status(200).json({ success: true, data: decodeValue });
  } catch (err) {
    return res.send({
      success: false,
      msg: `Error in extracting the token : ${err}`,
    });
  }
});
const listAllUsers = async (nextPageToken) => {
  // List batch of users, 1000 at a time.
  await admin
    .auth()
    .listUsers(1000, nextPageToken)
    .then((listUsersResult) => {
      listUsersResult.users.forEach((userRecord) => {
        console.log("correct");
        data.push(userRecord.toJSON());
      });
      // console.log("user", data);

      if (listUsersResult.pageToken) {
        // List next batch of users.
        listAllUsers(listUsersResult.pageToken);
      }
    })
    .catch((error) => {
      console.log("Error listing users:", error);
    });
};
// Start listing users from the beginning, 1000 at a time.
listAllUsers();

router.get("/all", async (req, res) => {
  console.log("i am awoke");

  listAllUsers();
  try {
    return res.status(200).send({ success: true, data: data });
  } catch (error) {
    return res.send({
      success: false,
      msg: `Error in listing users : ${error}`,
    });
  }
});

module.exports = router;
