const { MongoClient } = require('mongodb');
const config = require('config');

const url = config.get('DB.url');
const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });

async function connect() {
    try {
        await client.connect();
        console.log('Connected to MongoDB');
   
        const db = client.db(config.get('DB.database'));
      
    } catch (error) {
        console.error('Failed to connect to MongoDB', error);
        process.exit(1);
    }
}

connect();

module.exports = client;