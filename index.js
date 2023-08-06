const express = require("express");
const cors = require("cors");
require("dotenv").config();
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;
const dbUsername = process.env.DB_USERNAME;
const dbPassword = process.env.DB_PASSWORD;

const app = express();

//middlewares
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  // console.log("inside verifyJWT", req.query, authorization, "closing");
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }
  // bearer token
  const token = authorization.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

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
    // client.connect();
    // Send a ping to confirm a successful connection
    // client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

    // all collections
    const allUsersCollection = client.db("users").collection("allusers");
    const allClassesCollection = client.db("classes").collection("allclasses");
    const userClassesCollection = client
      .db("classes")
      .collection("userclasses");
    const userPaymentCollection = client
      .db("classes")
      .collection("userpayments");
    const allInstructorsCollection = client
      .db("users")
      .collection("allInstructors");

    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      // console.log("hitting", token);
      res.send({ token });
    });

    const verifyUser = async (req, res, next) => {
      console.log("inside verifyuser");
      const email = req.decoded.email;
      const query = { email: email };
      const user = await allUsersCollection.findOne(query);
      if (user?.role !== undefined) {
        return res
          .status(403)
          .send({ error: true, message: "forbidden message" });
      }
      next();
    };

    const verifyInstructor = async (req, res, next) => {
      console.log("inside verify Instructor");
      const email = req.decoded.email;
      const query = { email: email };
      const user = await allUsersCollection.findOne(query);
      if (user?.role !== "instructor") {
        return res
          .status(403)
          .send({ error: true, message: "forbidden message" });
      }
      next();
    };

    const verifyAdmin = async (req, res, next) => {
      console.log("inside verify admin");
      const email = req.decoded.email;
      const query = { email: email };
      const user = await allUsersCollection.findOne(query);
      if (user?.role !== "admin") {
        return res
          .status(403)
          .send({ error: true, message: "forbidden message" });
      }
      next();
    };

    // const verifyAdmin = async (req, res, next) => {
    //   const email = req.decoded.email;
    //   const query = { email: email }
    //   const user = await allUsersCollection.findOne(query);
    //   if (user?.role !== 'admin') {
    //     return res.status(403).send({ error: true, message: 'forbidden message' });
    //   }
    //   next();
    // }

    // ROLE CHECK
    app.get("/users/user/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ admin: false });
      }

      const query = { email: email };
      const user = await allUsersCollection.findOne(query);
      const result = { user: user?.role === undefined };
      res.send(result);
    });

    // Instructor check
    app.get("/users/instructor/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ admin: false });
      }

      const query = { email: email }; //instructor
      const user = await allUsersCollection.findOne(query);
      const result = { user: user?.role === "instructor" };
      res.send(result);
    });

    // Admin check
    app.get("/users/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ admin: false });
      }

      const query = { email: email }; //admin
      const user = await allUsersCollection.findOne(query);
      const result = { user: user?.role === "admin" };
      res.send(result);
    });

    /*BASE URL */
    app.get("/", (req, res) => {
      res.send("Hello from home url.");
    });

    app.get("/classes", async (req, res) => {
      if (req?.query?.status == "all") {
        const result = await allClassesCollection
          .find()
          .sort({ students: -1 })
          .toArray();

        console.log("hitting all");
        res.send(result);
      } else if (req.query.limit) {
        const result = await allClassesCollection
          .find({ status: "approved" })
          .sort({ students: -1 })
          .limit(8)
          .toArray();

        console.log("hitting");
        res.send(result);
      } else {
        const result = await allClassesCollection
          .find({ status: "approved" })
          .sort({ students: -1 })
          .toArray();

        console.log("hitting no limit");
        res.send(result);
      }
    });

    app.get("/instructors", async (req, res) => {
      if (req.query.limit) {
        const result = await allInstructorsCollection
          .find()
          .sort({ students: -1 })
          .limit(8)
          .toArray();

        console.log("hitting instr");
        res.send(result);
      } else {
        const result = await allInstructorsCollection
          .find()
          .sort({ students: -1 })
          .toArray();

        console.log("hitting no limit instr");
        res.send(result);
      }
    });

    app.post("/users", async (req, res) => {
      const userData = req.body;
      // Check if the user already exists in the database
      const userExists = await allUsersCollection.findOne({
        email: userData.email,
      });

      // If the user does not exist, insert them into the database
      if (!userExists) {
        const result = await allUsersCollection.insertOne(userData);
        res.send(result);
      } else {
        res.send({ response: "user already exists." });
        // console.log("user already exists.");
      }
    });

    app.get("/users", async (req, res) => {
      const email = req.query.email;
      const query = { email };
      const result = await allUsersCollection.findOne(query);
      res.send(result);
    });

    /*ADMIN MANAGEMENT ROUTE */

    app.get("/admin/allusers", verifyJWT, verifyAdmin, async (req, res) => {
      const result = await allUsersCollection.find().toArray();
      res.send(result);
    });

    app.patch(
      "/dashboard/admin/manage-users/:id/:role",
      verifyJWT,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const role = req.params.role;
        const filter = {
          _id: new ObjectId(id),
        };

        if (role === "admin") {
          const update = {
            $set: {
              role: "admin",
            },
          };

          const updateRole = await allUsersCollection.updateOne(filter, update);
          console.log(updateRole);
          const result = await allUsersCollection.find().toArray();
          res.send(result);
        } else if (role === "instructor") {
          const update = {
            $set: {
              role: "instructor",
            },
          };

          const updateRole = await allUsersCollection.updateOne(filter, update);
          console.log(updateRole);
          const result = await allUsersCollection.find().toArray();
          res.send(result);
        }
      }
    );

    app.patch(
      "/dashboard/admin/manage-status/:id/:status",
      verifyJWT,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const status = req.params.status;

        const filter = {
          _id: new ObjectId(id),
        };

        if (status === "approve") {
          const update = {
            $set: {
              status: "approved",
            },
          };

          const updateStatus = await allClassesCollection.updateOne(
            filter,
            update
          );
          console.log(updateStatus);
          const result = await allClassesCollection.find().toArray();
          res.send(result);
        } else if (status === "deny") {
          const update = {
            $set: {
              status: "denied",
            },
          };

          const updateStatus = await allClassesCollection.updateOne(
            filter,
            update
          );
          console.log(updateStatus);
          const result = await allClassesCollection.find().toArray();
          res.send(result);
        } else if (status === "feedback") {
          const feedbackData = req.body?.feedback;

          console.log(feedbackData);

          const update = {
            $set: {
              feedback: feedbackData,
            },
          };

          const updateStatus = await allClassesCollection.updateOne(
            filter,
            update
          );
          console.log(updateStatus);
          // const result = await allClassesCollection.find().toArray();
          res.send(updateStatus);
        }

        // res.send(result);
      }
    );

    /* PAYMENT ROUTES */
    // create payment intent
    app.post("/create-payment-intent", verifyJWT, async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    // update transaction data to slsected classes data for user
    app.patch(
      "/dashboard/user/payment/:id/:class_name/:instructor_email",
      verifyJWT,
      verifyUser,
      async (req, res) => {
        const transactionId = req.body.transactionId;
        const id = req.params.id;
        const class_name = req.params.class_name;
        const instructor_email = req.params.instructor_email;

        console.log(id, class_name, instructor_email);

        // total seats and students update

        const queryFind = {
          class_name: class_name,
          instructor_email: instructor_email,
        };
        const classStatus = await allClassesCollection.findOne(queryFind);

        classStatus.available_seats -= 1;
        classStatus.students += 1;

        // return console.log(classStatus.available_seats, classStatus.students);

        const updateAllClassData = {
          $set: {
            available_seats: classStatus.available_seats,
            students: classStatus.students,
          },
        };

        const classesCollectionFilter = {
          _id: classStatus._id,
        };

        const updateStatus = await allClassesCollection.updateOne(
          classesCollectionFilter,
          updateAllClassData
        );

        const filter = {
          _id: new ObjectId(id),
        };

        const update = {
          $set: {
            transaction_id: transactionId,
          },
        };

        const result = await userClassesCollection.updateOne(filter, update);
        res.send(result);
      }
    );

    app.get(
      "/dashboard/user/payment",
      verifyJWT,
      verifyUser,
      async (req, res) => {
        const email = req.query.email;

        console.log(email);

        if (!email) {
          return res.send([]);
        }
        if (email != req.decoded.email) {
          return res
            .status(401)
            .send({ error: true, message: "unauthorized access" });
        }

        const query = { email: email };
        const result = await userPaymentCollection
          .find(query)
          .sort({ date: -1 })
          .toArray();

        console.log(result);

        res.send(result);
      }
    );

    // save payment history-data to payment collection

    app.post(
      "/dashboard/user/payment/:id",
      verifyJWT,
      verifyUser,
      async (req, res) => {
        const body = req.body;
        console.log(body);

        const result = await userPaymentCollection.insertOne(body);
        res.send(result);
      }
    );

    /*DASHBOARD ROUTE */

    app.get(
      "/dashboard/instructor/classes",
      verifyJWT,
      verifyInstructor,
      async (req, res) => {
        const email = req.query.email;

        const query = { instructor_email: email };
        const data = await allClassesCollection
          .find(query)
          .sort({ students: -1 })
          .toArray();

        res.send(data);
      }
    );

    /*ADD CLASS (instructor) */
    app.post(
      "/dashboard/instructor/classes",
      verifyJWT,
      verifyInstructor,
      async (req, res) => {
        const data = req.body;
        const email = req.query.email;
        const className = req.body.class_name;

        const extraData = { status: "pending", students: 0 };

        data.status = "pending";
        data.students = 0;

        // return console.log(data);

        const query = {
          instructor_email: email,
          class_name: className,
        };
        const classExists = await allClassesCollection.findOne(query);

        // return console.log(classExists, className);

        if (!classExists) {
          const result = await allClassesCollection.insertOne(data);
          res.send(result);
        } else {
          res.send({ response: "class already exists." });
        }
      }
    );

    // app.get(
    //   "/dashboard/user/selected-class/:id",
    //   verifyJWT,
    //   verifyUser,
    //   async (req, res) => {
    //     const id = req.params.id;
    //     console.log(id);

    //     const query = { _id: new ObjectId(id) };
    //     const result = await userClassesCollection.findOne(query);

    //     console.log(result);

    //     res.send(result);
    //   }
    // );

    app.get(
      "/dashboard/user/selected-classes",
      verifyJWT,
      verifyUser,
      async (req, res) => {
        const email = req.query.email;

        // console.log("hitting dashboard");
        // console.log("body->", req.body);

        if (!email) {
          return res.send([]);
        }

        if (email != req.decoded.email) {
          return res
            .status(401)
            .send({ error: true, message: "unauthorized access" });
        }

        const query = { email: email };
        const result = await userClassesCollection.find(query).toArray();
        res.send(result);
      }
    );

    app.delete(
      "/dashboard/user/delete-selected/:id",
      verifyJWT,
      verifyUser,
      async (req, res) => {
        const id = req.params.id;

        const query = { _id: new ObjectId(id) };
        const result = await userClassesCollection.deleteOne(query);

        console.log(id);
        res.send(result);
      }
    );

    app.post(
      "/dashboard/user/classes-selection",
      verifyJWT,
      verifyUser,
      async (req, res) => {
        const email = req.query.email;
        const body = req.body;
        const className = req.body.class_name;
        console.log("hitting dashboard");
        // console.log("body->", req.body);

        if (!email) {
          return res.send([]);
        }

        if (email != req.decoded.email) {
          return res
            .status(401)
            .send({ error: true, message: "unauthorized access" });
        }

        const query = { email: email, class_name: className };
        const check = await userClassesCollection.findOne(query);

        console.log(check);

        if (check?._id) {
          console.log("inside if");
          return res.send({ status: "available" });
        } else {
          console.log("inside else");
          const result = await userClassesCollection.insertOne(body);
          res.send(result);
        }
      }
    );

    // app.get("/dashboard", verifyJWT, async (req, res) => {
    //   const email = req.query.email;

    //   console.log("hitting dashboard");
    //   // console.log(email, req.decoded, email);

    //   if (!email) {
    //     return res.send([]);
    //   }

    //   if (email != req.decoded.email) {
    //     return res
    //       .status(401)
    //       .send({ error: true, message: "unauthorized access" });
    //   }

    //   res.send({ data: "welcome to dashboard" });
    // });

    /*ADMIN PROMOTION ROUTE*/
    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDocument = {
        $set: {
          role: "admin",
        },
      };
      const result = await allUsersCollection.updateOne(filter, updateDocument);
      res.send(result);
    });
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Server running. Listening to port ${port}`);
});
