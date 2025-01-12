const express = require("express")
const cors = require('cors')

const app = express()
const PORT = 3000

app.use(cors({origin: 'http://localhost:5173'}));

app.use(express.json());

const users = [
    {id: 1, username: "Fex"},
    {id: 2, username: "Andy"},
]

app.get("/users", (req, res) => {
    res.json(users)
})

app.get("/users/:id", (req, res) => {
    const user = users.find(u => u.id == req.params.id);
    if (user) {
        res.json(user)
    } else {
        res.status(404).json({message: "User not found"})
    }
})

app.post("/user", (req,res) => {
    const newUser = {
        id: users.length + 1,
        username: req.body.name
    }

    users.push(newUser)

    res.status(201).json(newUser)
})


app.listen(PORT, () => {
    console.log(`API running at http://localhost:${PORT}`);
})