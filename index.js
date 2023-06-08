const express = require("express");
const port = process.env.PORT || 5000;

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello from home url.");
});

app.listen(port, () => {
  console.log(`Server running. Listening at port ${port}`);
});
