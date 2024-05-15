const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express')
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
require('dotenv').config();
const app = express()
const cors = require('cors')
const port = process.env.PORT || 5000


// MIDDLEwARE
app.use(cors({
    origin: [
        'http://localhost:5173',
        'http://localhost:5174',
        'https://book-nest-d0b87.web.app',
        'book-nest-d0b87.firebaseapp.com'
    ],
    credentials: true
}))
app.use(express.json())
app.use(cookieParser())


const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
};
//localhost:5000 and localhost:5173 are treated as same site.  so sameSite value must be strict in development server.  in production sameSite will be none
// in development server secure will false .  in production secure will be true

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

//----------------------------
const logger = (req, res, next) => {
    console.log("Log info", req.method, req.url)
    next()
}
// verify token
const verifyToken = (req, res, next) => {
    const token = req.cookies?.token
    // console.log('token in the middleware', token)
    if (!token) {
        return res.status(401).send('unauthorized access')
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send('unauthorized access')
        }
        req.user = decoded
        next()
    })
}




async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        // collections
        const bookCollection = client.db("BookNest").collection('bookCollection')
        const categoriesCollection = client.db("BookNest").collection('categories')
        const borrowedCollection = client.db("BookNest").collection('borrowedBooks')


        // token generating here
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            console.log('user for token', user)
            const token = await jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' })
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict'
            }).send({ success: true })

        })

        app.post('/logout', async (req, res) => {
            const user = req.body;
            console.log('logging out', user)
            res.clearCookie('token', { maxAge: 0 }).send({ success: 'coockie cleared' })
        })

        // server and client collaboration starts here
        app.get('/books', async (req, res) => {

            const cursor = bookCollection.find()
            const result = await cursor.toArray()
            res.send(result)
        })

        app.get('/books/:id', async (req, res) => {
            const id = req.params.id
            // console.log(id)
            const query = { _id: new ObjectId(id) }
            const cursor = bookCollection.find(query);
            const result = await cursor.toArray()
            res.send(result)
        })

        app.get('/books/categories/:category', async (req, res) => {
            const category = req.params.category;
            // console.log(req.query)
            const query = { category: category };
            const cursor = bookCollection.find(query);
            const result = await cursor.toArray()
            res.send(result)
        })

        app.post('/books', async (req, res) => {
            const newBook = req.body;
            // console.log(newBook);
            const cursor = await bookCollection.insertOne(newBook)
            res.send({ success: cursor })
        })


        app.patch('/books/:id', async (req, res) => {
            const id = req.params.id;
            const newData = req.body;
            // console.log(id, newData)
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
            const result = await bookCollection.updateOne(query, updateData)
            res.send(result)
        })


        app.patch('/books/borrowed/:id', async (req, res) => {
            const bookId = req.params.id;
            // console.log(bookId)
            const query = { _id: new ObjectId(bookId) };
            const updateBook = {
                $inc: {
                    quantity: -1
                }
            }
            const result = await bookCollection.updateOne(query, updateBook)
            res.send({ Success: `updated ${bookId}` })
        })

        app.patch('/books/returned/:id', async (req, res) => {
            const bookId = req.params.id;
            // console.log(bookId)
            const query = { _id: new ObjectId(bookId) };
            const updateBook = {
                $inc: {
                    quantity: 1
                }
            }
            const result = await bookCollection.updateOne(query, updateBook)
            res.send({ Success: `updated ${bookId}` })
        })

        app.delete('/borrowedBooks/:email', logger, verifyToken, async (req, res) => {
            const email = req.params.email;
            console.log('token owner', req.user)
            if (req.user.email !== req.query.email) {
                res.status(403).send({ message: 'forbidden access' })
            }
            // console.log(bookId)
            const query = { borrowerEmail: email };

            const result = await borrowedCollection.deleteOne(query)
            res.send({ Success: `deleted from ${email}` })
        })


        app.get('/categories', async (req, res) => {
            const cursor = categoriesCollection.find()
            const result = await cursor.toArray()
            res.send(result)
        })

        app.post('/borrowedBooks', async (req, res) => {
            const data = req.body;
            console.log(data);
            const result = await borrowedCollection.insertOne(data)
            res.send({ success: 'book added to borrowed list' })
        })

        app.get('/borrowedBooks', async (req, res) => {
            const cursor = borrowedCollection.find()
            const result = await cursor.toArray()
            res.send(result)
        })
        app.get('/borrowedBooks/:email', async (req, res) => {
            const email = req.params.email;
            const query = { borrowerEmail: email }
            const result = await borrowedCollection.find(query).toArray()
            res.send(result)
        })

        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
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