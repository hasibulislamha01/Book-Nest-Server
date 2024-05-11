const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express')
require('dotenv').config();
const app = express()
const cors = require('cors')
const port = process.env.PORT || 5000


// MIDDLEwARE
app.use(cors({
    origin: [
        'http://localhost:5173',
        'http://localhost:5174',
    ],
    credential: true
}))
app.use(express.json())


// mongodb connections

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.75ieoxq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        // collections
        const bookCollection = client.db("BookNest").collection('bookCollection')
        const categoriesCollection = client.db("BookNest").collection('categories')


        // server and client collaboration starts here
        app.get('/books', async (req, res) => {
            const cursor = bookCollection.find()
            const result = await cursor.toArray()
            res.send(result)
        })

        app.get('/books/:id', async (req, res) => {
            const id = req.params.id
            console.log(id)
            const query = { _id: new ObjectId(id) }
            const cursor = bookCollection.find(query);
            const result = await cursor.toArray()
            res.send(result)
        })

        app.get('/books/categories/:category', async(req, res)=>{
            const category = req.params.category;
            console.log(req.query)
            const query = {category: category};
            const cursor = bookCollection.find(query);
            const result = await cursor.toArray()
            res.send(result)
        } )

        app.post('/books', async(req, res)=>{
            const newBook = req.body;
            console.log(newBook);
            const cursor = bookCollection.insertOne(newBook)
            res.send({success: cursor})
        })


        app.patch('/books/:id', async (req, res) => {
            const id = req.params.id;
            const newData = req.body;
            console.log(id, newData)
            const query = { _id: new ObjectId(id) }
            const updateData = {
                $set: {
                    name: newData.name,
                    author: newData.author,
                    category: newData.category,
                    rating: newData.rating,
                    image: newData.image
                }
            }
            const result = bookCollection.updateOne(query, updateData)
            res.send(result)
        })


        app.get('/categories', async(req, res)=> {
            const cursor = categoriesCollection.find()
            const result = await cursor.toArray()
            res.send(result)
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('Hello from book nest server')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})