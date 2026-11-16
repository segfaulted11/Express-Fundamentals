import express, { Application, Request, Response } from "express";

// Import Pool from the "pg" package.
// "pg" allows our Express application to communicate with PostgreSQL.
import { Pool } from "pg";
import config from "./config";

const app: Application = express();
const PORT = 3001;

// Middleware
app.use(express.json());
app.use(express.text());
app.use(express.urlencoded({ extended: true }));

// ================= DATABASE CONNECTION =================

// Create a connection pool to our PostgreSQL database.
// Pool manages multiple database connections for our application.
// Instead of creating a new database connection for every request, our application can reuse available connections from the pool.
// connectionString contains the information needed to connect to our PostgreSQL database.
// It includes:
// - Database username
// - Database password
// - Database host (where the database is located)
// - Database name
// - SSL settings (for a secure connection)
// Here, our database is hosted on Neon (cloud PostgreSQL).
const pool = new Pool({
  connectionString:
    config.connection_string,
});

// ========= INITIALIZE DATABASE =============

// Create an async function to initialize our database.
//
// This function will send an SQL command to PostgreSQL
// to create a "users" table.
const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (

        /* id: Unique ID for every user.
        SERIAL automatically generates an increasing number.
        PRIMARY KEY means every user must have a unique ID. */

        id SERIAL PRIMARY KEY,

        /* name: Stores the user's name.
         VARCHAR(255) means text with a maximum length of 255 characters.*/

        name VARCHAR(255),

        /* email: Stores the user's email.
         NOT NULL means this field cannot be empty (NULL). */

        email VARCHAR(255) UNIQUE NOT NULL,

        /* password: Stores the user's password hash.
       NOT NULL means this field must have a value. */

        password VARCHAR(255) NOT NULL,

        -- age: Stores the user's age as an integer (whole number).

        age INT,

        /* is_Active: Stores whether the user account is active.
        BOOLEAN means the value can be TRUE or FALSE.
        DEFAULT true means new users are active by default. */

        is_Active BOOLEAN DEFAULT true,

        /* created_at: Stores when the user record was created.
        NOW() automatically inserts the current date and time. */

        created_at TIMESTAMP DEFAULT NOW(),

        /* updated_at: Stores when the user record was last updated.
        Initially, it uses the current date and time.*/

        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // This message appears if the table creation query succeeds.
    console.log("Database connected and users table is ready");
  } catch (error) {
    // catch: Runs if something goes wrong during the database operation.
    // For example, a database connection error or invalid SQL command.
    console.log("Database initialization failed:", error);
  }
};

// Call the function to initialize the database.
// This tells our application to create the users table.
initDB();

// First route
app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "this is root route",
    author: "JW",
  });
});

//post
// ================= CREATE USER (POST ROUTE) =================

// POST: Used when the client wants to send information to the server.
//
// "/api/v1/users" is the API endpoint.
//
// Example:
// A user fills out a registration form and sends their information.
// Our backend receives that information and saves it into PostgreSQL.

app.post("/api/v1/users", async (req: Request, res: Response) => {
  // try: Attempt to execute the code inside this block.
  // If something goes wrong, the catch block will handle the error.

  try {
    // req.body contains the data sent by the client (e.g. Postman).
    const body = req.body;

    // Extract name, email, password and age from the request body.
    //
    // This is called object destructuring.
    // Instead of writing body.name, body.email, etc.,
    // we can access them directly using these variables.

    const { name, email, password, age } = body;

    // ================= INSERT DATA INTO DATABASE =================

    // pool.query() sends an SQL command to PostgreSQL.
    //
    // INSERT INTO means we want to add a new record (user)
    // into our existing "users" table.
    //
    // (name, email, password, age) specifies which columns
    // we want to insert data into.
    //
    // VALUES($1, $2, $3, $4) represents the values we want to insert.
    //
    // $1 = name
    // $2 = email
    // $3 = password
    // $4 = age
    //
    // These values are passed separately in the array below.
    // This is called a parameterized query.
    // It helps protect our database against SQL injection attacks.
    //
    // RETURNING * tells PostgreSQL to return the newly inserted record.
    //
    // await means we wait until PostgreSQL finishes the query
    // before moving to the next line.

    const result = await pool.query(
      `
      INSERT INTO users (name, email, password, age)
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [name, email, password, age],
    );

    // ================= SEND RESPONSE =================

    // result contains information returned by PostgreSQL.
    //
    // result.rows contains the records returned by the SQL query.
    //
    // result.rows[0] gets the first returned record.
    // Since we inserted one user, we get that newly created user.

    // Send a successful response back to the client.
    res.status(201).json({
      success: true,
      message: "USER CREATED!!",
      data: result.rows[0],
    });
  } catch (error: any) {
    // If something goes wrong during the POST request,
    // the catch block catches the error.
    //
    // Examples:
    // - Email already exists (because email is UNIQUE).
    // - Database connection fails.
    // - SQL query contains an error.

    // Send an error response back to the client.
    res.status(500).json({
      success: false,
      message: error.message,
      data: error,
    });
  }
});

// ================= GET ALL USERS =================

// GET: Retrieve all users stored in our PostgreSQL database.
//
// "/api/v1/users" is the API endpoint.
//
// Example:
// When a client sends a GET request to:
// http://localhost:3001/api/v1/users
//
// Our server will retrieve ALL users from the users table
// and send them back to the client.

app.get("/api/v1/users", async (req: Request, res: Response) => {
  try {
    // pool.query() sends an SQL command to PostgreSQL.
    //
    // SELECT * means we want to retrieve ALL columns.
    // FROM users means we want to retrieve data from the "users" table.
    //
    // This query retrieves all the records (users) from our database.

    const result = await pool.query(`
      SELECT * FROM users
    `);

    // result.rows contains all the user records returned by PostgreSQL.
    // We send those records back to the client using JSON.

    res.status(200).json({
      success: true,
      message: "Users retrieved successfully!!",
      data: result.rows,
    });
  } catch (error: any) {
    // If something goes wrong during the database query,
    // catch the error and send an error response to the client.

    res.status(500).json({
      success: false,
      message: error.message,
      data: error,
    });
  }
});

// ================= GET ONE USER BY ID =================

// GET: Retrieve ONE specific user from our database using their ID.
// ":id" is a route parameter.
// It allows the client to provide a user ID in the URL.
// Example:
// http://localhost:3001/api/v1/users/1
// Here, 1 is the ID of the user we want to retrieve.

app.get("/api/v1/users/:id", async (req: Request, res: Response) => {
  try {
    // req.params contains the route parameters from the URL.
    // We extract "id" from req.params using destructuring.
    // For example, if the URL is /api/v1/users/5,
    // then id will contain "5".

    const { id } = req.params;

    // Ask PostgreSQL to find a user whose ID matches the provided ID.
    // SELECT * = Retrieve all columns.
    // FROM users = Search inside the users table.
    // WHERE id = $1 = Only retrieve the user whose ID matches $1.
    // [id] provides the actual ID value for the $1 placeholder.
    // This is a parameterized query, which helps protect
    // our database against SQL injection attacks.

    const result = await pool.query(
      `
      SELECT * FROM users WHERE id = $1
      `,
      [id],
    );
    if (result.rowCount === 0){
      res.status(404).json({
        success: false,
        message: "User not found!!",
      });
    }
    // result.rows[0] gets the FIRST matching user record.
    // Since we're searching by a unique ID, we expect to get only one user. And send that user back to the client.

    res.status(200).json({
      success: true,
      message: "User retrieved successfully!!",
      data: result.rows[0],
    });
  } catch (error: any) {
    // If something goes wrong, send an error response.

    res.status(500).json({
      success: false,
      message: error.message,
      data: error,
    });
  }
});

//Update User with the PUT method :

// ================= UPDATE USER (PUT METHOD) =================

// PUT: Used to update an existing user's information.
//
// ":id" is a route parameter.
// It tells us WHICH user we want to update.
//
// Example:
// PUT http://localhost:3001/api/v1/users/1
//
// This means we want to update the user whose ID is 1.
//
// We can update the user's name, password, age, or active status.

app.put("/api/v1/users/:id", async (req: Request, res: Response) => {
  try {
    // Get the user's ID from the URL.
    //
    // Example:
    // If the URL is /api/v1/users/5,
    // then id will be "5".

    const { id } = req.params;

    // Get the updated information sent by the client (e.g. Postman).
    //
    // We extract the fields we want to update from req.body.
    //
    // Some fields can be left out if we don't want to update them.

    const { name, password, age, is_Active } = req.body;

    // ================= UPDATE DATABASE =================

    // pool.query() sends an SQL command to PostgreSQL.
    //
    // UPDATE users means we want to modify an existing record
    // inside the "users" table.
    //
    // SET specifies which columns we want to update.
    //
    // COALESCE($1, name) means:
    // If $1 has a value, use that new value.
    // Otherwise, keep the existing value of name.
    //
    // $1 = name
    // $2 = password
    // $3 = age
    // $4 = is_Active
    // $5 = id
    //
    // updated_at = NOW() updates the timestamp to the current date and time.
    //
    // WHERE id = $5 ensures we update ONLY the user
    // whose ID matches the provided ID.
    //
    // RETURNING * returns the updated user record.

    const result = await pool.query(
      `
      UPDATE users
      SET
        name = COALESCE($1, name),
        password = COALESCE($2, password),
        age = COALESCE($3, age),
        is_Active = COALESCE($4, is_Active),
        updated_at = NOW()
      WHERE id = $5
      RETURNING *
      `,
      [name ?? null, password ?? null, age ?? null, is_Active ?? null, id],
    );
    if (result.rowCount === 0){
      res.status(404).json({
        success: false,
        message: "User not found!!",
      });
    }
    // ================= SEND RESPONSE =================

    // result.rows[0] contains the updated user record.
    //
    // Send the updated information back to the client.

    res.status(200).json({
      success: true,
      message: "User UPDATED successfully!!",
      data: result.rows[0],
    });
  } catch (error: any) {
    // If something goes wrong during the update,
    // catch the error and send an error response.

    res.status(500).json({
      success: false,
      message: error.message,
      data: error,
    });
  }
});
//delete user from the database using the DELETE mathod :


// Delete a user from the database using the DELETE method

app.delete("/api/v1/users/:id", async (req: Request, res: Response) => {
  try {
    // Step 1: Get the user ID from the URL
    const id = req.params.id;


  // Step 2: Delete the user from the database

  // pool.query() is used to send an SQL query to our PostgreSQL database.
  // We use await because deleting data takes some time.
  // await waits until PostgreSQL finishes executing the query.

  const result = await pool.query(

    // This is our SQL DELETE query.
    // DELETE FROM users means we want to delete data
    // from the users table.
    //
    // WHERE id = $1 means we want to delete only the user
    // whose ID matches the value we provide.
    //
    // $1 is a placeholder. It will be replaced with
    // the actual ID provided in the second argument.

    "DELETE FROM users WHERE id = $1",

    // This is the second argument of pool.query().
    // We pass the id variable inside an array.
    //
    // PostgreSQL replaces $1 with the value of id.
    // For example, if id = 5, the query becomes:
    //
    // DELETE FROM users WHERE id = 5;
    //
    // This helps us safely pass values into SQL queries
    // and protects against SQL injection.

    [id]
  );

  // The result variable stores information about the query.
  // We can use result.rowCount to check how many rows
  // were affected by the DELETE query.


    // Step 3: Check if the user exists
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found!",
      });
    }

    // Step 4: Send a success response
    return res.status(200).json({
      success: true,
      message: "User deleted successfully!",
    });

  } catch (error: any) {

    // Step 5: Handle errors
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
