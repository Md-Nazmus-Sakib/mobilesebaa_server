const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const port = process.env.PORT || 5000;

// Middleware configuration
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(express.json()); // Parse incoming JSON requests

// MongoDB connection URI (with environment variables for security)
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.sq2afw1.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// MongoDB client configuration with API version settings
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Collection references
    const usersCollection = client.db("mobile-sebaa").collection("users");
    const shopsCollection = client.db("mobile-sebaa").collection("shops");

    // Users-related APIs
    const USER_PAGE_SIZE = 10; // Page size for pagination
    app.get("/users", async (req, res) => {
      const page = parseInt(req.query.page) || 1;
      const skip = (page - 1) * USER_PAGE_SIZE;

      // Fetch paginated user list and total user count simultaneously
      const [result, totalUser] = await Promise.all([
        usersCollection
          .find()
          .sort({ id: 1 })
          .skip(skip)
          .limit(USER_PAGE_SIZE)
          .toArray(),
        usersCollection.countDocuments(), // Total count of users
      ]);

      res.send({ users: result, countUser: totalUser });
    });

    // API to get user role by email
    app.get("/users/role/:email", async (req, res) => {
      const email = req.params.email;

      // Fetch user by email and return admin status
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === "Admin" };
      res.send(result);
    });

    // API to add a new user
    app.post("/users", async (req, res) => {
      const user = req.body;

      // Check if the user already exists
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exists", insertedId: null });
      }

      // Insert new user
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // Shops-related APIs
    const PAGE_SIZE = 10; // Page size for pagination

    // API to get approved shops with pagination
    app.get("/shops", async (req, res) => {
      const page = parseInt(req.query.page) || 1;
      const skip = (page - 1) * PAGE_SIZE;

      // Fetch paginated list of approved shops and total count
      const [result, totalCount] = await Promise.all([
        shopsCollection
          .find({ status: "Approve" })
          .sort({ selectedDistrict: 1 })
          .skip(skip)
          .limit(PAGE_SIZE)
          .toArray(),
        shopsCollection.countDocuments({ status: "Approve" }), // Total count of approved shops
      ]);

      res.send({ shops: result, countShop: totalCount });
    });

    // API to get shops pending approval
    app.get("/shops/request", async (req, res) => {
      const result = await shopsCollection
        .find({ status: "Pending" })
        .toArray();
      res.send(result);
    });

    // API to search shops by town name
    app.get("/shops/:townName", async (req, res) => {
      const searchTown = req.params.townName;

      // Search for approved shops with matching town names
      const result = await shopsCollection
        .find({
          status: "Approve",
          selectedTown: { $regex: new RegExp(searchTown, "i") }, // Case-insensitive search
        })
        .toArray();
      res.send(result);
    });

    // API to add a new shop
    app.post("/shops", async (req, res) => {
      const shop = req.body;

      // Check if the shop already exists
      const query = { mobile: shop.mobile };
      const existingShop = await shopsCollection.findOne(query);
      if (existingShop) {
        return res.send({ message: "shop already exists", insertedId: null });
      }

      // Insert new shop
      const result = await shopsCollection.insertOne(shop);
      res.send(result);
    });

    // API to approve a shop
    app.patch("/shop/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };

      // Update shop status to 'Approve'
      const updatedDoc = {
        $set: {
          status: "Approve",
        },
      };
      const result = await shopsCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // API to delete a shop by ID
    app.delete("/shops/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };

      // Delete shop from collection
      const result = await shopsCollection.deleteOne(query);
      res.send(result);
    });

    // Ping MongoDB to confirm a successful connection (optional)
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensure the client closes when finished or error occurs
    // await client.close();
  }
}
run().catch(console.dir);

// Root endpoint to check server status
app.get("/", (req, res) => {
  res.send("Mobilesebaa Server is Running");
});

// Start the server
app.listen(port, () => {
  console.log(`Mobilesebaa is running on port: ${port}`);
});
