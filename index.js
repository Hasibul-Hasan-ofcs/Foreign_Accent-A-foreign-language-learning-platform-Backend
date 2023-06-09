const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");
const port = process.env.PORT || 5000;
const dbUsername = process.env.DB_USERNAME;
const dbPassword = process.env.DB_PASSWORD;

const app = express();

//middlewares
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${dbUsername}:${dbPassword}@foreign-accent1.vekvrye.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

    // all collections
    const allUsersCollection = client.db("users").collection("allusers");

    app.post("/users", (req, res) => {
      const userData = req.body;
      const result = allUsersCollection.insertOne(userData);
      res.send(result);
    });
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// app.get("/", (req, res) => {
//   res.send("Hello from home url.");
// });

app.listen(port, () => {
  console.log(`Server running. Listening to port ${port}`);
});
